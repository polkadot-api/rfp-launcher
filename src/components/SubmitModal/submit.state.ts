import { typedApi } from "@/chain";
import { TOKEN_DECIMALS } from "@/constants";
import { MultiAddress } from "@polkadot-api/descriptors";
import {
  createBountiesSdk,
  createReferendaSdk,
} from "@polkadot-api/sdk-governance";
import {
  AccountId,
  getMultisigAccountId,
  sortMultisigSignatories,
} from "@polkadot-api/substrate-bindings";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { Binary, CompatibilityLevel, Transaction } from "polkadot-api";
import {
  catchError,
  combineLatest,
  concat,
  endWith,
  exhaustMap,
  filter,
  from,
  map,
  merge,
  NEVER,
  Observable,
  of,
  switchMap,
  take,
  takeUntil,
  withLatestFrom,
} from "rxjs";
import { FormSchema } from "../RfpForm/formSchema";
import {
  calculatePriceTotals,
  conversionRate$,
} from "../RfpForm/ReviewSection";
import { referendumExecutionBlocks$ } from "../RfpForm/TimelineSection";
import { selectedAccount$ } from "../SelectAccount";
import { generateMarkdown } from "../RfpForm/markdown";
import { identity$ } from "../RfpForm/SupervisorsSection";
import { novasamaProvider } from "@polkadot-api/sdk-accounts";

export const [formDataChange$, submit] = createSignal<FormSchema>();
export const [dismiss$, dismiss] = createSignal<void>();
export const submittedFormData$ = state(
  merge(formDataChange$, dismiss$.pipe(map(() => null))),
  null
);

const totalAmount$ = (formData: FormSchema) =>
  conversionRate$.pipe(
    map(
      (conversionRate) =>
        calculatePriceTotals(formData, conversionRate).totalAmountWithBuffer
    ),
    filter((v) => v != null),
    map((v) => {
      // The amount is an approximation (with the +25% buffer), no need to have accurate math
      return BigInt(Math.round(v * Math.pow(10, TOKEN_DECIMALS)));
    })
  );

const multisigCreationHash = Binary.fromHex("".padEnd(32 * 2, "00"));
const getCreationMultisigCallMetadata = (
  formData: FormSchema,
  selectedAccount: string
) => {
  const codec = AccountId();
  const sortedSignatories = sortMultisigSignatories(
    formData.supervisors.map(codec.enc)
  );
  const toHex = (v: Uint8Array) => Binary.fromBytes(v).asHex();
  const selectedPk = toHex(codec.enc(selectedAccount));
  const otherSignatories = sortedSignatories.filter(
    (v) => toHex(v) !== selectedPk
  );
  if (otherSignatories.length === sortedSignatories.length) return null;

  return {
    call_hash: multisigCreationHash,
    threshold: formData.signatoriesThreshold,
    other_signatories: otherSignatories.map(codec.dec),
  };
};

const bountyCreationTx$ = state(
  submittedFormData$.pipe(
    switchMap((formData) => {
      if (!formData) return [null];

      console.log(getMultisigAddress(formData));
      const needsMultisigCreation$ =
        formData.supervisors.length > 1
          ? from(novasamaProvider("kusama")(getMultisigAddress(formData))).pipe(
              map((v) => !v)
            )
          : of(false);

      const signerFunds$ = selectedAccount$.pipe(
        filter((v) => !!v),
        take(1),
        switchMap((account) =>
          typedApi.query.System.Account.getValue(account.address)
        ),
        map((v) => v.data.free)
      );

      const shouldCreateMultisig$ = combineLatest([
        needsMultisigCreation$,
        signerFunds$,
        typedApi.constants.Multisig.DepositBase(),
        typedApi.constants.Multisig.DepositFactor(),
      ]).pipe(
        map(([needsMultisig, signerFunds, depositBase, depositFactor]) => {
          if (!needsMultisig) return false;
          const multisigDepositCost =
            depositBase + BigInt(formData.supervisors.length) * depositFactor;
          return multisigDepositCost < signerFunds;
        })
      );

      const multisigMetadata$ = combineLatest([
        shouldCreateMultisig$,
        selectedAccount$.pipe(filter((v) => !!v)),
      ]).pipe(
        map(([shouldCreateMultisig, selectedAccount]) => {
          if (!shouldCreateMultisig) return null;
          return getCreationMultisigCallMetadata(
            formData,
            selectedAccount.address
          );
        })
      );

      return combineLatest([totalAmount$(formData), multisigMetadata$]).pipe(
        map(([value, multisigMeta]) => {
          const proposeBounty = typedApi.tx.Bounties.propose_bounty({
            value,
            description: Binary.fromText(formData.projectTitle),
          });

          if (!multisigMeta) return proposeBounty;

          return typedApi.tx.Utility.batch({
            calls: [
              proposeBounty.decodedCall,
              typedApi.tx.Multisig.approve_as_multi({
                ...multisigMeta,
                max_weight: { proof_size: 0n, ref_time: 0n },
                maybe_timepoint: undefined,
              }).decodedCall,
            ],
          });
        })
      );
    })
  )
);

export const bountyMarkdown$ = state(
  combineLatest([
    submittedFormData$.pipe(filter((v) => !!v)),
    conversionRate$,
  ]).pipe(
    switchMap(([formFields, conversionRate]) => {
      const { totalAmountWithBuffer } = calculatePriceTotals(
        formFields,
        conversionRate
      );

      const identities$ = combineLatest(
        Object.fromEntries(
          formFields.supervisors.map((addr) => [
            addr,
            identity$(addr).pipe(map((id) => id?.value)),
          ])
        )
      );

      return identities$.pipe(
        map((identities) =>
          generateMarkdown(formFields, totalAmountWithBuffer, identities)
        )
      );
    })
  ),
  null
);

/**
 * Operator that prevents completion of the stream until it has been dismissed.
 * It will end with a "null" emission (to help reset state).
 */
const dismissable =
  <T>() =>
  (source$: Observable<T>) =>
    concat(source$, NEVER).pipe(takeUntil(dismiss$), endWith(null));

const createTxProcess = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx$: Observable<Transaction<any, any, any, any> | null>
) => {
  const [submitTx$, submitTx] = createSignal();
  const txProcess$ = state(
    submitTx$.pipe(
      withLatestFrom(selectedAccount$, tx$),
      exhaustMap(([, selectedAccount, tx]) => {
        if (!selectedAccount || !tx) return [null];
        return tx.signSubmitAndWatch(selectedAccount.polkadotSigner).pipe(
          catchError((err) =>
            of({
              type: "error" as const,
              err,
            })
          )
        );
      }),
      dismissable()
    ),
    null
  );

  return [txProcess$, submitTx] as const;
};

export const [bountyCreationProcess$, submitBountyCreation] =
  createTxProcess(bountyCreationTx$);

const referendaSdk = createReferendaSdk(typedApi);
const bountiesSdk = createBountiesSdk(typedApi);

const accountCodec = AccountId();

const rfpBounty$ = merge(
  bountyCreationProcess$.pipe(
    filter((v) => v?.type === "finalized" && v.ok),
    switchMap(async (v) => {
      const bounty = await bountiesSdk.getProposedBounty(v);
      if (!bounty) {
        // TODO check error boundaries
        throw new Error("Bounty could not be found");
      }

      const [multisig] = typedApi.event.Multisig.NewMultisig.filter(v.events);

      return {
        bounty,
        multisigTimepoint: multisig
          ? {
              height: v.block.number,
              index: v.block.index,
            }
          : null,
      };
    })
  ),
  // try and load existing one if it's there
  submittedFormData$.pipe(
    filter((v) => !!v),
    switchMap(async (formData) => {
      const multisigAddr =
        formData.supervisors.length > 1 ? getMultisigAddress(formData) : null;

      const [bounties, multisig] = await Promise.all([
        bountiesSdk.getBounties(),
        multisigAddr
          ? typedApi.query.Multisig.Multisigs.getValue(
              multisigAddr,
              multisigCreationHash
            )
          : Promise.resolve(null),
      ]);
      const bounty = bounties.find(
        (bounty) =>
          bounty.status.type === "Proposed" &&
          bounty.description === formData.projectTitle
      );

      return { bounty: bounty!, multisigTimepoint: multisig?.when ?? null };
    }),
    filter((v) => !!v.bounty)
  )
);

const getMultisigAddress = (formData: FormSchema) =>
  accountCodec.dec(
    getMultisigAccountId({
      threshold: Math.min(
        formData.signatoriesThreshold,
        formData.supervisors.length
      ),
      signatories: formData.supervisors.map(accountCodec.enc),
    })
  );

const referendumCreationTx$ = state(
  rfpBounty$.pipe(
    withLatestFrom(
      submittedFormData$.pipe(filter((v) => !!v)),
      referendumExecutionBlocks$.pipe(filter((v) => !!v))
    ),
    switchMap(
      ([{ bounty, multisigTimepoint }, formData, { bountyFunding }]) => {
        const curatorAddr =
          formData.supervisors.length === 1
            ? formData.supervisors[0]
            : getMultisigAddress(formData);

        const amount$ = from(
          Promise.all([
            typedApi.query.System.Account.getValue(curatorAddr),
            typedApi.constants.Balances.ExistentialDeposit(),
            typedApi.constants.Bounties.CuratorDepositMin(),
          ])
        ).pipe(
          map(
            ([account, existentialDeposit, minCuratorDeposit = 0n]) =>
              existentialDeposit + minCuratorDeposit - account.data.free
          )
        );

        const getReferendumProposal = async () => {
          if (
            await typedApi.tx.Bounties.approve_bounty_with_curator.isCompatible(
              CompatibilityLevel.Partial
            )
          ) {
            return typedApi.tx.Bounties.approve_bounty_with_curator({
              bounty_id: bounty.id,
              curator: MultiAddress.Id(curatorAddr),
              fee: 0n,
            });
          }

          return typedApi.tx.Utility.batch({
            calls: [
              typedApi.tx.Bounties.approve_bounty({ bounty_id: bounty.id })
                .decodedCall,
              typedApi.tx.Scheduler.schedule({
                when: bountyFunding,
                priority: 255,
                call: typedApi.tx.Bounties.propose_curator({
                  bounty_id: bounty.id,
                  curator: MultiAddress.Id(curatorAddr),
                  fee: 0n,
                }).decodedCall,
                maybe_periodic: undefined,
              }).decodedCall,
            ],
          });
        };

        const proposalCallData = getReferendumProposal().then((r) =>
          r.getEncodedData()
        );

        return combineLatest([
          proposalCallData,
          amount$,
          selectedAccount$.pipe(filter((v) => !!v)),
        ]).pipe(
          map(([proposal, amount, selectedAccount]) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const calls: Transaction<any, any, any, any>[] = [];

            if (amount > 0) {
              calls.push(
                typedApi.tx.Balances.transfer_keep_alive({
                  dest: MultiAddress.Id(curatorAddr),
                  value: amount,
                })
              );
            }

            calls.push(
              referendaSdk.createReferenda(
                {
                  type: "Origins",
                  value: {
                    type: "Treasurer",
                    value: undefined,
                  },
                },
                proposal
              )
            );

            if (multisigTimepoint) {
              const metadata = getCreationMultisigCallMetadata(
                formData,
                selectedAccount.address
              );
              if (metadata) {
                calls.push(
                  typedApi.tx.Multisig.cancel_as_multi({
                    ...metadata,
                    timepoint: multisigTimepoint,
                  })
                );
              }
            }

            if (calls.length > 1) {
              return typedApi.tx.Utility.batch_all({
                calls: calls.map((c) => c.decodedCall),
              });
            }
            return calls[0];
          }),
          dismissable()
        );
      }
    )
  ),
  null
);

export const [referendumCreationProcess$, submitReferendumCreation] =
  createTxProcess(referendumCreationTx$);

export const activeTxStep$ = state(
  combineLatest([
    bountyCreationTx$,
    bountyCreationProcess$,
    referendumCreationTx$,
    referendumCreationProcess$,
  ]).pipe(
    map(([bountyTx, bountyProcess, referendumTx, referendumProcess]) => {
      if (referendumProcess) {
        if (referendumProcess.type === "finalized" && referendumProcess.ok) {
          const referendum =
            referendaSdk.getSubmittedReferendum(referendumProcess);
          return {
            type: "refDone" as const,
            value: {
              txEvent: referendumProcess,
              referendum,
            },
          };
        }
        if (
          referendumProcess.type !== "error" ||
          referendumProcess.err.message !== "Cancelled"
        ) {
          return {
            type: "refSubmitting" as const,
            value: {
              txEvent: referendumProcess,
            },
          };
        }
      }
      if (referendumTx) {
        return {
          type: "refTx" as const,
          value: {
            tx: referendumTx,
          },
        };
      }

      if (bountyProcess) {
        if (
          bountyProcess.type !== "error" ||
          bountyProcess.err.message !== "Cancelled"
        ) {
          return {
            type: "bountySubmitting" as const,
            value: {
              txEvent: bountyProcess,
            },
          };
        }
      }

      return bountyTx
        ? {
            type: "bountyTx" as const,
            value: {
              tx: bountyTx,
            },
          }
        : null;
    })
  ),
  null
);

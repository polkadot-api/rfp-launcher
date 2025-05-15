import { typedApi } from "@/chain";
import { TOKEN_DECIMALS } from "@/constants";
import { formatToken } from "@/lib/formatToken";
import { MultiAddress } from "@polkadot-api/descriptors";
import { novasamaProvider } from "@polkadot-api/sdk-accounts";
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
import { generateMarkdown } from "../RfpForm/markdown";
import {
  calculatePriceTotals,
  conversionRate$,
} from "../RfpForm/ReviewSection";
import { identity$ } from "../RfpForm/SupervisorsSection";
import { referendumExecutionBlocks$ } from "../RfpForm/TimelineSection";
import { selectedAccount$ } from "../SelectAccount";

export const [formDataChange$, submit] = createSignal<FormSchema>();
export const [dismiss$, dismiss] = createSignal<void>();
export const submittedFormData$ = state(
  merge(formDataChange$, dismiss$.pipe(map(() => null))),
  null
);

export type TxExplanation = {
  text: string;
  params?: Record<string | number, string | TxExplanation>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTx = Transaction<any, any, any, any>;
type TxWithExplanation = {
  tx: AnyTx;
  explanation: TxExplanation;
};

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
  const multisigAddr = getMultisigAddress(formData);
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
    multisigAddr,
    call_hash: multisigCreationHash,
    threshold: formData.signatoriesThreshold,
    other_signatories: otherSignatories.map(codec.dec),
  };
};

const bountyCreationTx$ = state(
  submittedFormData$.pipe(
    switchMap((formData) => {
      if (!formData) return [null];

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
        map(([value, multisigMeta]): TxWithExplanation => {
          const proposeBounty = typedApi.tx.Bounties.propose_bounty({
            value,
            description: Binary.fromText(formData.projectTitle),
          });

          const proposeBountyExplanation: TxExplanation = {
            text: "Propose bounty",
            params: {
              title: formData.projectTitle,
              value: formatToken(value),
            },
          };

          if (!multisigMeta)
            return {
              tx: proposeBounty,
              explanation: proposeBountyExplanation,
            };

          const tx = typedApi.tx.Utility.batch({
            calls: [
              proposeBounty.decodedCall,
              typedApi.tx.Multisig.approve_as_multi({
                ...multisigMeta,
                max_weight: { proof_size: 0n, ref_time: 0n },
                maybe_timepoint: undefined,
              }).decodedCall,
            ],
          });

          return {
            tx,
            explanation: {
              text: "batch",
              params: {
                0: proposeBountyExplanation,
                1: {
                  text: "Multisig call to have the curator indexed",
                  params: {
                    address: multisigMeta.multisigAddr,
                  },
                },
              },
            },
          };
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

const createTxProcess = (tx$: Observable<AnyTx | null>) => {
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

export const [bountyCreationProcess$, submitBountyCreation] = createTxProcess(
  bountyCreationTx$.pipe(map((v) => v?.tx ?? null))
);

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

        const getReferendumProposal = async (): Promise<TxWithExplanation> => {
          if (
            await typedApi.tx.Bounties.approve_bounty_with_curator.isCompatible(
              CompatibilityLevel.Partial
            )
          ) {
            return {
              tx: typedApi.tx.Bounties.approve_bounty_with_curator({
                bounty_id: bounty.id,
                curator: MultiAddress.Id(curatorAddr),
                fee: 0n,
              }),
              explanation: {
                text: "Approve with curator",
                params: {
                  curator: curatorAddr,
                },
              },
            };
          }

          const tx = typedApi.tx.Utility.batch({
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
          return {
            tx,
            explanation: {
              text: "batch",
              params: {
                0: {
                  text: "Approve bounty",
                },
                1: {
                  text: "Schedule",
                  params: {
                    when: "After bounty funding",
                    call: {
                      text: "Propose curator",
                      params: {
                        curator: curatorAddr,
                      },
                    },
                  },
                },
              },
            },
          };
        };

        const proposal = getReferendumProposal();
        const proposalCallData = proposal.then((r) => r.tx.getEncodedData());
        const proposalTxExplanation = proposal.then((r) => r.explanation);

        return combineLatest([
          proposalCallData,
          proposalTxExplanation,
          amount$,
          selectedAccount$.pipe(filter((v) => !!v)),
        ]).pipe(
          map(([proposal, proposalExplanation, amount, selectedAccount]) => {
            const calls: TxWithExplanation[] = [];

            if (amount > 0) {
              calls.push({
                tx: typedApi.tx.Balances.transfer_keep_alive({
                  dest: MultiAddress.Id(curatorAddr),
                  value: amount,
                }),
                explanation: {
                  text: "Transfer balance to curator",
                  params: {
                    destination: curatorAddr,
                    value: formatToken(amount),
                  },
                },
              });
            }

            calls.push({
              tx: referendaSdk.createReferenda(
                {
                  type: "Origins",
                  value: {
                    type: "Treasurer",
                    value: undefined,
                  },
                },
                proposal
              ),
              explanation: {
                text: "Create referendum",
                params: {
                  track: "Treasurer",
                  call: proposalExplanation,
                },
              },
            });

            if (multisigTimepoint) {
              const metadata = getCreationMultisigCallMetadata(
                formData,
                selectedAccount.address
              );
              if (metadata) {
                calls.push({
                  tx: typedApi.tx.Multisig.cancel_as_multi({
                    ...metadata,
                    timepoint: multisigTimepoint,
                  }),
                  explanation: {
                    text: "Unlock deposit from indexing curator multisig",
                  },
                });
              }
            }

            if (calls.length > 1) {
              return {
                tx: typedApi.tx.Utility.batch_all({
                  calls: calls.map((c) => c.tx.decodedCall),
                }),
                explanation: {
                  text: "batch",
                  params: Object.fromEntries(
                    calls.map((v, i) => [i, v.explanation])
                  ),
                },
              };
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
  createTxProcess(referendumCreationTx$.pipe(map((v) => v?.tx ?? null)));

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
            ...referendumTx,
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
              ...bountyTx,
            },
          }
        : null;
    })
  ),
  null
);

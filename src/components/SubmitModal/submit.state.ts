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
const bountyCreationTx$ = state(
  submittedFormData$.pipe(
    switchMap((formData) => {
      if (!formData) return [null];

      return totalAmount$(formData).pipe(
        map((value) =>
          typedApi.tx.Bounties.propose_bounty({
            value,
            description: Binary.fromText(formData.projectTitle),
          })
        )
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
    switchMap((v) => bountiesSdk.getProposedBounty(v)),
    map((bounty) => {
      if (!bounty) {
        // TODO check error boundaries
        throw new Error("Bounty could not be found");
      }
      return bounty;
    })
  ),
  // try and load existing one if it's there
  submittedFormData$.pipe(
    filter((v) => !!v),
    switchMap(async (v) => [v, await bountiesSdk.getBounties()] as const),
    map(([formData, bounties]) =>
      bounties.find(
        (bounty) =>
          bounty.status.type === "Proposed" &&
          bounty.description === formData.projectTitle
      )
    ),
    filter((v) => !!v)
  )
);

const referendumCreationTx$ = state(
  rfpBounty$.pipe(
    withLatestFrom(
      submittedFormData$.pipe(filter((v) => !!v)),
      referendumExecutionBlocks$.pipe(filter((v) => !!v))
    ),
    switchMap(([bounty, formData, { bountyFunding }]) => {
      const curatorAddr =
        formData.supervisors.length === 1
          ? formData.supervisors[0]
          : accountCodec.dec(
              getMultisigAccountId({
                threshold: Math.min(
                  formData.signatoriesThreshold,
                  formData.supervisors.length
                ),
                signatories: formData.supervisors.map(accountCodec.enc),
              })
            );

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

      return combineLatest([proposalCallData, amount$]).pipe(
        map(([proposal, amount]) => {
          const refTx = referendaSdk.createReferenda(
            {
              type: "Origins",
              value: {
                type: "Treasurer",
                value: undefined,
              },
            },
            proposal
          );

          return amount > 0
            ? typedApi.tx.Utility.batch_all({
                calls: [
                  typedApi.tx.Balances.transfer_keep_alive({
                    dest: MultiAddress.Id(curatorAddr),
                    value: amount,
                  }).decodedCall,
                  refTx.decodedCall,
                ],
              })
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (refTx as unknown as Transaction<any, any, any, any>);
        }),
        dismissable()
      );
    })
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

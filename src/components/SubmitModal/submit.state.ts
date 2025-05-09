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
import { Binary, Transaction } from "polkadot-api";
import {
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
      // It's approximate after all, but probably for correctness TODO refactor to use bigints (planks) on every amount
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
  const [submitTx$, submitTx] = createSignal<void>();
  const txProcess$ = state(
    submitTx$.pipe(
      withLatestFrom(selectedAccount$, tx$),
      exhaustMap(([, selectedAccount, tx]) => {
        if (!selectedAccount || !tx) return [null];
        return tx.signSubmitAndWatch(selectedAccount.polkadotSigner);
      }),
      dismissable()
    ),
    null
  );

  return [txProcess$, submitTx] as const;
};

export const [bountyCreationProcess$, submitBountyCreation] =
  createTxProcess(bountyCreationTx$);

// TODO
const referendaSdk = createReferendaSdk(typedApi as any);
const bountiesSdk = createBountiesSdk(typedApi as any);

const accountCodec = AccountId();
const referendumCreationTx$ = state(
  bountyCreationProcess$.pipe(
    filter((v) => v?.type === "finalized" && v.ok),
    withLatestFrom(
      submittedFormData$.pipe(filter((v) => !!v)),
      referendumExecutionBlocks$.pipe(filter((v) => !!v))
    ),
    switchMap(([finalizedEvt, formData, { bountyFunding }]) => {
      // This is for the second step
      const multisigAddr = getMultisigAccountId({
        threshold: 2,
        signatories: formData.supervisors.map(accountCodec.enc),
      });
      // TODO check multisig balance, transfer only what's required as a curator
      // With existential deposit?
      const amount = 1n << BigInt(TOKEN_DECIMALS);

      const bounty$ = from(bountiesSdk.getProposedBounty(finalizedEvt)).pipe(
        map((bounty) => {
          if (!bounty) {
            // TODO check error boundaries
            throw new Error("Bounty could not be found");
          }
          return bounty;
        })
      );

      const proposal$ = bounty$.pipe(
        map((bounty) =>
          typedApi.tx.Utility.batch({
            calls: [
              bounty.approve().decodedCall,
              typedApi.tx.Scheduler.schedule({
                // As we're using the scheduler, we might run before it's funded... better schedule for the next block.
                // TODO check if this is true
                when: bountyFunding + 1,
                // Maybe it can be done with priority? But then it's also weak since it's hard-coded?
                priority: 255,
                call: typedApi.tx.Bounties.propose_curator({
                  bounty_id: bounty.id,
                  curator: MultiAddress.Id(accountCodec.dec(multisigAddr)),
                  fee: 0n,
                }).decodedCall,
                maybe_periodic: undefined,
              }).decodedCall,
            ],
          })
        )
      );

      return proposal$.pipe(
        switchMap((v) => v.getEncodedData()),
        map((proposal) =>
          typedApi.tx.Utility.batch({
            calls: [
              typedApi.tx.Balances.transfer_keep_alive({
                dest: MultiAddress.Id(accountCodec.dec(multisigAddr)),
                value: amount,
              }).decodedCall,
              referendaSdk.createReferenda(
                {
                  type: "Origins",
                  value: {
                    type: "Treasurer",
                    value: undefined,
                  },
                },
                proposal
              ).decodedCall,
            ],
          })
        ),
        dismissable()
      );
    })
  ),
  null
);

export const [referendumCreationProcess$, submitReferendumCreation] =
  createTxProcess(bountyCreationTx$);

export const activeTxStep$ = state(
  combineLatest([
    bountyCreationTx$,
    bountyCreationProcess$,
    referendumCreationTx$,
    referendumCreationProcess$,
  ]).pipe(
    map(([bountyTx, bountyProcess, referendumTx, referendumProcess]) => {
      if (referendumProcess) {
        if (referendumProcess.type === "finalized") {
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
        return {
          type: "refSubmitting" as const,
          value: {
            txEvent: referendumProcess,
          },
        };
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
        if (bountyProcess.type === "finalized") {
          return {
            type: "bountyDone" as const,
            value: {
              txEvent: bountyProcess,
            },
          };
        }
        return {
          type: "bountySubmitting" as const,
          value: {
            txEvent: bountyProcess,
          },
        };
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

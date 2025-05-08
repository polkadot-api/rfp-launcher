import { typedApi } from "@/chain";
import { TOKEN_DECIMALS } from "@/constants";
import { MultiAddress } from "@polkadot-api/descriptors";
import {
  AccountId,
  getMultisigAccountId,
} from "@polkadot-api/substrate-bindings";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { Binary } from "polkadot-api";
import {
  concat,
  exhaustMap,
  filter,
  from,
  map,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs";
import { FormSchema } from "../RfpForm/formSchema";
import {
  calculatePriceTotals,
  conversionRate$,
} from "../RfpForm/ReviewSection";
import { selectedAccount$ } from "../SelectAccount";

export const [formDataChange$, submit] = createSignal<FormSchema>();
export const [dismiss$, dismiss] = createSignal<void>();
export const submittedFormData$ = state(formDataChange$, null);

const totalAmount$ = (formData: FormSchema) =>
  conversionRate$.pipe(
    map(
      (conversionRate) =>
        calculatePriceTotals(formData, conversionRate).totalAmountWithBuffer
    ),
    filter((v) => v != null),
    map((v) => {
      // It's approximate after all, but probably for correctness TODO refactor to use bigints (planks) on every amount
      return BigInt(v * Math.pow(10, TOKEN_DECIMALS));
    })
  );
export const bountyCreationTx$ = state(
  submittedFormData$.pipe(
    switchMap((formData) => {
      if (!formData) return [null];

      const tx$ = totalAmount$(formData).pipe(
        map((value) =>
          typedApi.tx.Bounties.propose_bounty({
            value,
            description: Binary.fromText(formData.projectTitle),
          })
        )
      );

      return concat(tx$.pipe(takeUntil(dismiss$)), [null]);
    })
  )
);

export const [submitBountyCreation$, submitBountyCreation] =
  createSignal<void>();
export const bountyCreationProcess$ = state(
  submitBountyCreation$.pipe(
    withLatestFrom(selectedAccount$, bountyCreationTx$),
    exhaustMap(([, selectedAccount, tx]) => {
      if (!selectedAccount || !tx) return [null];
      return tx.signSubmitAndWatch(selectedAccount.polkadotSigner);
    })
  ),
  null
);

import {
  createBountiesSdk,
  createReferendaSdk,
} from "@polkadot-api/sdk-governance";
import { referendumExecutionBlocks$ } from "../RfpForm/TimelineSection";
// TODO
const referendaSdk = createReferendaSdk(typedApi as any);
const bountiesSdk = createBountiesSdk(typedApi as any);

export const referendumCreationTx$ = state(
  bountyCreationProcess$.pipe(
    filter((v) => v?.type === "finalized"),
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

      const tx$ = proposal$.pipe(
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
        )
      );

      return concat(tx$.pipe(takeUntil(dismiss$)), [null]);
    })
  ),
  null
);
export const [submitReferendumCreation$, submitReferendumCreation] =
  createSignal<void>();
export const referendumCreationProcess$ = state(
  submitReferendumCreation$.pipe(
    withLatestFrom(selectedAccount$, referendumCreationTx$),
    exhaustMap(([, selectedAccount, tx]) => {
      if (!selectedAccount || !tx) return [null];
      return tx.signSubmitAndWatch(selectedAccount.polkadotSigner);
    })
    // TODO maybe takeuntil?
  ),
  null
);

const accountCodec = AccountId();

import { referendaSdk, typedApi } from "@/chain";
import { createSpendCall } from "@/components/SubmitModal/tx/treasurySpend";
import { REMARK_TEXT, TOKEN_DECIMALS } from "@/constants";
import { sum } from "@/lib/math";
import { MultiAddress } from "@polkadot-api/descriptors";
import { state } from "@react-rxjs/core";
import { Binary } from "polkadot-api";
import { combineLatest, from, map, switchMap } from "rxjs";
import { bountyValue$, currencyIsStables$ } from "./price";
import { decisionDeposit, submissionDeposit } from "./referendaConstants";

const TITLE_LENGTH = 100;
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

const bountyDeposit$ = combineLatest([
  typedApi.constants.Bounties.BountyDepositBase(),
  typedApi.constants.Bounties.DataDepositPerByte(),
]).pipe(map(([base, perByte]) => base + perByte * BigInt(TITLE_LENGTH)));

const proposeBountyFee$ = typedApi.tx.Utility.batch({
  calls: [
    typedApi.tx.System.remark_with_event({
      remark: Binary.fromText(REMARK_TEXT),
    }).decodedCall,
    typedApi.tx.Bounties.propose_bounty({
      value: 0n,
      description: Binary.fromBytes(new Uint8Array(TITLE_LENGTH)),
    }).decodedCall,
  ],
}).getEstimatedFees(ALICE);

export const curatorDeposit$ = from(
  Promise.all([
    typedApi.constants.Balances.ExistentialDeposit(),
    typedApi.constants.Bounties.CuratorDepositMin(),
  ]),
).pipe(
  map(
    ([existentialDeposit, minCuratorDeposit = 0n]) =>
      existentialDeposit + minCuratorDeposit,
  ),
);

const proposeBountyCall = typedApi.tx.Utility.batch({
  calls: [
    typedApi.tx.Bounties.approve_bounty({ bounty_id: 0 }).decodedCall,
    typedApi.tx.Scheduler.schedule({
      when: 0,
      priority: 255,
      call: typedApi.tx.Bounties.propose_curator({
        bounty_id: 0,
        curator: MultiAddress.Id(ALICE),
        fee: 0n,
      }).decodedCall,
      maybe_periodic: undefined,
    }).decodedCall,
  ],
});
const spendToMultisigCall = createSpendCall(0n, 0n, ALICE);

const submitReferendumFee$ = currencyIsStables$.pipe(
  switchMap((multisig) => {
    const proposal = multisig ? spendToMultisigCall : proposeBountyCall;
    const referendaTx$ = from(proposal.getEncodedData()).pipe(
      map((proposal) =>
        referendaSdk.createReferenda(
          {
            type: "Origins",
            value: {
              type: "Treasurer",
              value: undefined,
            },
          },
          proposal,
        ),
      ),
    );

    return multisig
      ? referendaTx$.pipe(switchMap((tx) => tx.getEstimatedFees(ALICE)))
      : combineLatest([curatorDeposit$, referendaTx$]).pipe(
          switchMap(([curatorDeposit, referendaTx]) =>
            typedApi.tx.Utility.batch({
              calls: [
                typedApi.tx.Balances.transfer_keep_alive({
                  value: curatorDeposit,
                  dest: MultiAddress.Id(ALICE),
                }).decodedCall,
                referendaTx.decodedCall,
              ],
            }).getEstimatedFees(ALICE),
          ),
        );
  }),
);

const decisionDepositFee$ = typedApi.tx.Referenda.place_decision_deposit({
  index: 0,
}).getEstimatedFees(ALICE);

const depositCosts$ = currencyIsStables$
  .pipe(
    switchMap((multisig) =>
      multisig
        ? combineLatest([
            submissionDeposit,
            bountyValue$.pipe(
              switchMap((v) =>
                decisionDeposit(
                  v ? BigInt(v * 10 ** TOKEN_DECIMALS) / 10n : null,
                ),
              ),
            ),
          ])
        : combineLatest([
            bountyDeposit$,
            submissionDeposit,
            bountyValue$.pipe(
              switchMap((v) =>
                decisionDeposit(v ? BigInt(v * 10 ** TOKEN_DECIMALS) : null),
              ),
            ),
          ]),
    ),
  )
  .pipe(map((r) => r.reduce(sum, 0n)));

const feeCosts$ = currencyIsStables$
  .pipe(
    switchMap((multisig) =>
      multisig
        ? combineLatest([submitReferendumFee$, decisionDepositFee$])
        : combineLatest([
            proposeBountyFee$,
            submitReferendumFee$,
            // Counting curator deposit as a "fee", because it's balance being transfered from the signer to the curator
            curatorDeposit$,
            decisionDepositFee$,
          ]),
    ),
  )
  .pipe(map((v) => v.reduce(sum, 0n)));

export const estimatedCost$ = state(
  combineLatest({
    deposits: depositCosts$,
    fees: feeCosts$,
  }),
  null,
);

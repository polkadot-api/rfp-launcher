import { typedApi } from "@/chain";
import { MultiAddress } from "@polkadot-api/descriptors";
import { createReferendaSdk } from "@polkadot-api/sdk-governance";
import { state } from "@react-rxjs/core";
import { Binary } from "polkadot-api";
import { combineLatest, from, map, switchMap } from "rxjs";

const TITLE_LENGTH = 100;
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

const bountyDeposit$ = combineLatest([
  typedApi.constants.Bounties.BountyDepositBase(),
  typedApi.constants.Bounties.DataDepositPerByte(),
]).pipe(map(([base, perByte]) => base + perByte * BigInt(TITLE_LENGTH)));

const proposeBountyFee$ = typedApi.tx.Bounties.propose_bounty({
  value: 0n,
  description: Binary.fromBytes(new Uint8Array(TITLE_LENGTH)),
}).getEstimatedFees(ALICE);

export const curatorDeposit$ = from(
  Promise.all([
    typedApi.constants.Balances.ExistentialDeposit(),
    typedApi.constants.Bounties.CuratorDepositMin(),
  ])
).pipe(
  map(
    ([existentialDeposit, minCuratorDeposit = 0n]) =>
      existentialDeposit + minCuratorDeposit
  )
);

const depositCosts$ = combineLatest([
  typedApi.constants.Referenda.SubmissionDeposit(),
  curatorDeposit$,
]).pipe(
  map(
    ([referendumDeposit, curatorDeposit]) => referendumDeposit + curatorDeposit
  )
);

const referendaSdk = createReferendaSdk(typedApi);
const submitReferendumFee$ = combineLatest([
  curatorDeposit$,
  typedApi.tx.Utility.batch({
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
  }).getEncodedData(),
]).pipe(
  switchMap(([curatorDeposit, proposal]) =>
    typedApi.tx.Utility.batch({
      calls: [
        typedApi.tx.Balances.transfer_keep_alive({
          value: curatorDeposit,
          dest: MultiAddress.Id(ALICE),
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
    }).getEstimatedFees(ALICE)
  )
);

export const estimatedCost$ = state(
  combineLatest([
    bountyDeposit$,
    proposeBountyFee$,
    depositCosts$,
    submitReferendumFee$,
  ]).pipe(map((v) => v.reduce((a, b) => a + b, 0n))),
  null
);

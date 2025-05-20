import { typedApi } from "@/chain";
import { formatToken } from "@/lib/formatToken";
import { MultiAddress } from "@polkadot-api/descriptors";
import { createReferendaSdk } from "@polkadot-api/sdk-governance";
import { state, useStateObservable } from "@react-rxjs/core";
import { TriangleAlert } from "lucide-react";
import { Binary } from "polkadot-api";
import { FC } from "react";
import { combineLatest, map, of, switchMap } from "rxjs";
import { openSelectAccount, selectedAccount$ } from "../SelectAccount";
import { curatorDeposit$ } from "../SubmitModal/submit.state";
import { Card, CardContent } from "../ui/card";

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

const estimatedCost$ = state(
  combineLatest([
    bountyDeposit$,
    proposeBountyFee$,
    depositCosts$,
    submitReferendumFee$,
  ]).pipe(map((v) => v.reduce((a, b) => a + b, 0n))),
  null
);

const currentBalance$ = state(
  selectedAccount$.pipe(
    switchMap((account) =>
      account
        ? typedApi.query.System.Account.getValue(account.address)
        : of(null)
    ),
    map((v) => (v ? v.data.free : null))
  ),
  null
);

export const WelcomeSection: FC = () => {
  const estimatedCost = useStateObservable(estimatedCost$);
  const selectedAccount = useStateObservable(selectedAccount$);
  const currentBalance = useStateObservable(currentBalance$);

  const renderBalanceCheck = () => {
    if (estimatedCost == null) return null;
    if (!selectedAccount) {
      return (
        <>
          <button
            type="button"
            className="border border-primary rounded-full px-2 hover:bg-primary/5"
            onClick={openSelectAccount}
          >
            Connect your wallet
          </button>{" "}
          to check if you have sufficient balance.
        </>
      );
    }
    if (currentBalance == null) return null;

    if (currentBalance < estimatedCost) {
      return (
        <div>
          <TriangleAlert className="text-amber-600 inline-block" size={20} />
          You don't have enough balance in your wallet (
          {formatToken(currentBalance)}). Please, add funds or select another
          one.
        </div>
      );
    }
    return <>You have enough balance to launch the RFP 🚀</>;
  };

  return (
    <Card>
      <CardContent className="text-sm space-y-1">
        <p>
          This tool will guide you through all the steps to launch an RFP
          (Request for Proposal).
        </p>
        <p>
          After completing the form, you'll be prompted to submit two
          transactions to set up the RFP. The tool will then provide a
          pre-formatted RFP body, which you can copy and paste into the RFP
          referendum.
        </p>
        <p>
          Please note that you'll need a minimum of{" "}
          {estimatedCost ? (
            <b>{formatToken(estimatedCost)}</b>
          ) : (
            <span className="text-muted-foreground">(calculating…)</span>
          )}{" "}
          to submit the RFP. {renderBalanceCheck()}
        </p>
      </CardContent>
    </Card>
  );
};

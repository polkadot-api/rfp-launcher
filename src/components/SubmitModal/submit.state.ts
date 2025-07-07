import { referendaSdk } from "@/chain";
import { state } from "@react-rxjs/core";
import { TxEvent } from "polkadot-api";
import { combineLatest, map, merge, Observable } from "rxjs";
import { bountyCreationProcess$, bountyCreationTx$ } from "./tx/bountyCreation";
import { childBountyProcess$, childBountyTx$ } from "./tx/childBounty";
import {
  decisionDepositProcess$,
  decisionDepositTx$,
} from "./tx/decisionDeposit";
import {
  referendumCreationProcess$,
  referendumCreationTx$,
  rfpReferendum$,
} from "./tx/referendumCreation";
import {
  treasurySpendProcess$,
  treasurySpendRfpReferendum$,
  treasurySpendTx$,
} from "./tx/treasurySpend";

const txProcessState = <T>(
  tx$: Observable<T | null>,
  process$: Observable<
    | TxEvent
    | {
        type: "error";
        err: any;
      }
    | null
  >,
  tag: string,
) =>
  combineLatest([tx$, process$]).pipe(
    map(([tx, process]) => {
      if (process) {
        if (process.type === "finalized" && process.ok) {
          const referendum = referendaSdk.getSubmittedReferendum(process);
          return {
            type: "done" as const,
            tag,
            value: {
              txEvent: process,
              referendum,
            },
          };
        }
        if (process.type !== "error" || process.err.message !== "Cancelled") {
          return {
            type: "submitting" as const,
            tag,
            value: {
              txEvent: process,
            },
          };
        }
      }

      return tx
        ? {
            type: "tx" as const,
            tag,
            value: {
              ...tx,
            },
          }
        : null;
    }),
  );

export const activeBountyRfpTxStep$ = state(
  combineLatest([
    txProcessState(bountyCreationTx$, bountyCreationProcess$, "bounty"),
    txProcessState(referendumCreationTx$, referendumCreationProcess$, "ref"),
    txProcessState(decisionDepositTx$, decisionDepositProcess$, "decision"),
  ]).pipe(map((steps) => steps.reverse().reduce((a, b) => a || b, null))),
  null,
);

export const activeMultisigRfpTxStep$ = state(
  combineLatest([
    txProcessState(treasurySpendTx$, treasurySpendProcess$, "ref"),
    txProcessState(decisionDepositTx$, decisionDepositProcess$, "decision"),
  ]).pipe(map((steps) => steps.reverse().reduce((a, b) => a || b, null))),
  null,
);

export const referendumIndex$ = state(
  merge(rfpReferendum$, treasurySpendRfpReferendum$).pipe(map((v) => v.index)),
  undefined,
);

export const activeChildBountyTxStep$ = state(
  combineLatest([
    txProcessState(childBountyTx$, childBountyProcess$, "child-bounty"),
  ]).pipe(map((steps) => steps.reverse().reduce((a, b) => a || b, null))),
  null,
);

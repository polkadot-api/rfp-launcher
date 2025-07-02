import { referendaSdk } from "@/chain";
import { state } from "@react-rxjs/core";
import { TxEvent } from "polkadot-api";
import { combineLatest, map, Observable } from "rxjs";
import { bountyCreationProcess$, bountyCreationTx$ } from "./tx/bountyCreation";
import {
  decisionDepositProcess$,
  decisionDepositTx$,
} from "./tx/decisionDeposit";
import {
  referendumCreationProcess$,
  referendumCreationTx$,
  rfpReferendum$,
} from "./tx/referendumCreation";
import { TxWithExplanation } from "./tx/types";

const txProcessState = (
  tx$: Observable<TxWithExplanation | null>,
  process$: Observable<
    | TxEvent
    | {
        type: "error";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export const activeTxStep$ = state(
  combineLatest([
    txProcessState(bountyCreationTx$, bountyCreationProcess$, "bounty"),
    txProcessState(referendumCreationTx$, referendumCreationProcess$, "ref"),
    txProcessState(decisionDepositTx$, decisionDepositProcess$, "decision"),
  ]).pipe(map((steps) => steps.reverse().reduce((a, b) => a || b, null))),
  null,
);

export const referendumIndex$ = state(
  rfpReferendum$.pipe(map((v) => v.index)),
  undefined,
);

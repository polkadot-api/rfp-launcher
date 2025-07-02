import { typedApi } from "@/chain";
import { state } from "@react-rxjs/core";
import { map, of, switchMap } from "rxjs";
import { dismissable } from "../modalActions";
import { rfpReferendum$ } from "./referendumCreation";
import { createTxProcess } from "./txProcess";
import { TxWithExplanation } from "./types";

export const decisionDepositTx$ = state(
  rfpReferendum$.pipe(
    switchMap(({ index }) => {
      const res: TxWithExplanation = {
        tx: typedApi.tx.Referenda.place_decision_deposit({ index }),
        explanation: {
          text: "Place decision deposit",
        },
      };
      return of(res).pipe(dismissable());
    }),
  ),
  null,
);

export const [decisionDepositProcess$, submitdecisionDeposit] = createTxProcess(
  decisionDepositTx$.pipe(map((v) => v?.tx ?? null)),
);

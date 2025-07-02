import { selectedAccount$ } from "@/components/SelectAccount";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { catchError, exhaustMap, Observable, of, withLatestFrom } from "rxjs";
import { dismissable } from "../modalActions";
import { AnyTx } from "./types";

export const createTxProcess = (tx$: Observable<AnyTx | null>) => {
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
            }),
          ),
        );
      }),
      dismissable(),
    ),
    null,
  );

  return [txProcess$, submitTx] as const;
};

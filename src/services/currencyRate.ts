import { KRAKEN_SYMBOL_PAIR } from "@/constants";
import { state } from "@react-rxjs/core";
import { catchError, map, of, switchMap, timer } from "rxjs";

export const currencyRate$ = state(
  timer(0, 60_000).pipe(
    switchMap(() =>
      fetch(
        `https://api.kraken.com/0/public/Ticker?pair=${KRAKEN_SYMBOL_PAIR}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      ).then((r) => r.json()),
    ),
    map((v) => {
      if (v.error?.length) {
        throw new Error(v.error[0]);
      }
      return Number(v.result[KRAKEN_SYMBOL_PAIR].p[1]);
    }),
    catchError((err) => {
      console.error(err);
      return of(null);
    }),
  ),
  null,
);

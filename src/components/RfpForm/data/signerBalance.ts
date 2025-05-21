import { typedApi } from "@/chain";
import { selectedAccount$ } from "@/components/SelectAccount";
import { state } from "@react-rxjs/core";
import { map, of, switchMap } from "rxjs";

export const signerBalance$ = state(
  selectedAccount$.pipe(
    switchMap((account) =>
      account
        ? typedApi.query.System.Account.watchValue(account.address)
        : of(null)
    ),
    map((v) => (v ? v.data.free : null))
  ),
  null
);

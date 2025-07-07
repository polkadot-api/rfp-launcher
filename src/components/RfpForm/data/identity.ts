import { peopleApi } from "@/chain";
import { createIdentitySdk } from "@polkadot-api/sdk-accounts";
import { state } from "@react-rxjs/core";
import { combineKeys } from "@react-rxjs/utils";
import { SS58String } from "polkadot-api";
import { from, map, startWith, tap } from "rxjs";
import { formValue$ } from "./formValue";

const CACHE_KEY = "identity-cache";
const cache: Record<
  SS58String,
  { value: string; verified: boolean } | undefined
> = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");

const identitySdk = createIdentitySdk(peopleApi);

export const identity$ = state((address: SS58String) => {
  const defaultValue = cache[address] ?? null;
  return from(identitySdk.getIdentity(address)).pipe(
    map((v) =>
      v?.info.display
        ? {
            value: v.info.display,
            verified: v.verified,
          }
        : null,
    ),
    tap((v) => {
      if (v != null) {
        cache[address] = v;
      } else {
        delete cache[address];
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }),
    startWith(defaultValue),
  );
}, null);

export const supervisorIdentities$ = combineKeys(
  formValue$.pipe(
    map((v) => (v.supervisors?.filter((v) => v != null) as SS58String[]) ?? []),
  ),
  identity$,
);

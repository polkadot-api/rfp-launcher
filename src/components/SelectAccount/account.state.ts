import { state, withDefault } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { InjectedPolkadotAccount } from "polkadot-api/pjs-signer";
import {
  filter,
  fromEventPattern,
  map,
  merge,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs";
import { selectedExtension$ } from "./extension.state";

export const extensionAccounts$ = selectedExtension$.pipeState(
  switchMap((extension) => {
    if (!extension) return [null];
    const initialAccounts = extension.getAccounts();

    return fromEventPattern<InjectedPolkadotAccount[]>(
      (handler) => extension.subscribe(handler),
      (_, signal) => signal(),
    ).pipe(startWith(initialAccounts));
  }),
  withDefault(null),
);

export const [setSelectValue$, setSelectValue] = createSignal<string>();
export const selectValue$ = state(
  selectedExtension$.pipe(
    switchMap((extension) =>
      setSelectValue$.pipe(
        startWith(extension?.getAccounts()[0].address ?? null),
      ),
    ),
  ),
  null,
);

export const [selectAccount$, selectAccount] = createSignal();

const getPersistedSelectedAccount = () =>
  localStorage.getItem("selected-account");
const setPersistedSelectedAccount = (value: string | null) =>
  value
    ? localStorage.setItem("selected-account", value)
    : localStorage.removeItem("selected-account");

export const selectedAccount$ = state(
  merge(
    selectAccount$.pipe(
      withLatestFrom(extensionAccounts$, selectValue$),
      map(
        ([, accounts, value]) =>
          accounts?.find((v) => v.address === value) ?? null,
      ),
      tap((v) => setPersistedSelectedAccount(v?.address ?? null)),
    ),
    extensionAccounts$.pipe(
      map((v) =>
        v?.find((acc) => acc.address === getPersistedSelectedAccount()),
      ),
      filter((v) => !!v),
    ),
  ),
  null,
);

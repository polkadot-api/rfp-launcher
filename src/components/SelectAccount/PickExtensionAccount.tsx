import { PolkadotIdenticon } from "@polkadot-api/react-components";
import { state, useStateObservable, withDefault } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { InjectedPolkadotAccount } from "polkadot-api/pjs-signer";
import { FC } from "react";
import {
  fromEventPattern,
  map,
  startWith,
  switchMap,
  withLatestFrom,
} from "rxjs";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { selectedExtension$ } from "./PickExtension";

const extensionAccounts$ = selectedExtension$.pipeState(
  switchMap((extension) => {
    if (!extension) return [null];
    const initialAccounts = extension.getAccounts();

    return fromEventPattern<InjectedPolkadotAccount[]>(
      (handler) => extension.subscribe(handler),
      (_, signal) => signal()
    ).pipe(startWith(initialAccounts));
  }),
  withDefault(null)
);

const [setSelectValue$, setSelectValue] = createSignal<string>();
const selectValue$ = state(
  selectedExtension$.pipe(
    switchMap((extension) =>
      setSelectValue$.pipe(
        startWith(extension?.getAccounts()[0].address ?? null)
      )
    )
  ),
  null
);

const [selectAccount$, selectAccount] = createSignal();

export const selectedAccount$ = state(
  selectAccount$.pipe(
    withLatestFrom(extensionAccounts$, selectValue$),
    map(
      ([, accounts, value]) =>
        accounts?.find((v) => v.address === value) ?? null
    )
  ),
  null
);

export const PickExtensionAccount: FC<{
  onSelected: () => void;
}> = ({ onSelected }) => {
  const extensionAccounts = useStateObservable(extensionAccounts$);
  const selectValue = useStateObservable(selectValue$);

  if (!extensionAccounts) return null;

  return (
    <div className="overflow-hidden space-y-2">
      <p className="text-sm">Choose account</p>
      <Select value={selectValue ?? ""} onValueChange={setSelectValue}>
        <SelectTrigger
          className="w-full data-[size=default]:h-auto"
          forceSvgSize={false}
        >
          <SelectValue placeholder="Choose account from extension" />
        </SelectTrigger>
        <SelectContent>
          {extensionAccounts.map((account) => (
            <SelectItem
              key={account.address}
              value={account.address}
              forceSvgSize={false}
              className="flex gap-2"
            >
              <PolkadotIdenticon
                size={32}
                publicKey={account.polkadotSigner.publicKey}
              />
              {account.name ? (
                <div className="text-left">
                  <p>{account.name}</p>
                  <p className="text-sm text-foreground/60">
                    {account.address}
                  </p>
                </div>
              ) : (
                <div>{account.address}</div>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="text-right">
        <Button
          disabled={!selectValue}
          onClick={() => {
            selectAccount();
            onSelected();
          }}
        >
          Select Account
        </Button>
      </div>
    </div>
  );
};

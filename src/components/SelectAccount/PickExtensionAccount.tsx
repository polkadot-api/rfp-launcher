import { PolkadotIdenticon } from "@polkadot-api/react-components";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  extensionAccounts$,
  selectAccount,
  selectValue$,
  setSelectValue,
} from "./account.state";

export const PickExtensionAccount: FC<{
  onSelected?: () => void;
  autoSelect?: boolean;
}> = ({ onSelected, autoSelect }) => {
  const extensionAccounts = useStateObservable(extensionAccounts$);
  const selectValue = useStateObservable(selectValue$);

  if (!extensionAccounts) return null;

  return (
    <div className="overflow-hidden space-y-2">
      <p className="text-sm">Choose account</p>
      <Select
        value={selectValue ?? ""}
        onValueChange={(v) => {
          setSelectValue(v);
          if (autoSelect) {
            selectAccount();
            onSelected?.();
          }
        }}
      >
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
                className="shrink-0"
                size={32}
                publicKey={account.polkadotSigner.publicKey}
              />
              {account.name ? (
                <div className="text-left overflow-hidden">
                  <p>{account.name}</p>
                  <p className="text-sm text-foreground/60 overflow-hidden overflow-ellipsis">
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
      {autoSelect ? null : (
        <div className="text-right">
          <Button
            disabled={!selectValue}
            onClick={() => {
              selectAccount();
              onSelected?.();
            }}
          >
            Select Account
          </Button>
        </div>
      )}
    </div>
  );
};

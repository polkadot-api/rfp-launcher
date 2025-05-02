import { peopleApi } from "@/chain";
import { sliceMiddleAddr } from "@/lib/ss58";
import { CopyText, PolkadotIdenticon } from "@polkadot-api/react-components";
import { createIdentitySdk, Identity } from "@polkadot-api/sdk-accounts";
import { state, useStateObservable } from "@react-rxjs/core";
import { CheckCircle, Trash2 } from "lucide-react";
import { getSs58AddressInfo, SS58String } from "polkadot-api";
import { FC, useState } from "react";
import { ControllerRenderProps } from "react-hook-form";
import { from, map, startWith, tap } from "rxjs";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { FormControl, FormField, FormItem } from "../ui/form";
import { Input } from "../ui/input";
import { FormSchema, RfpControlType } from "./formSchema";

export const SupervisorsSection: FC<{ control: RfpControlType }> = ({
  control,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Supervisors</CardTitle>
      <CardDescription>
        Curators for this bounty, responsible of choosing the implementors and
        evaluating the development
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <FormField
        control={control}
        name="supervisors"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <SupervisorsControl {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </CardContent>
  </Card>
);

const SupervisorsControl: FC<
  ControllerRenderProps<FormSchema, "supervisors">
> = ({ value, onChange }) => {
  const [newAddr, setNewAddr] = useState("");
  const [addrInvalid, setAddrInvalid] = useState(false);

  const addSupervisor = () => {
    const info = getSs58AddressInfo(newAddr);
    setAddrInvalid(!info.isValid);

    if (info.isValid) {
      if (!value.includes(newAddr)) {
        onChange([...value, newAddr]);
      }
      setNewAddr("");
    }
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {value.map((addr) => (
          <li key={addr} className="flex items-center gap-1 overflow-hidden">
            <Button variant="destructive" className="mx-1 h-auto">
              <Trash2 />
            </Button>
            <AddressIdentity addr={addr} />
          </li>
        ))}
      </ul>
      <div className="space-y-1">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Address"
            value={newAddr}
            onChange={(evt) => setNewAddr(evt.target.value)}
            aria-invalid={addrInvalid}
          />
          <Button type="button" variant="outline" onClick={addSupervisor}>
            Add Supervisor
          </Button>
        </div>
        {addrInvalid ? (
          <div className="text-sm text-destructive">
            Value is not a valid SS58 Address
          </div>
        ) : null}
      </div>
    </div>
  );
};

const getPublicKey = (addr: string) => {
  const info = getSs58AddressInfo(addr);
  if (!info.isValid) throw new Error("Invalid SS58 Address");
  return info.publicKey;
};

const CACHE_KEY = "identity-cache";
const cache: Record<SS58String, Identity["displayName"] | undefined> =
  JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");

const identitySdk = createIdentitySdk(peopleApi);
const identity$ = state((address: SS58String) => {
  const defaultValue = cache[address] ?? null;
  return from(identitySdk.getIdentity(address)).pipe(
    map((v) => v?.displayName),
    tap((v) => {
      if (v != null) {
        cache[address] = v;
      } else {
        delete cache[address];
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }),
    startWith(defaultValue)
  );
}, null);

const AddressIdentity: FC<{ addr: string }> = ({ addr }) => {
  const identity = useStateObservable(identity$(addr));

  return (
    <div className="flex items-center gap-1 overflow-hidden">
      <CopyText
        text={addr}
        copiedContent={
          <CheckCircle
            size={16}
            className="text-green-500 dark:text-green-300 w-8"
          />
        }
      >
        <PolkadotIdenticon size={32} publicKey={getPublicKey(addr)} />
      </CopyText>
      {identity ? (
        identity.verified ? (
          <div className="flex items-center gap-1">
            <span>{identity.value}</span>
            <CheckCircle
              size={16}
              className="text-green-500 dark:text-green-400"
            />
          </div>
        ) : (
          <div className="leading-tight">
            <div>{identity.value}</div>
            <div className="text-sm text-foreground/60">
              {sliceMiddleAddr(addr)}
            </div>
          </div>
        )
      ) : (
        <span className="text-sm text-foreground/60 overflow-hidden text-ellipsis">
          {sliceMiddleAddr(addr)}
        </span>
      )}
    </div>
  );
};

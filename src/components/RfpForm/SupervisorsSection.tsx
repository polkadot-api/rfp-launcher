import { CopyText, PolkadotIdenticon } from "@polkadot-api/react-components";
import { CheckCircle, Trash2 } from "lucide-react";
import { getSs58AddressInfo } from "polkadot-api";
import { FC, useState } from "react";
import { ControllerRenderProps } from "react-hook-form";
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
import { sliceMiddleAddr } from "@/lib/ss58";

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
            <span className="text-sm text-foreground/60 overflow-hidden text-ellipsis">
              {sliceMiddleAddr(addr)}
            </span>
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

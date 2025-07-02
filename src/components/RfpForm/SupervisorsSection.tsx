"use client";

import { getPublicKey, sliceMiddleAddr } from "@/lib/ss58";
import { CopyText, PolkadotIdenticon } from "@polkadot-api/react-components";
import { useStateObservable } from "@react-rxjs/core";
import { CheckCircle, Trash2 } from "lucide-react";
import { getSs58AddressInfo } from "polkadot-api";
import { type FC, useState } from "react";
import { type ControllerRenderProps, useWatch } from "react-hook-form";
import { Button } from "../ui/button";
import { FormControl, FormField, FormItem, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { identity$ } from "./data";
import { FormInputField } from "./FormInputField";
import type { FormSchema, RfpControlType } from "./formSchema";

export const SupervisorsSection: FC<{ control: RfpControlType }> = ({
  control,
}) => {
  const supervisors = useWatch({ name: "supervisors", control });

  return (
    <div className="poster-card">
      {" "}
      {/* Changed classes here */}
      <h3 className="text-3xl font-medium mb-8 text-midnight-koi">
        Supervisors
      </h3>{" "}
      {/* Adjusted margin for consistency */}
      <p className="text-lg text-pine-shadow/80 mb-12 leading-relaxed">
        Supervisors for this RFP, responsible for choosing the implementors and
        evaluating the development process, quality control, and deliverables.
      </p>
      <div className="space-y-8">
        <FormField
          control={control}
          name="supervisors"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <SupervisorsControl {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {supervisors.length > 1 ? (
          <FormInputField
            type="number"
            min={1}
            control={control}
            name="signatoriesThreshold"
            label="Signatories Threshold"
            description="Minimum required amount of supervisors to sign and perform decisions."
          />
        ) : null}
      </div>
    </div>
  );
};

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
    <div className="space-y-6">
      <ul className="space-y-4">
        {value.map((addr) => (
          <li key={addr} className="flex items-center gap-4 p-4 budget-card">
            {" "}
            {/* Consider if 'budget-card' needs poster styling */}
            <Button
              type="button"
              className="vintage-button btn-destructive" // Consider if 'vintage-button' needs poster styling
              onClick={() => onChange(value.filter((v) => v !== addr))}
            >
              <Trash2 size={18} />
            </Button>
            <AddressIdentity addr={addr} />
          </li>
        ))}
      </ul>
      <div className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Input
            placeholder="Supervisor address"
            value={newAddr}
            onChange={(evt) => setNewAddr(evt.target.value)}
            aria-invalid={addrInvalid}
            className="vintage-input flex-1" // Consider if 'vintage-input' needs poster styling
          />
          <Button
            type="button"
            className="vintage-button btn-primary"
            onClick={addSupervisor}
          >
            {" "}
            {/* Consider if 'vintage-button' needs poster styling */}
            Add Supervisor
          </Button>
        </div>
        {addrInvalid ? (
          <div className="alert-box alert-danger">
            {" "}
            {/* Consider if 'alert-box' needs poster styling */}
            <div className="text-base">Value is not a valid address.</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const AddressIdentity: FC<{ addr: string }> = ({ addr }) => {
  const identity = useStateObservable(identity$(addr));

  return (
    <div className="flex items-center gap-3 overflow-hidden flex-1">
      <CopyText
        text={addr}
        copiedContent={
          <CheckCircle size={18} className="text-lilypad-dark w-8" />
        }
      >
        <PolkadotIdenticon size={36} publicKey={getPublicKey(addr)} />
      </CopyText>
      {identity ? (
        identity.verified ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">{identity.value}</span>
            <CheckCircle size={18} className="text-lilypad-dark" />
          </div>
        ) : (
          <div className="leading-tight">
            <div className="text-lg font-medium">{identity.value}</div>
            <div className="text-base text-pine-shadow/60">
              {sliceMiddleAddr(addr)}
            </div>
          </div>
        )
      ) : (
        <span className="text-base text-pine-shadow/60 overflow-hidden text-ellipsis">
          {sliceMiddleAddr(addr)}
        </span>
      )}
    </div>
  );
};

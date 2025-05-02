import { sliceMiddleAddr } from "@/lib/ss58";
import { PolkadotIdenticon } from "@polkadot-api/react-components";
import { useStateObservable } from "@react-rxjs/core";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { PickExtension } from "./PickExtension";
import { PickExtensionAccount, selectedAccount$ } from "./PickExtensionAccount";

export const SelectAccount = () => {
  const [open, setOpen] = useState(false);
  const selectedAccount = useStateObservable(selectedAccount$);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {selectedAccount ? (
          <Button variant="outline">
            <PolkadotIdenticon
              publicKey={selectedAccount.polkadotSigner.publicKey}
            />
            {selectedAccount.name ? (
              <div>{selectedAccount.name}</div>
            ) : (
              <div className="text-sm text-foreground/60">
                {sliceMiddleAddr(selectedAccount.address)}
              </div>
            )}
          </Button>
        ) : (
          <Button>Connect</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect</DialogTitle>
          <DialogDescription>
            Connect using one of the polkadot extensions
          </DialogDescription>
        </DialogHeader>
        <PickExtension />
        <PickExtensionAccount onSelected={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

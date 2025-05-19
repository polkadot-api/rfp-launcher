import { sliceMiddleAddr } from "@/lib/ss58";
import { PolkadotIdenticon } from "@polkadot-api/react-components";
import { state, useStateObservable } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
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

const [openChange$, setOpen] = createSignal<boolean>();
export const openSelectAccount = () => setOpen(true);
const open$ = state(openChange$, false);

export const SelectAccount = () => {
  const open = useStateObservable(open$);
  const selectedAccount = useStateObservable(selectedAccount$);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {selectedAccount ? (
          <Button variant="outline" forceSvgSize={false}>
            <PolkadotIdenticon
              publicKey={selectedAccount.polkadotSigner.publicKey}
              size={24}
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

import { state, useStateObservable } from "@react-rxjs/core";
import { mergeWithKey } from "@react-rxjs/utils";
import { Transaction } from "polkadot-api";
import { FC, useEffect } from "react";
import { filter, map, merge, of, switchMap, take, withLatestFrom } from "rxjs";
import { selectedAccount$ } from "../SelectAccount";
import { PickExtension } from "../SelectAccount/PickExtension";
import { PickExtensionAccount } from "../SelectAccount/PickExtensionAccount";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  activeTxStep$,
  dismiss,
  dismiss$,
  formDataChange$,
  submitBountyCreation,
  submittedFormData$,
} from "./submit.state";
import { Textarea } from "../ui/textarea";
import { stringify } from "@/lib/json";
import { Button } from "../ui/button";

const submitModal$ = state(
  mergeWithKey({ formDataChange$, dismiss$ }).pipe(
    // If account wasn't selected, prompt to select the account
    withLatestFrom(selectedAccount$),
    switchMap(([evt, account]) => {
      if (evt.type === "dismiss$") {
        return of(null);
      }

      if (account) {
        return of("submit" as const);
      }

      return merge(
        of("account" as const),
        selectedAccount$.pipe(
          filter((v) => !!v),
          take(1),
          map(() => "submit" as const)
        )
      );
    })
  ),
  null
);

export const SubmitModal = () => {
  const modalStatus = useStateObservable(submitModal$);

  useEffect(() => {
    const sub = submittedFormData$.subscribe();
    return () => sub.unsubscribe();
  }, []);

  if (!modalStatus) return null;

  if (modalStatus === "account") {
    return (
      <Dialog open={true} onOpenChange={() => dismiss()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect</DialogTitle>
            <DialogDescription>
              Connect using one of the polkadot extensions
            </DialogDescription>
          </DialogHeader>
          <PickExtension />
          <PickExtensionAccount />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={() => dismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit RFP</DialogTitle>
          <DialogDescription>
            This is a two-step process: Create the bounty, then submit the
            referendum
          </DialogDescription>
        </DialogHeader>
        <SubmitModalContent />
      </DialogContent>
    </Dialog>
  );
};

const SubmitModalContent = () => {
  const activeTxStep = useStateObservable(activeTxStep$);
  if (!activeTxStep) return null;

  if (activeTxStep.type === "bountyTx") {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-bold">
          1. Submit the transaction to create the bounty
        </h3>
        <SubmitTxStep tx={activeTxStep.value.tx} />
      </div>
    );
  }

  return <div>Next step</div>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SubmitTxStep: FC<{ tx: Transaction<any, any, any, any> }> = ({ tx }) => {
  return (
    <div className="space-y-2">
      <Textarea
        className="max-h-72 font-mono text-xs"
        readOnly
        value={stringify(tx.decodedCall)}
      />
      <Button className="mx-auto" onClick={submitBountyCreation}>
        Sign and submit
      </Button>
    </div>
  );
};

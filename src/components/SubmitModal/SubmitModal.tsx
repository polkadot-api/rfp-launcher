import { state, useStateObservable } from "@react-rxjs/core";
import { mergeWithKey } from "@react-rxjs/utils";
import { useEffect } from "react";
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
  dismiss,
  dismiss$,
  formDataChange$,
  submittedFormData$,
} from "./modalActions";
import { StepBroadcastingTx } from "./StepBroadcastingTx";
import { StepFinish } from "./StepFinish";
import { StepSubmitTx } from "./StepSubmitTx";
import { activeTxStep$ } from "./submit.state";
import { submitBountyCreation } from "./tx/bountyCreation";
import { submitReferendumCreation } from "./tx/referendumCreation";

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
      <div className="space-y-2 overflow-hidden">
        <h3 className="text-sm font-bold">
          1. Submit the transaction to create the bounty
        </h3>
        <StepSubmitTx
          explanation={activeTxStep.value.explanation}
          submit={submitBountyCreation}
        />
      </div>
    );
  }

  if (activeTxStep.type === "refTx") {
    return (
      <div className="space-y-2 overflow-hidden">
        <h3 className="text-sm font-bold">
          2. Submit the transaction to create the referendum
        </h3>
        <StepSubmitTx
          explanation={activeTxStep.value.explanation}
          submit={submitReferendumCreation}
        />
      </div>
    );
  }

  if (
    activeTxStep.type === "bountySubmitting" ||
    activeTxStep.type === "refSubmitting" ||
    !activeTxStep.value.txEvent.ok
  ) {
    return <StepBroadcastingTx txEvt={activeTxStep.value.txEvent} />;
  }

  return <StepFinish refIdx={activeTxStep.value.referendum?.index} />;
};

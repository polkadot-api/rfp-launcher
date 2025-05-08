import { state, useStateObservable } from "@react-rxjs/core";
import { mergeWithKey } from "@react-rxjs/utils";
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
  bountyCreationTx$,
  dismiss,
  dismiss$,
  formDataChange$,
} from "./submit.state";

const submitModal$ = state(
  mergeWithKey({ formDataChange$, dismiss$ }).pipe(
    // If account wasn't selected, prompt to select the account
    withLatestFrom(selectedAccount$),
    switchMap(([evt, account]) => {
      if (evt.type === "dismiss$") {
        return of(null);
      }

      const submitStep$ = bountyCreationTx$.pipe(
        map((tx) => ({
          type: "submit" as const,
          value: tx,
        }))
      );
      if (account) {
        return submitStep$;
      }

      return merge(
        of({ type: "account" as const }),
        selectedAccount$.pipe(
          filter((v) => !!v),
          take(1),
          switchMap(() => submitStep$)
        )
      );
    })
  ),
  null
);

export const SubmitModal = () => {
  const modalStatus = useStateObservable(submitModal$);

  if (!modalStatus) return null;

  if (modalStatus.type === "account") {
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
      </DialogContent>
    </Dialog>
  );
};

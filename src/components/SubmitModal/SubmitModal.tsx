"use client";

import { currencyIsStables$ } from "@/components/RfpForm/data";
import { state, useStateObservable } from "@react-rxjs/core";
import { useEffect } from "react";
import {
  filter,
  map,
  merge,
  ObservableInput,
  of,
  startWith,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs";
import { selectedAccount$ } from "../SelectAccount";
import { Loading } from "../Spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  dismiss,
  dismiss$,
  formDataChange$,
  submittedFormData$,
} from "./modalActions";
import {
  accountSelected$,
  PromptAccountModal,
  signerStepValidity$,
} from "./PromptAccountModal";
import { SubmitBountyModal } from "./SubmitBountyModal";
import { SubmitChildBountyModal } from "./SubmitChildBountyModal";
import { SubmitMultisigRfpModal } from "./SubmitMultisigRfpModal";

// Define modal view types for better clarity
type ModalView = null | {
  type:
    | "checking_balance"
    | "prompt_account"
    | "child_bounty_steps"
    | "bounty_transaction_steps"
    | "multisig_transaction_steps";
};

const submitModal$ = state(
  merge(formDataChange$, dismiss$.pipe(map(() => null))).pipe(
    withLatestFrom(selectedAccount$),
    switchMap(([formData, selectedAccount]): ObservableInput<ModalView> => {
      if (!formData) return [null];

      const activeSubmissionModal$ = formData.isChildRfp
        ? of({
            type: "child_bounty_steps",
          } satisfies ModalView)
        : currencyIsStables$.pipe(
            map(
              (isStables): ModalView => ({
                type: isStables
                  ? "multisig_transaction_steps"
                  : "bounty_transaction_steps",
              }),
            ),
          );

      const afterSelection$ = accountSelected$.pipe(
        switchMap(() => activeSubmissionModal$),
        startWith({
          type: "prompt_account",
        } satisfies ModalView),
      );

      if (!selectedAccount) {
        return afterSelection$;
      }

      return signerStepValidity$.pipe(
        filter((v) => !!v),
        take(1),
        switchMap(({ isValid }) =>
          isValid ? activeSubmissionModal$ : afterSelection$,
        ),
        startWith({
          type: "checking_balance",
        } satisfies ModalView),
      );
    }),
  ),
  null,
);

export const SubmitModal = () => {
  const modalStatus = useStateObservable(submitModal$);

  useEffect(() => {
    const sub = submittedFormData$.subscribe();
    return () => sub.unsubscribe();
  }, []);

  if (!modalStatus) return null; // Modal is closed

  // Common dialog props
  const dialogProps = {
    open: true,
    onOpenChange: (isOpen: boolean) => {
      if (!isOpen) {
        dismiss(); // Call dismiss if the dialog is closed by user action (e.g., Esc, click outside)
      }
    },
  };

  if (modalStatus.type === "prompt_account") {
    return <PromptAccountModal />;
  }

  if (modalStatus.type === "checking_balance") {
    return (
      <Dialog {...dialogProps}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifying Funds</DialogTitle>
          </DialogHeader>
          <div className="py-8 flex flex-col justify-center items-center space-y-2">
            <Loading />
            <p className="text-sm text-muted-foreground">
              Checking your available balance...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (modalStatus.type === "bounty_transaction_steps") {
    return <SubmitBountyModal />;
  }

  if (modalStatus.type === "multisig_transaction_steps") {
    return <SubmitMultisigRfpModal />;
  }

  if (modalStatus.type === "child_bounty_steps") {
    return <SubmitChildBountyModal />;
  }

  // Fallback or should not be reached if modalStatus is always one of the above or null
  return null;
};

"use client";

import {
  currencyIsStables$,
  estimatedCost$,
  priceTotals$,
  signerBalance$,
} from "@/components/RfpForm/data";
import { TOKEN_DECIMALS } from "@/constants";
import { state, useStateObservable } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import {
  combineLatest,
  filter,
  map,
  merge,
  ObservableInput,
  startWith,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs";
import { formValue$ } from "../RfpForm/data/formValue";
import { bountyById$ } from "../RfpForm/FundingBountyCheck";
import { selectedAccount$ } from "../SelectAccount";
import { PickExtension } from "../SelectAccount/PickExtension";
import { PickExtensionAccount } from "../SelectAccount/PickExtensionAccount";
import { Loading } from "../Spinner";
import { Button } from "../ui/button";
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
import { SubmitBountyModal } from "./SubmitBountyModal";
import { SubmitMultisigRfpModal } from "./SubmitMultisigRfpModal";

// Define modal view types for better clarity
type ModalView = null | {
  type:
    | "checking_balance"
    | "prompt_account"
    | "bounty_transaction_steps"
    | "multisig_transaction_steps";
};

const signerStepValidity$ = state(
  combineLatest({
    signerBalance: signerBalance$,
    estimatedCost: estimatedCost$,
    priceTotals: priceTotals$,
    formValue: formValue$,
    bountyBalance: formValue$.pipe(
      switchMap((form) =>
        form.isChildRfp && form.parentBountyId != null
          ? bountyById$(form.parentBountyId)
          : [null],
      ),
      map((v) => v?.balance ?? null),
    ),
  }).pipe(
    map(
      ({
        signerBalance,
        estimatedCost,
        priceTotals,
        formValue,
        bountyBalance,
      }) => {
        const feesAndDeposits =
          signerBalance && estimatedCost
            ? estimatedCost.deposits + estimatedCost.fees < signerBalance
            : false;
        const totalAmount = priceTotals
          ? BigInt(priceTotals.totalAmountWithBuffer * 10 ** TOKEN_DECIMALS)
          : null;
        const parentBounty = formValue.isChildRfp
          ? !!bountyBalance && !!totalAmount && bountyBalance > totalAmount
          : true;

        return {
          isValid: feesAndDeposits && parentBounty,
          signerBalance,
          estimatedCost,
          priceTotals,
          totalAmount,
          bountyBalance,
        };
      },
    ),
  ),
  null,
);

const [accountSelected$, onAccountSelected] = createSignal();
// This observable manages the modal's view state before transaction steps
const submitModal$ = state(
  merge(formDataChange$, dismiss$.pipe(map(() => null))).pipe(
    withLatestFrom(selectedAccount$),
    switchMap(([formData, selectedAccount]): ObservableInput<ModalView> => {
      if (!formData) return [null];

      const activeSubmissionModal$ = currencyIsStables$.pipe(
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

const PromptAccountModal = () => {
  const selectedAccount = useStateObservable(selectedAccount$);
  const validity = useStateObservable(signerStepValidity$);

  const renderSignerBalanceCheck = () => {
    if (!selectedAccount || !validity?.estimatedCost) return null;

    if (validity.signerBalance === null) {
      return (
        <div className="py-8 flex flex-col justify-center items-center space-y-2">
          <Loading />
          <p className="text-sm text-muted-foreground">
            Checking your available balance...
          </p>
        </div>
      );
    }

    if (
      validity.signerBalance >
      validity.estimatedCost.deposits + validity.estimatedCost.fees
    ) {
      return (
        <div className="poster-alert alert-success flex items-center gap-3">
          <CheckCircle2 size={20} className="shrink-0 text-lilypad" />
          <div className="text-sm">
            <strong>Nice:</strong> you have enough balance to launch the RFP 🚀
          </div>
        </div>
      );
    }

    return (
      <div className="poster-alert alert-error flex items-center gap-3">
        <TriangleAlert size={20} className="shrink-0" />
        <div className="text-sm">
          <strong>Uh-oh:</strong> not enough balance. Please add funds or select
          another wallet.
        </div>
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={(isOpen) => (isOpen ? null : dismiss())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Please connect a wallet to submit the RFP.
          </DialogDescription>
        </DialogHeader>
        <PickExtension />
        <PickExtensionAccount autoSelect />
        {renderSignerBalanceCheck()}
        <div className="text-right">
          <Button disabled={!validity?.isValid} onClick={onAccountSelected}>
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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

  // Fallback or should not be reached if modalStatus is always one of the above or null
  return null;
};

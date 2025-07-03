import { useStateObservable } from "@react-rxjs/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { dismiss } from "./modalActions";
import { StepBroadcastingTx } from "./StepBroadcastingTx";
import { StepFinish } from "./StepFinish";
import { StepSubmitTx } from "./StepSubmitTx";
import { activeMultisigRfpTxStep$, referendumIndex$ } from "./submit.state";
import { submitdecisionDeposit } from "./tx/decisionDeposit";
import { submitTreasurySpend } from "./tx/treasurySpend";

export const SubmitMultisigRfpModal = () => (
  <Dialog onOpenChange={(isOpen) => (isOpen ? null : dismiss())} open>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Submit RFP</DialogTitle>
        <DialogDescription>
          This is a two-step process: Submit the referendum, and place the
          decision deposit.
        </DialogDescription>
      </DialogHeader>
      <SubmitModalContent />
    </DialogContent>
  </Dialog>
);

const SubmitModalContent = () => {
  const activeTxStep = useStateObservable(activeMultisigRfpTxStep$);
  const refIdx = useStateObservable(referendumIndex$);

  if (!activeTxStep) return null;

  if (activeTxStep.type === "tx") {
    switch (activeTxStep.tag) {
      case "ref":
        return (
          <div className="space-y-2 overflow-hidden">
            <h3 className="text-sm font-bold">
              1. Submit the transaction to create the referendum
            </h3>
            <StepSubmitTx
              explanation={activeTxStep.value.explanation}
              submit={submitTreasurySpend}
            />
          </div>
        );
      case "decision":
        return (
          <div className="space-y-2 overflow-hidden">
            <h3 className="text-sm font-bold">
              2. Place the decision deposit on the referendum to start it
            </h3>
            <StepSubmitTx
              explanation={activeTxStep.value.explanation}
              submit={submitdecisionDeposit}
            />
          </div>
        );
    }
    return null;
  }

  if (activeTxStep.type === "submitting" || !activeTxStep.value.txEvent.ok) {
    return <StepBroadcastingTx txEvt={activeTxStep.value.txEvent} />;
  }

  return <StepFinish refIdx={refIdx} />;
};

import { matchedChain } from "@/chainRoute";
import { useStateObservable } from "@react-rxjs/core";
import { ExternalLink } from "../ExternalLink";
import { markdown$ } from "../RfpForm/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { dismiss } from "./modalActions";
import { StepBroadcastingTx } from "./StepBroadcastingTx";
import { StepSubmitTx } from "./StepSubmitTx";
import { activeChildBountyTxStep$ } from "./submit.state";
import {
  childBountyCreated$,
  nextChildBountyId$,
  submitChildBounty,
} from "./tx/childBounty";

export const SubmitChildBountyModal = () => (
  <Dialog onOpenChange={(isOpen) => (isOpen ? null : dismiss())} open>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Submit Child Bounty RFP</DialogTitle>
        <DialogDescription>
          Everything can be done in one transaction, but it might require a
          multi-signature.
        </DialogDescription>
      </DialogHeader>
      <SubmitModalContent />
    </DialogContent>
  </Dialog>
);

const SubmitModalContent = () => {
  const activeTxStep = useStateObservable(activeChildBountyTxStep$);
  const nextId = useStateObservable(nextChildBountyId$);
  const createdId = useStateObservable(childBountyCreated$);
  const bountyMarkdown = useStateObservable(markdown$);

  if (!activeTxStep) return null;

  if (activeTxStep.type === "tx") {
    if (activeTxStep.value.type === "unknown") {
      return (
        <div>
          Unfortunately, the curator - bounty relationship is not currently
          compatible with this tool.
        </div>
      );
    }

    if (activeTxStep.value.type === "multisig") {
      const subsquareUrl = `https://${matchedChain}.subsquare.io/treasury/child-bounties/${nextId}`;
      const multisigUrl = `https://multisig.usepapi.app/?chain=sm-${matchedChain}&calldata=${activeTxStep.value.callData}&signatories=${activeTxStep.value.signatories.join(
        "_",
      )}&threshold=${activeTxStep.value.threshold}`;
      return (
        <div className="space-y-2 overflow-hidden">
          <h3 className="text-sm font-bold">
            Submit the transaction to create the child bounty
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              This transaction has to be signed by all of the curators of the
              bounty.
            </p>
            <p>
              Share the link to the{" "}
              <ExternalLink href={multisigUrl}>PAPI Multisig tool</ExternalLink>{" "}
              with all of the curators to get it signed.
            </p>
            <p>
              After that's done, please go to{" "}
              <ExternalLink href={subsquareUrl}>Subsquare</ExternalLink> and
              fill the body of the RFP with the following body
            </p>
            <Textarea
              readOnly
              value={bountyMarkdown ?? ""}
              className="max-h-72"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2 overflow-hidden">
        <h3 className="text-sm font-bold">
          Submit the transaction to create the child bounty
        </h3>
        <StepSubmitTx
          explanation={activeTxStep.value.explanation}
          submit={submitChildBounty}
        />
      </div>
    );
  }

  if (activeTxStep.type === "submitting" || !activeTxStep.value.txEvent.ok) {
    return <StepBroadcastingTx txEvt={activeTxStep.value.txEvent} />;
  }

  const subsquareUrl = `https://${matchedChain}.subsquare.io/treasury/child-bounties/${createdId ?? nextId}`;
  return (
    <div className="space-y-2 overflow-hidden">
      <h3 className="text-sm font-bold">RFP submitted!</h3>
      <div>
        Please, edit the RFP in{" "}
        <ExternalLink href={subsquareUrl}>Subsquare</ExternalLink> or with the
        following body
      </div>
      <Textarea readOnly value={bountyMarkdown ?? ""} className="max-h-72" />
    </div>
  );
};

import { client } from "@/chain";
import { stringify } from "@/lib/json";
import { state, useStateObservable } from "@react-rxjs/core";
import { mergeWithKey } from "@react-rxjs/utils";
import { CircleCheck, OctagonAlert } from "lucide-react";
import { Transaction, TxEvent } from "polkadot-api";
import { FC, PropsWithChildren, useEffect } from "react";
import { filter, map, merge, of, switchMap, take, withLatestFrom } from "rxjs";
import { ExternalLink } from "../ExternalLink";
import { selectedAccount$ } from "../SelectAccount";
import { PickExtension } from "../SelectAccount/PickExtension";
import { PickExtensionAccount } from "../SelectAccount/PickExtensionAccount";
import { Spinner } from "../Spinner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import {
  activeTxStep$,
  bountyMarkdown$,
  dismiss,
  dismiss$,
  formDataChange$,
  submitBountyCreation,
  submitReferendumCreation,
  submittedFormData$,
} from "./submit.state";

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
  const bountyMarkdown = useStateObservable(bountyMarkdown$);

  if (!activeTxStep) return null;

  if (activeTxStep.type === "bountyTx") {
    return (
      <div className="space-y-2 overflow-hidden">
        <h3 className="text-sm font-bold">
          1. Submit the transaction to create the bounty
        </h3>
        <SubmitTxStep
          tx={activeTxStep.value.tx}
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
        <SubmitTxStep
          tx={activeTxStep.value.tx}
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
    return <BroadcastingTxStep txEvt={activeTxStep.value.txEvent} />;
  }

  return (
    <div className="space-y-2 overflow-hidden">
      <h3 className="text-sm font-bold">Referendum submitted!</h3>
      <div>
        Please, edit the referendum in{" "}
        <ExternalLink
          href={
            "https://kusama.subsquare.io/referenda/" +
            activeTxStep.value.referendum?.index
          }
        >
          Subsquare
        </ExternalLink>{" "}
        or{" "}
        <ExternalLink
          href={
            "https://kusama.polkassembly.io/referenda/" +
            activeTxStep.value.referendum?.index
          }
        >
          Polkassembly
        </ExternalLink>{" "}
        with the following body
      </div>
      <Textarea readOnly value={bountyMarkdown ?? ""} className="max-h-72" />
    </div>
  );
};

const SubmitTxStep: FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: Transaction<any, any, any, any>;
  submit: () => void;
}> = ({ tx, submit }) => {
  return (
    <div className="space-y-2">
      <Textarea
        className="max-h-72 font-mono text-xs"
        readOnly
        value={stringify(tx.decodedCall)}
      />
      <Button className="mx-auto" onClick={submit}>
        Sign and submit
      </Button>
    </div>
  );
};

const currentFinalized$ = state(client.finalizedBlock$, null);

const BroadcastingTxStep: FC<{
  txEvt: TxEvent | { type: "error"; err: unknown };
}> = ({ txEvt }) => {
  const finalized = useStateObservable(currentFinalized$);

  if (txEvt.type === "error" || (txEvt.type === "finalized" && !txEvt.ok)) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-destructive">
          <OctagonAlert /> the transaction failed. Please try again.
        </div>
        <Textarea
          className="max-h-72 font-mono text-xs"
          readOnly
          value={stringify("err" in txEvt ? txEvt.err : txEvt.dispatchError)}
        />
      </div>
    );
  }

  if (txEvt.type === "finalized") {
    return (
      <div className="flex items-center gap-2">
        <CircleCheck /> transaction succeeded!
      </div>
    );
  }

  return (
    <Loading>
      {txEvt.type === "signed"
        ? "Transaction signed, broadcasting…"
        : txEvt.type === "broadcasted"
        ? "Transaction broadcasted, waiting to be included in a block…"
        : "Transaction was found in a block, waiting for confirmation…" +
          (finalized && txEvt.found
            ? `(${txEvt.block.number - finalized.number})`
            : "")}
    </Loading>
  );
};

const Loading: FC<PropsWithChildren> = ({ children }) => (
  <div
    className={"flex items-center justify-center gap-2 text-muted-foreground"}
  >
    <Spinner />
    {children}
  </div>
);

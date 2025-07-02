import { client } from "@/chain";
import { stringify } from "@/lib/json";
import { state, useStateObservable } from "@react-rxjs/core";
import { CircleCheck, OctagonAlert } from "lucide-react";
import { TxEvent } from "polkadot-api";
import { FC } from "react";
import { Loading } from "../Spinner";
import { Textarea } from "../ui/textarea";

const currentFinalized$ = state(client.finalizedBlock$, null);

export const StepBroadcastingTx: FC<{
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

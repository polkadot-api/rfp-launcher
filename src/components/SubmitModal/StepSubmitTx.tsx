import { FC, PropsWithChildren } from "react";
import { Button } from "../ui/button";
import { TxExplanation } from "./tx/types";

export const StepSubmitTx: FC<
  PropsWithChildren<{
    explanation: TxExplanation;
    submit: () => void;
  }>
> = ({ explanation, submit, children }) => (
  <div className="space-y-2 overflow-hidden">
    <h3 className="text-sm font-bold">{children}</h3>
    <div className="space-y-2">
      <TxExplanationView explanation={explanation} />
      <Button className="mx-auto" onClick={submit}>
        Sign and submit
      </Button>
    </div>
  </div>
);

const TxExplanationView: FC<{ explanation: TxExplanation }> = ({
  explanation,
}) =>
  explanation.text === "batch" ? (
    <ol className="text-sm space-y-1 overflow-hidden">
      {Object.values(explanation.params ?? {}).map((param, i) => (
        <li key={i}>
          {typeof param === "string" ? (
            param
          ) : (
            <TxExplanationView explanation={param} />
          )}
        </li>
      ))}
    </ol>
  ) : (
    <div className="text-sm rounded border px-2 py-1 space-y-1 overflow-hidden">
      <div className="font-bold">{explanation.text}</div>
      <ul className="space-y-1">
        {Object.entries(explanation.params ?? {}).map(([key, value]) => (
          <li key={key} className="flex gap-1">
            <div className="font-medium">{key}:</div>
            {typeof value === "string" ? (
              <div className="overflow-hidden text-ellipsis">{value}</div>
            ) : (
              <TxExplanationView explanation={value} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );

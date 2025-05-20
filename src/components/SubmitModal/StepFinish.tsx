import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { ExternalLink } from "../ExternalLink";
import { Textarea } from "../ui/textarea";
import { bountyMarkdown$ } from "./tx/bountyCreation";

export const StepFinish: FC<{
  refIdx?: number;
}> = ({ refIdx }) => {
  const bountyMarkdown = useStateObservable(bountyMarkdown$);

  return (
    <div className="space-y-2 overflow-hidden">
      <h3 className="text-sm font-bold">Referendum submitted!</h3>
      <div>
        Please, edit the referendum in{" "}
        <ExternalLink href={"https://kusama.subsquare.io/referenda/" + refIdx}>
          Subsquare
        </ExternalLink>{" "}
        or{" "}
        <ExternalLink
          href={"https://kusama.polkassembly.io/referenda/" + refIdx}
        >
          Polkassembly
        </ExternalLink>{" "}
        with the following body
      </div>
      <Textarea readOnly value={bountyMarkdown ?? ""} className="max-h-72" />
    </div>
  );
};

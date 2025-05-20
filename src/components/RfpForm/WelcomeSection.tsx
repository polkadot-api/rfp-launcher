import { formatToken } from "@/lib/formatToken";
import { useStateObservable } from "@react-rxjs/core";
import { TriangleAlert } from "lucide-react";
import { FC } from "react";
import { openSelectAccount, selectedAccount$ } from "../SelectAccount";
import { Card, CardContent } from "../ui/card";
import { estimatedCost$, signerBalance$ } from "./data";

export const WelcomeSection: FC = () => {
  const estimatedCost = useStateObservable(estimatedCost$);
  const selectedAccount = useStateObservable(selectedAccount$);
  const currentBalance = useStateObservable(signerBalance$);

  const renderBalanceCheck = () => {
    if (estimatedCost == null) return null;
    if (!selectedAccount) {
      return (
        <>
          <button
            type="button"
            className="border border-primary rounded-full px-2 hover:bg-primary/5"
            onClick={openSelectAccount}
          >
            Connect your wallet
          </button>{" "}
          to check if you have sufficient balance.
        </>
      );
    }
    if (currentBalance == null) return null;

    if (currentBalance < estimatedCost) {
      return (
        <div>
          <TriangleAlert className="text-amber-600 inline-block" size={20} />
          You don't have enough balance in your wallet (
          {formatToken(currentBalance)}). Please, add funds or select another
          one.
        </div>
      );
    }
    return <>You have enough balance to launch the RFP 🚀</>;
  };

  return (
    <Card>
      <CardContent className="text-sm space-y-1">
        <p>
          This tool will guide you through all the steps to launch an RFP
          (Request for Proposal).
        </p>
        <p>
          After completing the form, you'll be prompted to submit two
          transactions to set up the RFP. The tool will then provide a
          pre-formatted RFP body, which you can copy and paste into the RFP
          referendum.
        </p>
        <p>
          Please note that you'll need a minimum of{" "}
          {estimatedCost ? (
            <b>{formatToken(estimatedCost)}</b>
          ) : (
            <span className="text-muted-foreground">(calculating…)</span>
          )}{" "}
          to submit the RFP. {renderBalanceCheck()}
        </p>
      </CardContent>
    </Card>
  );
};

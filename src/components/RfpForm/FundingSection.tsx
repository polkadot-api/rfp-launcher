import { formatToken } from "@/lib/formatToken";
import { useStateObservable } from "@react-rxjs/core";
import { TriangleAlert } from "lucide-react";
import { FC } from "react";
import { openSelectAccount, selectedAccount$ } from "../SelectAccount";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { estimatedCost$, signerBalance$ } from "./data";
import { FormInputField } from "./FormInputField";
import { RfpControlType } from "./formSchema";

export const FundingSection: FC<{ control: RfpControlType }> = ({
  control,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Funding</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <FormInputField
        control={control}
        name="prizePool"
        label="Prize Pool (USD)"
        description="Amount awarded to implementors"
      />
      <FormInputField
        control={control}
        name="findersFee"
        label="Finder's Fee (USD)"
        description="Amount awarded to the referral of the implementors"
      />
      <FormInputField
        control={control}
        name="supervisorsFee"
        label="Supervisors' Fee (USD)"
        description="Amount awarded split amongst the supervisors"
      />
      <BalanceCheck />
    </CardContent>
  </Card>
);

const BalanceCheck = () => {
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

    const totalCost = estimatedCost.deposits + estimatedCost.fees;

    if (currentBalance < totalCost) {
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
    <p>
      Please note that you'll need a minimum of{" "}
      {estimatedCost ? (
        <span>
          <b>{formatToken(estimatedCost.deposits + estimatedCost.fees)}</b> to
          submit the RFP ({formatToken(estimatedCost.fees)} in fees, you'll get{" "}
          {formatToken(estimatedCost.deposits)} in deposits back once the RFP
          ends)
        </span>
      ) : (
        <span className="text-muted-foreground">(calculating…)</span>
      )}
      . {renderBalanceCheck()}
    </p>
  );
};

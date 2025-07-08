"use client";

import { STABLE_INFO, TOKEN_SYMBOL } from "@/constants";
import { formatToken } from "@/lib/formatToken";
import { useStateObservable } from "@react-rxjs/core";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { type FC } from "react";
import { useWatch } from "react-hook-form";
import { openSelectAccount, selectedAccount$ } from "../SelectAccount";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { estimatedCost$, priceTotals$, signerBalance$ } from "./data";
import { FormInputField } from "./FormInputField";
import { type RfpControlType } from "./formSchema";
import { BountyCheck } from "./FundingBountyCheck";

export const FundingSection: FC<{ control: RfpControlType }> = ({
  control,
}) => {
  const isChildRfp = useWatch({ control, name: "isChildRfp" });

  return (
    <div className="poster-card">
      <h3 className="text-3xl font-medium mb-8 text-midnight-koi">Funding</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <FormInputField
          control={control}
          name="prizePool"
          label="Prize Pool (USD)"
          description="amount awarded to implementors"
          type="number"
        />
        <FormInputField
          control={control}
          name="findersFee"
          label="Finder's Fee (USD)"
          description="amount awarded to the referral"
          type="number"
        />
        <FormInputField
          control={control}
          name="supervisorsFee"
          label="Supervisors' Fee (USD)"
          description="amount split amongst supervisors"
          type="number"
        />
      </div>
      {STABLE_INFO && !isChildRfp ? (
        <div className="mb-8">
          <FormField
            control={control}
            name="fundingCurrency"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="poster-label">RFP Currency</FormLabel>
                <FormControl>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full data-[size=default]:h-auto">
                      <SelectValue placeholder="Choose a currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TOKEN_SYMBOL}>
                        {TOKEN_SYMBOL}
                      </SelectItem>
                      {Object.keys(STABLE_INFO!).map((symbol) => (
                        <SelectItem key={symbol} value={symbol}>
                          {symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription className="text-xs text-pine-shadow-60 leading-tight">
                  currency to use for the RFP. Native currency ({TOKEN_SYMBOL})
                  will be submitted through a bounty, stables (
                  {Object.keys(STABLE_INFO!).join("/")}) will create a multisig
                  instead.
                </FormDescription>
                <FormMessage className="text-tomato-stamp text-xs" />
              </FormItem>
            )}
          />
        </div>
      ) : null}
      <BalanceCheck control={control} />
    </div>
  );
};

const BalanceCheck: FC<{ control: RfpControlType }> = ({ control }) => {
  const isChild = useWatch({ control, name: "isChildRfp" });

  return (
    <div className="bg-canvas-cream border border-pine-shadow-20 rounded-lg p-6">
      <EstimatedSignerCost />
      <BalanceMessage />
      {isChild ? <BountyCheck control={control} /> : null}
    </div>
  );
};

const BalanceMessage = () => {
  const priceTotals = useStateObservable(priceTotals$);
  const estimatedCost = useStateObservable(estimatedCost$);
  const selectedAccount = useStateObservable(selectedAccount$);
  const currentBalance = useStateObservable(signerBalance$);

  if (!estimatedCost || !priceTotals?.totalAmount) return null;

  if (!selectedAccount) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          className="poster-btn btn-secondary py-1 px-3 text-sm"
          onClick={openSelectAccount}
        >
          Connect Wallet
        </button>
        <span className="text-pine-shadow text-sm">
          to check if you have sufficient balance.
        </span>
      </div>
    );
  }
  if (currentBalance == null) {
    // It's possible selectedAccount is set, but balance is still fetching
    return (
      <div className="text-pine-shadow-60 mt-2 text-sm">
        Fetching your balance...
      </div>
    );
  }

  // estimatedCost is confirmed non-null by the calling condition
  const totalCost = estimatedCost!.deposits + estimatedCost!.fees;

  if (currentBalance < totalCost) {
    return (
      <div className="poster-alert alert-error flex items-center gap-3 mt-2">
        <TriangleAlert size={20} className="shrink-0" />
        <div className="text-sm">
          <strong>Uh-oh:</strong> not enough balance (
          {formatToken(currentBalance)}). Please add funds or select another
          wallet.
        </div>
      </div>
    );
  }
  return (
    <div className="poster-alert alert-success flex items-center gap-3 mt-2">
      <CheckCircle2 size={20} className="shrink-0 text-lilypad" />
      <div className="text-sm">
        <strong>Nice:</strong> you have enough balance (
        {formatToken(currentBalance)}) to launch the RFP 🚀
      </div>
    </div>
  );
};

const EstimatedSignerCost = () => {
  const estimatedCost = useStateObservable(estimatedCost$);
  const ready = useStateObservable(priceTotals$)?.totalAmount ?? 0 > 0;

  return (
    <p className="text-pine-shadow leading-relaxed mb-4">
      Please note that you'll need a minimum of{" "}
      {ready ? (
        estimatedCost ? (
          <strong className="text-midnight-koi font-semibold">
            {formatToken(estimatedCost.deposits + estimatedCost.fees)}
          </strong>
        ) : (
          <span className="text-pine-shadow-60">
            (calculating based on inputs…)
          </span>
        )
      ) : (
        <span className="text-pine-shadow-60">
          (enter prize pool to see cost)
        </span>
      )}
      {ready && estimatedCost && (
        <>
          {" "}
          to submit the RFP
          {estimatedCost.deposits ? (
            <>
              {" "}
              ({formatToken(estimatedCost.fees)} in fees. You'll get{" "}
              {formatToken(estimatedCost.deposits)} in deposits back once the
              RFP ends)
            </>
          ) : null}
        </>
      )}
    </p>
  );
};

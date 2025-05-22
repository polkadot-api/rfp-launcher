import { REFERENDUM_PRICE_BUFFER } from "@/constants";
import { DeepPartialSkipArrayKey } from "react-hook-form";
import { FormSchema, parseNumber } from "../formSchema";
import { createSignal } from "@react-rxjs/utils";
import { state } from "@react-rxjs/core";

export const calculatePriceTotals = (
  formFields: DeepPartialSkipArrayKey<FormSchema>,
  conversionRate: number | null
) => {
  const totalAmount = [
    formFields.prizePool,
    formFields.findersFee,
    formFields.supervisorsFee,
  ]
    .map(parseNumber)
    .filter((v) => v != null)
    .reduce((a, b) => a + b, 0);
  const totalAmountToken = conversionRate ? totalAmount / conversionRate : null;
  const totalAmountWithBuffer = totalAmountToken
    ? Math.ceil(totalAmountToken * (1 + REFERENDUM_PRICE_BUFFER))
    : null;

  return { totalAmount, totalAmountToken, totalAmountWithBuffer };
};

export const [setBountyValue$, setBountyValue] = createSignal<number | null>();
export const bountyValue$ = state(setBountyValue$, null);

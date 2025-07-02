import { REFERENDUM_PRICE_BUFFER, STABLE_IDS } from "@/constants";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { DeepPartialSkipArrayKey } from "react-hook-form";
import { map } from "rxjs";
import { FormSchema, parseNumber } from "../formSchema";

export const calculatePriceTotals = (
  formFields: DeepPartialSkipArrayKey<FormSchema>,
  conversionRate: number | null,
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

export const [setBountyCurrency$, setBountyCurrency] = createSignal<
  string | null
>();
export const bountyCurrency$ = state(setBountyCurrency$, null);

export const currencyIsStables$ = state(
  bountyCurrency$.pipe(map((currency) => !!STABLE_IDS?.[currency ?? ""])),
  false,
);

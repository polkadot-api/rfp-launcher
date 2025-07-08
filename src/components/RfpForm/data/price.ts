import {
  REFERENDUM_PRICE_BUFFER,
  STABLE_INFO,
  TOKEN_DECIMALS,
} from "@/constants";
import { currencyRate$ } from "@/services/currencyRate";
import { state, withDefault } from "@react-rxjs/core";
import { combineLatest, map } from "rxjs";
import { parseNumber } from "../formSchema";
import { formValue$ } from "./formValue";

const calculatePriceTotals = (
  values: (string | number)[],
  conversionRate: number,
) => {
  const totalAmount = values
    .map(parseNumber)
    .filter((v) => v !== null)
    .reduce((a, b) => a + b, 0);
  const totalAmountToken = totalAmount / conversionRate;
  const totalAmountWithBuffer = Math.ceil(
    totalAmountToken * (1 + REFERENDUM_PRICE_BUFFER),
  );

  return { totalAmount, totalAmountToken, totalAmountWithBuffer };
};

export const priceToChainAmount = (value: number) =>
  BigInt(Math.round(value * 10 ** TOKEN_DECIMALS));

export const priceTotals$ = state(
  combineLatest({
    formValue: formValue$,
    rate: currencyRate$,
  }).pipe(
    map(({ formValue, rate }) => {
      if (
        formValue.prizePool == null ||
        formValue.findersFee == null ||
        formValue.supervisorsFee == null ||
        rate == null
      )
        return null;

      const r = calculatePriceTotals(
        [formValue.prizePool, formValue.findersFee, formValue.supervisorsFee],
        rate,
      );
      return r;
    }),
  ),
  null,
);

export const bountyCurrency$ = formValue$.pipeState(
  map((value) => value.fundingCurrency ?? null),
  withDefault(null),
);

export const currencyIsStables$ = bountyCurrency$.pipeState(
  map((currency) => !!STABLE_INFO?.[currency ?? ""]),
  withDefault(false),
);

export const bountyValue$ = state(
  combineLatest({
    priceTotals: priceTotals$,
    isStable: currencyIsStables$,
    isChild: formValue$.pipe(map((v) => v?.isChildRfp ?? false)),
  }).pipe(
    map(({ priceTotals, isStable, isChild }) => {
      if (!priceTotals || isStable == null) return null;

      return isStable
        ? priceTotals.totalAmount
        : isChild
          ? priceTotals.totalAmountToken
          : priceTotals.totalAmountWithBuffer;
    }),
  ),
  null,
);

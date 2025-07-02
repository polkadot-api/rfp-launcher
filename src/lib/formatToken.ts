import { TOKEN_DECIMALS, TOKEN_SYMBOL } from "@/constants";

export const formatToken = (value: bigint | null | undefined) => {
  if (value == null) return "";

  return `${(Number(value) / 10 ** TOKEN_DECIMALS).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  })} ${TOKEN_SYMBOL}`;
};

export const formatCurrency = (
  value: number | null | undefined,
  symbol: string,
  maximumFractionDigits = 2,
) => {
  if (value == null) return "";

  const valueStr = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });

  if (symbol === "$") return `$${valueStr}`;
  return `${valueStr} ${symbol}`;
};

export const formatUsd = (value: number | null | undefined) =>
  formatCurrency(value, "$");

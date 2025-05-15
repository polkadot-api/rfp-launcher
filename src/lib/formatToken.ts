import { TOKEN_DECIMALS, TOKEN_SYMBOL } from "@/constants";

export const formatToken = (value: bigint | null | undefined) => {
  if (value == null) return "";

  return `${(Number(value) / 10 ** TOKEN_DECIMALS).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  })} ${TOKEN_SYMBOL}`;
};

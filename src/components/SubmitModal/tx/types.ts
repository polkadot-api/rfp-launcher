import { Transaction } from "polkadot-api";

export type TxExplanation = {
  text: string;
  params?: Record<string | number, string | TxExplanation>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTx = Transaction<any, any, any, any>;
export type TxWithExplanation = {
  tx: AnyTx;
  explanation: TxExplanation;
};

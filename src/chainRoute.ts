export type KnownChains = "polkadot" | "kusama";
const knownChains: Array<KnownChains> = ["polkadot", "kusama"];

const params = new URLSearchParams(location.search);
const paramChain = params.get("chain") as KnownChains;

export const matchedChain: KnownChains = knownChains.includes(paramChain)
  ? paramChain
  : "kusama";

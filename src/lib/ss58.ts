import { AccountId, getSs58AddressInfo, SS58String } from "polkadot-api";

export const sliceMiddleAddr = (s: string) => s.slice(0, 6) + "…" + s.slice(-6);

export const getPublicKey = (addr: SS58String) => {
  const info = getSs58AddressInfo(addr);
  if (!info.isValid) throw new Error("Invalid SS58 Address");
  return info.publicKey;
};

export const accId = AccountId();

/**
 * Only to be used to compare for account id equality.
 */
export const genericSs58 = (value: SS58String) => accId.dec(accId.enc(value));

import { Binary } from "polkadot-api";

export const stringify = (value: unknown) =>
  JSON.stringify(
    value,
    (_, v) =>
      typeof v === "bigint"
        ? `${v}n`
        : v instanceof Binary
        ? bytesToString(v)
        : v,
    2
  );

const textDecoder = new TextDecoder("utf-8", { fatal: true });
const bytesToString = (value: Binary) => {
  try {
    const bytes = value.asBytes();
    if (bytes.slice(0, 5).every((b) => b < 32)) throw null;
    return textDecoder.decode(bytes);
  } catch (_) {
    return value.asHex();
  }
};

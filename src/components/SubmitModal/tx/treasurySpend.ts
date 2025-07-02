import { typedApi } from "@/chain";
import { AccountId, Binary, Enum, SS58String } from "polkadot-api";

export const createSpendCall = (
  amount: bigint,
  currencyId: bigint,
  beneficiary: SS58String,
) =>
  typedApi.tx.Treasury.spend({
    amount,
    valid_from: undefined,
    asset_kind: Enum("V5", {
      location: {
        parents: 0,
        interior: Enum("X1", Enum("Parachain", 1000)),
      },
      asset_id: {
        parents: 0,
        interior: Enum("X2", [
          Enum("PalletInstance", 50),
          Enum("GeneralIndex", currencyId),
        ]),
      },
    }),
    beneficiary: Enum("V5", {
      parents: 0,
      interior: Enum(
        "X1",
        Enum("AccountId32", {
          network: undefined,
          id: Binary.fromBytes(AccountId().enc(beneficiary)),
        }),
      ),
    }),
  });

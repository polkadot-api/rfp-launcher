import { referendaSdk, typedApi } from "@/chain";
import {
  formatTrackName,
  getTrack,
} from "@/components/RfpForm/data/referendaConstants";
import { STABLE_INFO, TOKEN_DECIMALS } from "@/constants";
import { accId } from "@/lib/ss58";
import { getMultisigAccountId } from "@polkadot-api/substrate-bindings";
import { state } from "@react-rxjs/core";
import { Binary, Enum, SS58String } from "polkadot-api";
import { combineLatest, filter, map, switchMap } from "rxjs";
import { dismissable, submittedFormData$ } from "../modalActions";
import { createTxProcess } from "./txProcess";
import { TxWithExplanation } from "./types";

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
          id: Binary.fromBytes(accId.enc(beneficiary)),
        }),
      ),
    }),
  });

export const treasurySpendTx$ = state(
  submittedFormData$.pipe(
    switchMap((formData) => {
      if (!formData) return [null];

      const destAddr =
        formData.supervisors.length > 1
          ? accId.dec(
              getMultisigAccountId({
                threshold: formData.signatoriesThreshold,
                signatories: formData.supervisors.map((v) => accId.enc(v)),
              }),
            )
          : formData.supervisors[0];
      if (!destAddr) {
        console.error("Supervisors was empty??", {
          supervisors: formData.supervisors,
        });
        return [null];
      }

      // It must be a stable coin
      const currencyInfo = STABLE_INFO?.[formData.fundingCurrency] ?? null;
      if (currencyInfo == null) {
        console.error("Not a stable??", {
          stableInfo: STABLE_INFO,
          currency: formData.fundingCurrency,
        });
        return [null];
      }
      const totalAmount = [
        formData.findersFee,
        formData.prizePool,
        formData.supervisorsFee,
      ].reduce((a, b) => a + b);
      const amountBig = BigInt(
        Math.round(totalAmount * Math.pow(10, currencyInfo.decimals)),
      );

      const spendCall: TxWithExplanation = {
        tx: createSpendCall(amountBig, currencyInfo.id, destAddr),
        explanation: {
          text: "Treasury spend",
          params: {
            amount: `${totalAmount.toLocaleString()} ${formData.fundingCurrency}`,
            dest: destAddr,
          },
        },
      };

      // The track for stables is the value in the native currency divided by 10
      // (as it assumes 1 DOT = 10 USD)
      const trackAmount = BigInt(
        Math.round(totalAmount * Math.pow(10, TOKEN_DECIMALS - 1)),
      );
      return combineLatest([
        getTrack(trackAmount),
        spendCall.tx.getEncodedData(),
      ]).pipe(
        map(
          ([track, proposal]): TxWithExplanation => ({
            tx: referendaSdk.createReferenda(track.origin, proposal),
            explanation: {
              text: "Create referendum",
              params: {
                track: formatTrackName(track.track.name),
                call: spendCall.explanation,
              },
            },
          }),
        ),
        dismissable(),
      );
    }),
  ),
  null,
);

export const [treasurySpendProcess$, submitTreasurySpend] = createTxProcess(
  treasurySpendTx$.pipe(map((v) => v?.tx ?? null)),
);

export const treasurySpendRfpReferendum$ = state(
  treasurySpendProcess$.pipe(
    filter((v) => v?.type === "finalized" && v.ok),
    switchMap(async (v) => {
      const referendum = referendaSdk.getSubmittedReferendum(v);
      if (!referendum) {
        throw new Error("Submitted referendum could not be found");
      }
      return referendum;
    }),
  ),
  // unfortunately, we can't know for sure if a referenda already existed, as it
  // might be any treasury.spend stables that's pending placing a decision deposit
);

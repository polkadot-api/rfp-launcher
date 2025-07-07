import { typedApi } from "@/chain";
import { bountyById$ } from "@/components/RfpForm/FundingBountyCheck";
import { MultiAddress } from "@polkadot-api/descriptors";
import { NestedLinkedAccountsResult } from "@polkadot-api/sdk-accounts";
import { state } from "@react-rxjs/core";
import { Binary, HexString, SS58String } from "polkadot-api";
import { combineLatest, filter, map, ObservableInput, switchMap } from "rxjs";
import { submittedFormData$ } from "../modalActions";
import { AnyTx, TxExplanation, TxWithExplanation } from "./types";
import { priceTotals$ } from "@/components/RfpForm/data";
import { TOKEN_DECIMALS } from "@/constants";
import { createTxProcess } from "./txProcess";
import { formatToken } from "@/lib/formatToken";

const totalAmount$ = () =>
  priceTotals$.pipe(
    map((v) => v?.totalAmountWithBuffer ?? null),
    filter((v) => v != null),
    map((v) => BigInt(Math.round(v * Math.pow(10, TOKEN_DECIMALS)))),
  );

type TransactionWithConfig =
  | {
      type: "direct";
      tx: AnyTx;
      explanation: TxExplanation;
    }
  | {
      type: "multisig";
      signatories: SS58String[];
      threshold: number;
      callData: HexString;
      tx: AnyTx;
      explanation: TxExplanation;
    }
  | { type: "unknown" };

export const nextChildBountyId$ = state(
  submittedFormData$.pipe(
    switchMap((formData) =>
      formData?.parentBountyId
        ? typedApi.query.ChildBounties.ParentTotalChildBounties.getValue(
            formData.parentBountyId,
          ).then((id) => `${formData.parentBountyId}_${id}`)
        : [null],
    ),
  ),
  null,
);

export const childBountyTx$ = state(
  submittedFormData$.pipe(
    switchMap((formData) => {
      if (formData?.parentBountyId == null) return [null];

      type SignerConfiguration =
        | {
            type: "direct";
            txTransform: (tx: AnyTx) => AnyTx;
          }
        | {
            type: "multisig";
            signatories: SS58String[];
            threshold: number;
            txTransform: (tx: AnyTx) => AnyTx;
          }
        | { type: "unknown" };

      const signerConfiguration$ = bountyById$(formData.parentBountyId).pipe(
        map(({ curator, nestedLinkedAccounts }): SignerConfiguration => {
          const getConfiguration = (
            address: SS58String,
            result: NestedLinkedAccountsResult,
          ): SignerConfiguration => {
            if (result.type === "root") {
              return {
                type: "direct",
                txTransform: (tx) => tx,
              };
            }

            // Covering the 99.999% scenario: a simple pure proxy + multisig curator.
            // We don't want to overcomplicate this.
            if (
              result.type === "proxy" &&
              result.value.accounts[0].linkedAccounts
            ) {
              const inner = getConfiguration(
                result.value.accounts[0].address,
                result.value.accounts[0].linkedAccounts,
              );
              if (inner.type === "unknown") return inner;

              const txTransform = (tx: AnyTx) =>
                inner.txTransform(
                  typedApi.tx.Proxy.proxy({
                    real: MultiAddress.Id(address),
                    call: tx.decodedCall,
                    force_proxy_type: undefined,
                  }),
                );
              return {
                ...inner,
                txTransform,
              };
            }

            if (result.type === "multisig") {
              return {
                type: "multisig",
                signatories: result.value.accounts.map((v) => v.address),
                threshold: result.value.threshold,
                txTransform: (tx) => tx,
              };
            }

            return {
              type: "unknown",
            };
          };

          return getConfiguration(curator, nestedLinkedAccounts);
        }),
      );

      const createChildBountyTx$ = totalAmount$().pipe(
        map(
          (totalAmount): TxWithExplanation => ({
            tx: typedApi.tx.ChildBounties.add_child_bounty({
              value: totalAmount,
              parent_bounty_id: formData.parentBountyId!,
              description: Binary.fromText(formData.projectTitle),
            }),
            explanation: {
              text: "Create child bounty",
              params: {
                amount: formatToken(totalAmount),
              },
            },
          }),
        ),
      );

      return combineLatest([signerConfiguration$, createChildBountyTx$]).pipe(
        map(([signerConfig, { tx, explanation }]) => {
          if (signerConfig.type === "unknown") return signerConfig;

          return {
            ...signerConfig,
            tx: signerConfig.txTransform(tx),
            explanation,
          };
        }),
        switchMap(
          (info): ObservableInput<TransactionWithConfig> =>
            info.type === "multisig"
              ? info.tx.getEncodedData().then((callData) => ({
                  ...info,
                  callData: callData.asHex(),
                }))
              : [info],
        ),
      );
    }),
  ),
  null,
);

export const [childBountyProcess$, submitChildBounty] = createTxProcess(
  childBountyTx$.pipe(
    map((v) => (v?.type === "unknown" ? null : (v?.tx ?? null))),
  ),
);

export const childBountyCreated$ = state(
  childBountyProcess$.pipe(
    filter((v) => v?.type === "finalized" && v.ok),
    switchMap(async (v) => {
      const addedChildBounties = typedApi.event.ChildBounties.Added.filter(
        v.events,
      );
      if (!addedChildBounties) {
        return null;
      }

      const { index, child_index } = addedChildBounties[0];

      return `${index}_${child_index}`;
    }),
  ),
  null,
);

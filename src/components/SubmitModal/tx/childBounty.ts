import { typedApi } from "@/chain";
import { priceToChainAmount } from "@/components/RfpForm/data/price";
import { bountyById$ } from "@/components/RfpForm/FundingBountyCheck";
import { formatToken } from "@/lib/formatToken";
import { genericSs58 } from "@/lib/ss58";
import { currencyRate$ } from "@/services/currencyRate";
import { MultiAddress } from "@polkadot-api/descriptors";
import { NestedLinkedAccountsResult } from "@polkadot-api/sdk-accounts";
import { state } from "@react-rxjs/core";
import { Binary, HexString, SS58String } from "polkadot-api";
import { combineLatest, filter, map, ObservableInput, switchMap } from "rxjs";
import { submittedFormData$ } from "../modalActions";
import { getMultisigAddress } from "./referendumCreation";
import { createTxProcess } from "./txProcess";
import { AnyTx, TxExplanation, TxWithExplanation } from "./types";

const tokenAmounts$ = combineLatest({
  formValue: submittedFormData$.pipe(filter((v) => v != null)),
  rate: currencyRate$.pipe(filter((v) => v != null)),
}).pipe(
  map(({ formValue, rate }) => ({
    prizePool: priceToChainAmount(formValue.prizePool / rate),
    findersFee: priceToChainAmount(formValue.findersFee / rate),
    supervisorsFee: priceToChainAmount(formValue.supervisorsFee / rate),
  })),
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

export const createChildBountyTx = ({
  mainChildBountyAmount,
  mainChildBountyFee,
  findersBountyAmount,
  findersBountyFee,
  parentId,
  nextId,
  title,
  curator,
  isParentCurator,
}: {
  mainChildBountyAmount: bigint;
  mainChildBountyFee: bigint;
  findersBountyAmount: bigint;
  findersBountyFee: bigint;
  parentId: number;
  nextId: number;
  title: string;
  curator: SS58String;
  isParentCurator: boolean;
}): TxWithExplanation => {
  const transactions: TxWithExplanation[] = [
    {
      tx: typedApi.tx.ChildBounties.add_child_bounty({
        value: mainChildBountyAmount,
        parent_bounty_id: parentId,
        description: Binary.fromText(title),
      }),
      explanation: {
        text: "Create child bounty",
        params: {
          amount: formatToken(mainChildBountyAmount),
        },
      },
    },
    {
      tx: typedApi.tx.ChildBounties.propose_curator({
        fee: mainChildBountyFee,
        parent_bounty_id: parentId,
        child_bounty_id: nextId,
        curator: MultiAddress.Id(curator),
      }),
      explanation: {
        text: "Assign supervisor to child bounty",
        params: {
          curator: curator,
          fee: formatToken(mainChildBountyFee),
        },
      },
    },
    // Adding a second child bounty for finders' fee
    ...(findersBountyAmount
      ? [
          {
            tx: typedApi.tx.ChildBounties.add_child_bounty({
              value: findersBountyAmount,
              parent_bounty_id: parentId,
              description: Binary.fromText(title + " (finder's fee)"),
            }),
            explanation: {
              text: "Create finder's child bounty",
              params: {
                amount: formatToken(findersBountyAmount),
              },
            },
          },
          {
            tx: typedApi.tx.ChildBounties.propose_curator({
              fee: findersBountyFee,
              parent_bounty_id: parentId,
              child_bounty_id: nextId + 1,
              curator: MultiAddress.Id(curator),
            }),
            explanation: {
              text: "Assign supervisor to finder's child bounty",
              params: {
                curator: curator,
                fee: formatToken(findersBountyFee),
              },
            },
          },
        ]
      : []),
    ...(isParentCurator
      ? [
          {
            tx: typedApi.tx.ChildBounties.accept_curator({
              parent_bounty_id: parentId,
              child_bounty_id: nextId,
            }),
            explanation: {
              text: "Accept supervisor role of child rfp",
            },
          },
          ...(findersBountyAmount
            ? [
                {
                  tx: typedApi.tx.ChildBounties.accept_curator({
                    parent_bounty_id: parentId,
                    child_bounty_id: nextId + 1,
                  }),
                  explanation: {
                    text: "Accept supervisor role of finder's fee rfp",
                  },
                },
              ]
            : []),
        ]
      : []),
  ];

  return {
    tx: typedApi.tx.Utility.batch_all({
      calls: transactions.map((t) => t.tx.decodedCall),
    }),
    explanation: {
      text: "batch",
      params: Object.fromEntries(
        transactions.map((t, i) => [i, t.explanation]),
      ),
    },
  };
};

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

      const parentBounty$ = bountyById$(formData.parentBountyId);
      const signerConfiguration$ = parentBounty$.pipe(
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

      const curatorAddr =
        formData.supervisors.length === 1
          ? formData.supervisors[0]
          : getMultisigAddress(formData);

      const curatorIsParentBountyCurator$ = parentBounty$.pipe(
        map(
          (parentBounty) =>
            genericSs58(curatorAddr) === genericSs58(parentBounty.curator),
        ),
      );

      const createChildBountyTx$ = combineLatest([
        tokenAmounts$,
        nextChildBountyId$.pipe(filter((v) => v != null)),
        curatorIsParentBountyCurator$,
      ]).pipe(
        map(([tokenAmounts, nextId, isParentCurator]): TxWithExplanation => {
          const childId = Number(nextId.split("_")[1]);

          // The curator fee subtracts from the child bounty amount.
          const mainChildBountyAmount =
            tokenAmounts.prizePool + tokenAmounts.supervisorsFee;
          const mainChildBountyFee = tokenAmounts.supervisorsFee;
          const findersBountyAmount = tokenAmounts.findersFee;
          const findersBountyFee = 0n;

          return createChildBountyTx({
            curator: curatorAddr!,
            findersBountyAmount,
            findersBountyFee,
            isParentCurator,
            mainChildBountyAmount,
            mainChildBountyFee,
            nextId: childId,
            parentId: formData.parentBountyId!,
            title: formData.projectTitle,
          });
        }),
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

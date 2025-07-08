"use client";

import {
  estimatedCost$,
  priceToChainAmount,
  priceTotals$,
  signerBalance$,
} from "@/components/RfpForm/data";
import { genericSs58 } from "@/lib/ss58";
import { SelectGroup } from "@radix-ui/react-select";
import { state, useStateObservable } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { combineLatest, map, switchMap } from "rxjs";
import { formValue$ } from "../RfpForm/data/formValue";
import { bounties$, bountyById$ } from "../RfpForm/FundingBountyCheck";
import { selectedAccount$ } from "../SelectAccount";
import { PickExtension } from "../SelectAccount/PickExtension";
import { PickExtensionAccount } from "../SelectAccount/PickExtensionAccount";
import { Loading } from "../Spinner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { dismiss, submit, submittedFormData$ } from "./modalActions";

export const signerStepValidity$ = state(
  combineLatest({
    selectedAccount: selectedAccount$,
    signerBalance: signerBalance$,
    estimatedCost: estimatedCost$,
    priceTotals: priceTotals$,
    formValue: formValue$,
    bounty: formValue$.pipe(
      switchMap((form) =>
        form.isChildRfp && form.parentBountyId != null
          ? bountyById$(form.parentBountyId)
          : [null],
      ),
    ),
  }).pipe(
    map(
      ({
        selectedAccount,
        signerBalance,
        estimatedCost,
        priceTotals,
        formValue,
        bounty,
      }) => {
        const bountyBalance = bounty?.balance ?? null;
        const bountySigners = bounty?.signers ?? null;
        const accountGenericSs58 = selectedAccount
          ? genericSs58(selectedAccount.address)
          : null;

        const feesAndDeposits =
          signerBalance && estimatedCost
            ? estimatedCost.deposits + estimatedCost.fees < signerBalance
            : false;
        const totalAmount = priceTotals
          ? priceToChainAmount(priceTotals.totalAmountToken)
          : null;
        const parentBounty = formValue.isChildRfp
          ? !!bountyBalance &&
            !!bountySigners &&
            !!accountGenericSs58 &&
            !!totalAmount &&
            bountyBalance > totalAmount &&
            bountySigners.includes(accountGenericSs58)
          : true;

        return {
          isValid: feesAndDeposits && parentBounty,
          signerBalance,
          estimatedCost,
          priceTotals,
          totalAmount,
          accountGenericSs58,
          bountyBalance,
          bountySigners,
        };
      },
    ),
  ),
  null,
);

export const [accountSelected$, onAccountSelected] = createSignal();

export const PromptAccountModal = () => {
  const formValue = useStateObservable(formValue$);
  const validity = useStateObservable(signerStepValidity$);

  const renderSignerBalanceCheck = () => {
    if (!validity?.accountGenericSs58 || !validity?.estimatedCost) return null;

    if (validity.signerBalance === null) {
      return (
        <div className="py-8 flex flex-col justify-center items-center space-y-2">
          <Loading />
          <p className="text-sm text-muted-foreground">
            Checking your available balance...
          </p>
        </div>
      );
    }

    if (
      validity.signerBalance >
      validity.estimatedCost.deposits + validity.estimatedCost.fees
    ) {
      return null;
    }

    return (
      <div className="text-tomato-stamp text-sm -mt-2">
        The selected account doesn't have enough balance.
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={(isOpen) => (isOpen ? null : dismiss())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Please connect a wallet to submit the RFP.
          </DialogDescription>
        </DialogHeader>
        <PickExtension />
        <PickExtensionAccount autoSelect />
        {renderSignerBalanceCheck()}
        {formValue.isChildRfp ? <PromptParentBounty /> : null}
        <div className="text-right">
          <Button disabled={!validity?.isValid} onClick={onAccountSelected}>
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PromptParentBounty = () => {
  const formValue = useStateObservable(submittedFormData$);
  const bounties = useStateObservable(bounties$);
  const validity = useStateObservable(signerStepValidity$);

  if (!formValue) return null;

  const signerBounties = bounties.filter((b) =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    b.signers.includes(validity?.accountGenericSs58!),
  );

  const value = signerBounties.some((v) => v.id === formValue.parentBountyId)
    ? formValue.parentBountyId
    : null;

  const renderBountyBalanceCheck = () => {
    if (!validity?.bountySigners || !validity.totalAmount) return null;
    if (!validity.bountySigners.includes(validity.accountGenericSs58!))
      return null;

    if (validity.bountyBalance === null) {
      return (
        <div className="py-8 flex flex-col justify-center items-center space-y-2">
          <Loading />
          <p className="text-sm text-muted-foreground">
            Checking for the bounty balance balance...
          </p>
        </div>
      );
    }

    if (validity.bountyBalance > validity.totalAmount) {
      return null;
    }

    return (
      <div className="text-tomato-stamp text-sm">
        The selected bounty doesn't have enough balance.
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-sm">Select the parent bounty</p>
      <Select
        value={String(value ?? "")}
        onValueChange={(v) =>
          submit({ ...formValue, parentBountyId: Number(v) })
        }
      >
        <SelectTrigger className="w-full data-[size=default]:h-auto">
          <SelectValue placeholder="Choose a bounty" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {signerBounties.length ? (
              signerBounties.map((bounty) => (
                <SelectItem key={bounty.id} value={String(bounty.id)}>
                  {bounty.id}. {bounty.description}
                </SelectItem>
              ))
            ) : (
              <SelectLabel className="font-bold">
                The account you selected doesn't seem to have a curator role for
                any of the bounties.
              </SelectLabel>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
      {renderBountyBalanceCheck()}
    </div>
  );
};

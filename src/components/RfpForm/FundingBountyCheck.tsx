import { typedApi } from "@/chain";
import { matchedChain } from "@/chainRoute";
import { formatToken } from "@/lib/formatToken";
import { accId } from "@/lib/ss58";
import {
  createLinkedAccountsSdk,
  NestedLinkedAccountsResult,
  novasamaProvider,
} from "@polkadot-api/sdk-accounts";
import { createBountiesSdk } from "@polkadot-api/sdk-governance";
import { state, useStateObservable } from "@react-rxjs/core";
import { combineKeys, partitionByKey } from "@react-rxjs/utils";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { SS58String } from "polkadot-api";
import { useMemo, type FC } from "react";
import { useWatch } from "react-hook-form";
import {
  combineLatest,
  concatWith,
  defer,
  filter,
  map,
  mergeAll,
  mergeMap,
  NEVER,
  take,
} from "rxjs";
import { selectedAccount$ } from "../SelectAccount";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { priceToChainAmount, priceTotals$ } from "./data";
import { type RfpControlType } from "./formSchema";

const bountiesSdk = createBountiesSdk(typedApi);
const linkedAccountsSdk = createLinkedAccountsSdk(
  typedApi,
  novasamaProvider(matchedChain),
);

export const [bountyById$, bountyKeys$] = partitionByKey(
  defer(bountiesSdk.getBounties).pipe(
    mergeAll(),
    filter((v) => v.type === "Active"),
  ),
  (b) => b.id,
  (bounty$) =>
    combineLatest({
      bounty: bounty$,
      signers: bounty$.pipe(
        take(1),
        mergeMap((bounty) =>
          linkedAccountsSdk.getNestedLinkedAccounts$(bounty.curator),
        ),
        map((signers) => {
          const flatten = (
            res: NestedLinkedAccountsResult | null,
          ): SS58String[] =>
            res
              ? [
                  ...(res.type === "root"
                    ? []
                    : res.value.accounts.flatMap((acc) => [
                        acc.address,
                        ...flatten(acc.linkedAccounts),
                      ])),
                ]
              : [];
          return {
            signers: flatten(signers).map((v) => accId.dec(accId.enc(v))),
            nestedLinkedAccounts: signers,
          };
        }),
      ),
      balance: bounty$.pipe(
        take(1),
        mergeMap((bounty) =>
          typedApi.query.System.Account.getValue(bounty.account),
        ),
        map((account) => account.data.free),
      ),
    }).pipe(
      filter(({ bounty }) => bounty.description != null),
      map(
        ({ bounty, signers: { signers, nestedLinkedAccounts }, balance }) => ({
          ...bounty,
          signers,
          nestedLinkedAccounts,
          balance,
        }),
      ),
      // prevent the observable from completing, as that would signal `partitionByKey` to remove this item
      concatWith(NEVER),
    ),
);
export const bounties$ = state(
  combineKeys(bountyKeys$, bountyById$).pipe(
    map((bounties) => Array.from(bounties.values())),
  ),
  [],
);

export const BountyCheck: FC<{
  control: RfpControlType;
}> = ({ control }) => {
  const priceTotals = useStateObservable(priceTotals$);
  const bounties = useStateObservable(bounties$);
  const account = useStateObservable(selectedAccount$);
  const selectedBountyId = useWatch({
    control,
    name: "parentBountyId",
  });
  const bounty = bounties.find((b) => b.id === selectedBountyId);

  const [accountBounties, sortedBounties] = useMemo(() => {
    const allSortedBounties = bounties.sort((a, b) => a.id - b.id);

    const [accountBounties, sortedBounties] = account
      ? [
          allSortedBounties.filter((b) =>
            b.signers.includes(accId.dec(accId.enc(account.address))),
          ),
          allSortedBounties.filter(
            (b) => !b.signers.includes(accId.dec(accId.enc(account.address))),
          ),
        ]
      : [[], allSortedBounties];

    return [accountBounties, sortedBounties];
  }, [bounties, account]);

  if (!account) return null;

  const accountIsCurator =
    bounty?.signers.includes(accId.dec(accId.enc(account.address))) ?? null;

  const renderBalanceCheck = () => {
    if (selectedBountyId == null || !priceTotals || !bounty) return null;

    const totalCost = priceToChainAmount(priceTotals.totalAmountToken);

    if (bounty.balance < totalCost) {
      return (
        <div className="poster-alert alert-error flex items-center gap-3 mt-2">
          <TriangleAlert size={20} className="shrink-0" />
          <div className="text-sm">
            The bounty doesn't have enough balance (
            {formatToken(bounty.balance)}) for this child RFP (
            {formatToken(totalCost)}).
          </div>
        </div>
      );
    }
    return (
      <div className="poster-alert alert-success flex items-center gap-3 mt-2">
        <CheckCircle2 size={20} className="shrink-0 text-lilypad" />
        <div className="text-sm">
          The bounty has enough balance ({formatToken(bounty.balance)}) to
          launch the child RFP ({formatToken(totalCost)})
        </div>
      </div>
    );
  };

  return (
    <div>
      <FormField
        control={control}
        name="parentBountyId"
        render={({ field }) => (
          <FormItem className="space-y-2 mt-4">
            <FormLabel className="poster-label">Parent Bounty</FormLabel>
            <FormControl>
              <Select
                value={String(field.value ?? "")}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <SelectTrigger className="w-full data-[size=default]:h-auto">
                  <SelectValue placeholder="Choose a bounty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Your bounties</SelectLabel>
                    {accountBounties.length ? (
                      accountBounties.map((bounty) => (
                        <SelectItem key={bounty.id} value={String(bounty.id)}>
                          {bounty.id}. {bounty.description}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectLabel className="font-bold">
                        The account you selected doesn't seem to have a curator
                        role for any of the bounties. You will need to sign it
                        with a curator account.
                      </SelectLabel>
                    )}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Active bounties</SelectLabel>
                    {sortedBounties.map((bounty) => (
                      <SelectItem key={bounty.id} value={String(bounty.id)}>
                        {bounty.id}. {bounty.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormControl>
            <FormDescription className="text-xs text-pine-shadow-60 leading-tight">
              Select the parent bounty to check whether it has enough funds for
              this child bounty
            </FormDescription>
            <FormMessage className="text-tomato-stamp text-xs" />
          </FormItem>
        )}
      />
      {renderBalanceCheck()}
      {accountIsCurator === false ? (
        <div className="poster-alert alert-error flex items-center gap-3 mt-2">
          <TriangleAlert size={20} className="shrink-0" />
          <div className="text-sm">
            Apparently the account you selected is not a curator of this bounty.
            You will need to be a curator of the parent bounty to submit the
            RFP.
          </div>
        </div>
      ) : null}
    </div>
  );
};

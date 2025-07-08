import { client, typedApi } from "@/chain";
import { BLOCK_LENGTH, STABLE_RATE } from "@/constants";
import { state } from "@react-rxjs/core";
import { add } from "date-fns";
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
} from "rxjs";
import { formValue$ } from "./formValue";
import { bountyValue$, currencyIsStables$, priceToChainAmount } from "./price";
import { referendaDuration } from "./referendaConstants";

const getNextTreasurySpend = async (block: number) => {
  const period = await typedApi.constants.Treasury.SpendPeriod();

  const next = (Math.floor(block / period) + 1) * period;
  const remaining = period - (block % period);

  return { next, remaining, period };
};

export const referendumExecutionBlocks$ = state(
  combineLatest([
    client.finalizedBlock$,
    currencyIsStables$,
    bountyValue$,
  ]).pipe(
    switchMap(async ([currentBlock, isStables, bountyValue]) => {
      const currentBlockDate = new Date();
      const refDuration = await referendaDuration(
        bountyValue
          ? priceToChainAmount(bountyValue) / (isStables ? STABLE_RATE : 1n)
          : null,
      );

      const referendumEnd = currentBlock.number + refDuration;

      if (isStables) {
        // Stables through a multisig don't need to wait for a treasury spend
        return {
          currentBlock,
          currentBlockDate,
          referendumEnd,
          bountyFunding: referendumEnd,
          lateBountyFunding: null,
          referendumSubmissionDeadline: null,
        };
      }

      const nextTreasurySpend = await getNextTreasurySpend(referendumEnd);
      const bountyFunding = nextTreasurySpend.next;
      const referendumSubmissionDeadline =
        currentBlock.number + nextTreasurySpend.remaining;
      const lateBountyFunding =
        nextTreasurySpend.next + nextTreasurySpend.period;

      return {
        currentBlock,
        currentBlockDate,
        referendumEnd,
        bountyFunding,
        lateBountyFunding,
        referendumSubmissionDeadline,
      };
    }),
  ),
  null,
);

const estimatedReferendumTimeline$ = referendumExecutionBlocks$.pipe(
  filter((v) => !!v),
  map(
    ({
      currentBlock,
      currentBlockDate,
      referendumEnd,
      bountyFunding,
      lateBountyFunding,
      referendumSubmissionDeadline,
    }) => {
      const getBlockDate = (block: number) =>
        add(currentBlockDate, {
          seconds: (block - currentBlock.number) * BLOCK_LENGTH,
        });

      return {
        referendumDeadline: getBlockDate(referendumEnd),
        bountyFunding: getBlockDate(bountyFunding),
        lateBountyFunding: lateBountyFunding
          ? getBlockDate(lateBountyFunding)
          : null,
        referendumSubmissionDeadline: referendumSubmissionDeadline
          ? getBlockDate(referendumSubmissionDeadline)
          : null,
      };
    },
  ),
);

export const estimatedTimeline$ = state(
  formValue$.pipe(
    map((v) => v.isChildRfp),
    distinctUntilChanged(),
    switchMap((isChild) =>
      isChild
        ? [
            {
              referendumDeadline: null,
              bountyFunding: new Date(),
              lateBountyFunding: null,
              referendumSubmissionDeadline: null,
            },
          ]
        : estimatedReferendumTimeline$,
    ),
  ),
  null,
);

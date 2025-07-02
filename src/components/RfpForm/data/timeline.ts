import { client, typedApi } from "@/chain";
import { BLOCK_LENGTH, STABLE_RATE, TOKEN_DECIMALS } from "@/constants";
import { state, withDefault } from "@react-rxjs/core";
import { add } from "date-fns";
import { combineLatest, filter, map, switchMap } from "rxjs";
import { bountyValue$, currencyIsStables$ } from "./price";
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
          ? BigInt(bountyValue * 10 ** TOKEN_DECIMALS) /
              (isStables ? STABLE_RATE : 1n)
          : null,
      );

      const referendumEnd = currentBlock.number + refDuration;

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

export const estimatedTimeline$ = referendumExecutionBlocks$.pipeState(
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
        lateBountyFunding: getBlockDate(lateBountyFunding),
        referendumSubmissionDeadline: getBlockDate(
          referendumSubmissionDeadline,
        ),
      };
    },
  ),
  withDefault(null),
);

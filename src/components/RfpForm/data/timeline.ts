import { client, typedApi } from "@/chain";
import { BLOCK_LENGTH, TRACK_ID } from "@/constants";
import { state, withDefault } from "@react-rxjs/core";
import { add } from "date-fns";
import { filter, map, switchMap } from "rxjs";

const track = typedApi.constants.Referenda.Tracks().then((tracks) => {
  const track = tracks.find(([, value]) => value.name === TRACK_ID);
  if (!track) throw new Error("Couldn't find track");
  return { id: track[0], ...track[1] };
});
const referendaDuration = track.then(
  (value) =>
    value.prepare_period +
    value.decision_period +
    value.confirm_period +
    value.min_enactment_period
);

const getNextTreasurySpend = async (block: number) => {
  const period = await typedApi.constants.Treasury.SpendPeriod();

  const next = (Math.floor(block / period) + 1) * period;
  const remaining = period - (block % period);

  return { next, remaining, period };
};

export const referendumExecutionBlocks$ = state(
  client.finalizedBlock$.pipe(
    switchMap(async (currentBlock) => {
      const currentBlockDate = new Date();
      const refDuration = await referendaDuration;

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
    })
  ),
  null
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
          referendumSubmissionDeadline
        ),
      };
    }
  ),
  withDefault(null)
);

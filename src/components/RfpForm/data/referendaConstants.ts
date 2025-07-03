import { referendaSdk, typedApi } from "@/chain";
import { dot, ksm } from "@polkadot-api/descriptors";
import {
  PolkadotRuntimeOriginCaller,
  ReferendaTrack,
  RuntimeOriginCaller,
} from "@polkadot-api/sdk-governance";
import { CompatibilityLevel } from "polkadot-api";

export const getTrack = async (
  value: bigint | null,
): Promise<{
  origin: RuntimeOriginCaller<typeof ksm> | RuntimeOriginCaller<typeof dot>;
  track: ReferendaTrack;
}> => {
  const treasurerTrack = await referendaSdk.getTrack("treasurer");
  if (!treasurerTrack) throw new Error("Couldn't find treasurer track");

  const treasurer = {
    origin: {
      type: "Origins",
      value: {
        type: "Treasurer",
        value: undefined,
      },
    } satisfies PolkadotRuntimeOriginCaller,
    track: treasurerTrack,
  };

  if (!value) {
    return treasurer;
  }

  // Scheduling needs treasurer track - If we can't approve with curator, then use that track.
  const isCompatible =
    await typedApi.tx.Bounties.approve_bounty_with_curator.isCompatible(
      CompatibilityLevel.Partial,
    );
  if (!isCompatible) {
    return treasurer;
  }

  const { track, origin } = referendaSdk.getSpenderTrack(value);
  return { track: await track, origin };
};

export const formatTrackName = (track: string) => track.replace(/_/g, " ");

export const submissionDeposit =
  typedApi.constants.Referenda.SubmissionDeposit();

export const decisionDeposit = (value: bigint | null) =>
  getTrack(value).then((value) => value.track.decision_deposit);

export const referendaDuration = (value: bigint | null) =>
  getTrack(value).then(
    (value) =>
      value.track.prepare_period +
      value.track.decision_period +
      value.track.confirm_period +
      value.track.min_enactment_period,
  );

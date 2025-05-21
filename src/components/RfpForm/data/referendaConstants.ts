import { typedApi } from "@/chain";
import { TRACK_ID } from "@/constants";

const track = typedApi.constants.Referenda.Tracks().then((tracks) => {
  const track = tracks.find(([, value]) => value.name === TRACK_ID);
  if (!track) throw new Error("Couldn't find track");
  return { id: track[0], ...track[1] };
});

export const submissionDeposit =
  typedApi.constants.Referenda.SubmissionDeposit();

export const decisionDeposit = track.then((value) => value.decision_deposit);

export const referendaDuration = track.then(
  (value) =>
    value.prepare_period +
    value.decision_period +
    value.confirm_period +
    value.min_enactment_period
);

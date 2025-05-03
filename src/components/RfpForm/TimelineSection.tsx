import { client, typedApi } from "@/chain";
import { BLOCK_LENGTH, TRACK_ID } from "@/constants";
import { state, useStateObservable } from "@react-rxjs/core";
import { add, addWeeks, differenceInDays, format } from "date-fns";
import { FC } from "react";
import { useWatch } from "react-hook-form";
import { switchMap } from "rxjs";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { DatePicker } from "../ui/datepicker";
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { FormInputField } from "./FormInputField";
import { RfpControlType } from "./formSchema";

export const TimelineSection: FC<{ control: RfpControlType }> = ({
  control,
}) => {
  const submissionDeadline = useSubmissionDeadline(control);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormInputField
          control={control}
          type="number"
          min={1}
          name="fundsExpiry"
          label="Submission Deadline"
          description="Amount of weeks after bounty funding in which the bounty has to be cancelled if there were no implementors"
        />
        <FormField
          control={control}
          name="projectCompletion"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Project Completion</FormLabel>
              <DatePicker
                {...field}
                disabled={(v) =>
                  v.getTime() <=
                  (submissionDeadline
                    ? submissionDeadline.getTime()
                    : Date.now())
                }
              />
              <FormDescription>
                Deadline where the project must be completed
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <EstimatedTimeline control={control} />
      </CardContent>
    </Card>
  );
};

const track = typedApi.constants.Referenda.Tracks().then((tracks) => {
  const track = tracks.find(([, value]) => value.name === TRACK_ID);
  if (!track) throw new Error("Couldn't find track");
  return { id: track[0], ...track[1] };
});
const referendaDuration = track.then(
  (value) => value.prepare_period + value.decision_period + value.confirm_period
);

const getNextTreasurySpend = async (block: number) => {
  const period = await typedApi.constants.Treasury.SpendPeriod();

  const next = (Math.floor(block / period) + 1) * period;
  const remaining = period - (block % period);

  return { next, remaining, period };
};

const estimatedTimeline$ = state(
  client.finalizedBlock$.pipe(
    switchMap(async (currentBlock) => {
      const refDuration = await referendaDuration;
      const currentBlockDate = new Date();

      const referendumEnd = currentBlock.number + refDuration;

      const nextTreasurySpend = await getNextTreasurySpend(referendumEnd);
      const bountyFunding = nextTreasurySpend.next;
      const referendumSubmissionDeadline =
        currentBlock.number + nextTreasurySpend.remaining;
      const lateBountyFunding =
        nextTreasurySpend.next + nextTreasurySpend.period;

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
    })
  ),
  null
);

const useSubmissionDeadline = (control: RfpControlType) => {
  const estimatedTimeline = useStateObservable(estimatedTimeline$);
  const fundsExpiry = useWatch({
    name: "fundsExpiry",
    control,
  });

  return estimatedTimeline
    ? addWeeks(estimatedTimeline.bountyFunding, fundsExpiry || 1)
    : null;
};

const EstimatedTimeline: FC<{ control: RfpControlType }> = ({ control }) => {
  const estimatedTimeline = useStateObservable(estimatedTimeline$);
  const projectCompletion = useWatch({
    name: "projectCompletion",
    control,
  });
  const submissionDeadline = useSubmissionDeadline(control);

  const lateSubmissionDiff = estimatedTimeline
    ? differenceInDays(
        estimatedTimeline.referendumSubmissionDeadline,
        new Date()
      )
    : 0;

  return (
    <div>
      <h3 className="text-sm font-medium">Estimated Timeline</h3>
      {estimatedTimeline ? (
        <ol className="text-sm text-foreground/80 list-disc pl-4 leading-normal">
          <li>
            Referendum approved deadline:{" "}
            <span className="text-foreground">
              {formatDate(estimatedTimeline.referendumDeadline)}
            </span>
          </li>
          <li>
            Bounty funding:{" "}
            <span className="text-foreground">
              {formatDate(estimatedTimeline.bountyFunding)}
            </span>
          </li>
          <li>
            Bounty funding if RFP is submitted later than{" "}
            {format(
              estimatedTimeline.referendumSubmissionDeadline,
              lateSubmissionDiff < 2 ? "LLL do kk:mm" : "LLL do"
            )}
            :{" "}
            <span className="text-foreground">
              {formatDate(estimatedTimeline.lateBountyFunding)}
            </span>
          </li>
          <li>
            Estimated submission deadline:{" "}
            <span className="text-foreground">
              {formatDate(submissionDeadline)}
            </span>
          </li>
          <li>
            Project completion:{" "}
            <span className="text-foreground">
              {formatDate(projectCompletion)}
            </span>
          </li>
        </ol>
      ) : (
        <span className="text-sm text-foreground/60">Loading…</span>
      )}
    </div>
  );
};

const formatDate = (value: Date | undefined | null) =>
  value ? format(value, "PPP") : "…";

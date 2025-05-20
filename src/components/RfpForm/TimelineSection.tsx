import { formatDate } from "@/lib/date";
import { useStateObservable } from "@react-rxjs/core";
import { addWeeks, differenceInDays, format } from "date-fns";
import { FC } from "react";
import { useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { DatePicker } from "../ui/datepicker";
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { estimatedTimeline$ } from "./data";
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
            Referendum executed deadline:{" "}
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

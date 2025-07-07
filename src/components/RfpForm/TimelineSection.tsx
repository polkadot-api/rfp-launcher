import { formatDate } from "@/lib/date";
import { useStateObservable } from "@react-rxjs/core";
import { addWeeks, differenceInDays, format } from "date-fns";
import type { FC } from "react";
import { useWatch } from "react-hook-form";
// Removed Card, CardContent, CardHeader, CardTitle imports
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
import type { RfpControlType } from "./formSchema";

export const TimelineSection: FC<{ control: RfpControlType }> = ({
  control,
}) => {
  const submissionDeadline = useSubmissionDeadline(control);

  return (
    <div className="poster-card">
      {" "}
      {/* Changed from <Card> to <div className="poster-card"> */}
      <h3 className="text-3xl font-medium mb-8 text-midnight-koi">
        Timeline
      </h3>{" "}
      {/* Added consistent title */}
      <div className="space-y-4">
        {" "}
        {/* Replaces CardContent */}
        <FormInputField
          control={control}
          type="number"
          min={1}
          name="fundsExpiry"
          label="Funds Expiry (Weeks)"
          description="Number of weeks after successful funding until the RFP expires if no implementors are found."
        />
        <FormField
          control={control}
          name="projectCompletion"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="poster-label">
                Project Completion Date
              </FormLabel>
              <DatePicker
                {...field}
                disabled={(v) =>
                  v.getTime() <=
                  (submissionDeadline
                    ? submissionDeadline.getTime()
                    : Date.now())
                }
              />
              <FormDescription className="text-xs text-pine-shadow-60 leading-tight">
                The date by which the project must be fully completed.
              </FormDescription>
              <FormMessage className="text-tomato-stamp text-xs" />
            </FormItem>
          )}
        />
        <EstimatedTimeline control={control} />
      </div>
    </div>
  );
};

const useSubmissionDeadline = (control: RfpControlType) => {
  const estimatedTimeline = useStateObservable(estimatedTimeline$);
  const fundsExpiry = useWatch({
    name: "fundsExpiry",
    control,
  });

  return estimatedTimeline?.bountyFunding
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

  const lateSubmissionDiff = estimatedTimeline?.referendumSubmissionDeadline
    ? differenceInDays(
        estimatedTimeline.referendumSubmissionDeadline,
        new Date(),
      )
    : 0;

  return (
    <div>
      <h3 className="text-sm font-medium text-midnight-koi">
        Estimated Timeline
      </h3>{" "}
      {/* Changed from text-sm font-medium to match poster-label style for subheadings if desired, or keep as is */}
      {estimatedTimeline ? (
        <ol className="text-sm text-pine-shadow-60 list-disc pl-4 leading-normal">
          {" "}
          {/* Adjusted text color for better contrast/consistency */}
          {estimatedTimeline.referendumDeadline ? (
            <li>
              Referendum Executed Deadline:{" "}
              <span className="text-midnight-koi font-medium">
                {formatDate(estimatedTimeline.referendumDeadline)}
              </span>{" "}
              {/* Made value bolder */}
            </li>
          ) : null}
          <li>
            RFP Funding:{" "}
            <span className="text-midnight-koi font-medium">
              {formatDate(estimatedTimeline.bountyFunding)}
            </span>
          </li>
          {estimatedTimeline?.referendumSubmissionDeadline ? (
            <li>
              RFP Funding (if referendum submitted after{" "}
              {format(
                estimatedTimeline.referendumSubmissionDeadline,
                lateSubmissionDiff < 2 ? "LLL do kk:mm" : "LLL do",
              )}
              ):{" "}
              <span className="text-midnight-koi font-medium">
                {formatDate(estimatedTimeline.lateBountyFunding)}
              </span>
            </li>
          ) : null}
          <li>
            Funds Expiry Deadline:{" "}
            <span className="text-midnight-koi font-medium">
              {formatDate(submissionDeadline)}
            </span>
          </li>
          <li>
            Project Completion Date:{" "}
            <span className="text-midnight-koi font-medium">
              {formatDate(projectCompletion)}
            </span>
          </li>
        </ol>
      ) : (
        <span className="text-sm text-pine-shadow-60">Loading...</span>
      )}
    </div>
  );
};

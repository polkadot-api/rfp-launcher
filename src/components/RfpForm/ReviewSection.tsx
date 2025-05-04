import { REFERENDUM_PRICE_BUFFER, TOKEN_SYMBOL } from "@/constants";
import { useStateObservable } from "@react-rxjs/core";
import { addWeeks, differenceInDays, format } from "date-fns";
import { OctagonAlert, TriangleAlert } from "lucide-react";
import { FC } from "react";
import { useWatch } from "react-hook-form";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Milestone, parseNumber, RfpControlType } from "./formSchema";
import { estimatedTimeline$ } from "./TimelineSection";
import { generateMarkdown } from "./markdown";

export const ReviewSection: FC<{ control: RfpControlType }> = ({ control }) => {
  const estimatedTimeline = useStateObservable(estimatedTimeline$);
  const milestones = useWatch({ control, name: "milestones" });
  const prizePool = useWatch({ control, name: "prizePool" });
  const fundsExpiry = useWatch({ control, name: "fundsExpiry" });
  const projectCompletion = useWatch({ control, name: "projectCompletion" });

  const milestonesTotal = getMilestonesTotal(milestones);
  const milestonesMatchesPrize = parseNumber(prizePool) === milestonesTotal;

  const submissionDeadline = estimatedTimeline
    ? addWeeks(estimatedTimeline.bountyFunding, fundsExpiry || 1)
    : new Date();
  const enoughDevDays =
    differenceInDays(projectCompletion, submissionDeadline) >= 7;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review and Submit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FundingSummary
          control={control}
          milestonesMatchesPrize={milestonesMatchesPrize}
        />
        <TimelineSummary control={control} enoughDevDays={enoughDevDays} />
        <div className="text-right">
          <Button
            type="submit"
            disabled={!milestonesMatchesPrize || !enoughDevDays}
          >
            Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const FundingSummary: FC<{
  control: RfpControlType;
  milestonesMatchesPrize: boolean;
}> = ({ control, milestonesMatchesPrize }) => {
  const formFields = useWatch({ control });

  const milestonesTotal = getMilestonesTotal(formFields.milestones);

  const conversionRate = 15.123846546812; // TODO
  const totalAmount = [
    formFields.prizePool,
    formFields.findersFee,
    formFields.supervisorsFee,
  ]
    .map(parseNumber)
    .filter((v) => v != null)
    .reduce((a, b) => a + b, 0);
  const totalAmountToken = totalAmount / conversionRate;
  const totalAmountWithBuffer =
    totalAmountToken * (1 + REFERENDUM_PRICE_BUFFER);

  console.log(generateMarkdown(formFields, conversionRate, {}));

  return (
    <div className="max-w-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">Funding</TableHead>
            <TableHead className="font-bold text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Prize Pool</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatUsd(formFields.prizePool)}
            </TableCell>
          </TableRow>
          {(formFields.milestones ?? []).map((milestone, i) => (
            <TableRow>
              <TableCell className="pl-4">Milestone #{i + 1}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatUsd(milestone.amount)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow
            className={milestonesMatchesPrize ? "" : "bg-destructive/10"}
          >
            <TableCell className="font-medium">Milestone sum</TableCell>
            <TableCell className="font-medium text-right tabular-nums">
              {formatUsd(milestonesTotal)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Finder's Fee</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatUsd(formFields.findersFee)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Supervisor's Fee</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatUsd(formFields.supervisorsFee)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Total Amount</TableCell>
            <TableCell className="font-medium text-right tabular-nums">
              {formatUsd(totalAmount)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Total Amount (KSM)</TableCell>
            <TableCell className="font-medium text-right tabular-nums">
              {formatToken(totalAmountToken)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-bold">Total +25% Buffer</TableCell>
            <TableCell className="font-bold text-right tabular-nums">
              {formatToken(totalAmountWithBuffer)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className="text-right text-sm text-foreground/60">
        1 {TOKEN_SYMBOL} = {formatToken(conversionRate, "USD")}
      </div>
      {milestonesMatchesPrize ? null : (
        <div className="text-destructive py-2 flex items-center gap-2">
          <OctagonAlert className="inline-block" />
          <div>Milestones must add up to the total prize pool.</div>
        </div>
      )}
    </div>
  );
};

const getMilestonesTotal = (milestones: Partial<Milestone>[] | undefined) =>
  (milestones ?? [])
    .map((milestone) => parseNumber(milestone.amount))
    .filter((v) => v != null)
    .reduce((a, b) => a + b, 0);

const formatUsd = (value: string | number | undefined) => {
  const numericValue = parseNumber(value);
  if (numericValue == null) return "";

  return `$${numericValue.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
};

const formatToken = (value: number | undefined, token = TOKEN_SYMBOL) => {
  if (value == null) return "";

  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  })} ${token}`;
};

const TimelineSummary: FC<{
  control: RfpControlType;
  enoughDevDays: boolean;
}> = ({ control, enoughDevDays }) => {
  const estimatedTimeline = useStateObservable(estimatedTimeline$);
  const projectCompletion = useWatch({
    name: "projectCompletion",
    control,
  });
  const fundsExpiry = parseNumber(
    useWatch({
      name: "fundsExpiry",
      control,
    })
  );

  const submissionDeadline = estimatedTimeline
    ? addWeeks(estimatedTimeline.bountyFunding, fundsExpiry || 1)
    : null;
  const devDays =
    submissionDeadline &&
    projectCompletion &&
    differenceInDays(projectCompletion, submissionDeadline);

  const daysToLateSubmission = estimatedTimeline
    ? differenceInDays(
        estimatedTimeline.referendumSubmissionDeadline,
        new Date()
      )
    : null;
  const lateSubmissionDiff = estimatedTimeline
    ? differenceInDays(
        estimatedTimeline.lateBountyFunding,
        estimatedTimeline.bountyFunding
      )
    : null;

  return (
    <div className="max-w-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">Timeline</TableHead>
            <TableHead className="font-bold text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Referendum executed</TableCell>
            <TableCell className="text-right">
              {formatDate(estimatedTimeline?.referendumDeadline)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Bounty funding</TableCell>
            <TableCell className="font-medium text-right">
              {formatDate(estimatedTimeline?.bountyFunding)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Submission deadline</TableCell>
            <TableCell className="text-right">
              {formatDate(submissionDeadline)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Project completion</TableCell>
            <TableCell className="text-right">
              {formatDate(projectCompletion)}
            </TableCell>
          </TableRow>
          <TableRow className={enoughDevDays ? "" : "bg-destructive/10"}>
            <TableCell>Total development days</TableCell>
            <TableCell className="text-right">
              {devDays != null
                ? `${Math.round(devDays).toLocaleString()} days`
                : ""}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {!enoughDevDays ? (
        <div className="text-destructive py-2 flex items-center gap-2">
          <OctagonAlert className="inline-block" />
          <div>Dates don't match up: not enough development days</div>
        </div>
      ) : devDays != null &&
        daysToLateSubmission != null &&
        daysToLateSubmission < 1 ? (
        <div className="text-amber-600 py-2 flex items-center gap-2">
          <TriangleAlert className="inline-block shrink-0" />
          <div>
            If this RFP is submitted after{" "}
            {format(
              estimatedTimeline!.referendumSubmissionDeadline,
              "LLL do kk:mm"
            )}
            , the funding might get delayed by {Math.round(lateSubmissionDiff!)}{" "}
            days, which would leave total development days to{" "}
            {Math.round(devDays - lateSubmissionDiff!)}.
          </div>
        </div>
      ) : null}
    </div>
  );
};
const formatDate = (value: Date | undefined | null) =>
  value ? format(value, "PPP") : "";

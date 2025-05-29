import { formatDate } from "@/lib/date"
import { useStateObservable } from "@react-rxjs/core"
import { addWeeks, differenceInDays, format } from "date-fns"
import type { FC } from "react"
import { useWatch } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { DatePicker } from "../ui/datepicker"
import { FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { estimatedTimeline$ } from "./data"
import { FormInputField } from "./FormInputField"
import type { RfpControlType } from "./formSchema"

export const TimelineSection: FC<{ control: RfpControlType }> = ({ control }) => {
  const submissionDeadline = useSubmissionDeadline(control)

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
          label="Funds Expiry (Weeks)"
          description="Number of weeks after bounty funding until the bounty expires if no implementors are found."
        />
        <FormField
          control={control}
          name="projectCompletion"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Project Completion Date</FormLabel>
              <DatePicker
                {...field}
                disabled={(v) => v.getTime() <= (submissionDeadline ? submissionDeadline.getTime() : Date.now())}
              />
              <FormDescription>The date by which the project must be fully completed.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <EstimatedTimeline control={control} />
      </CardContent>
    </Card>
  )
}

const useSubmissionDeadline = (control: RfpControlType) => {
  const estimatedTimeline = useStateObservable(estimatedTimeline$)
  const fundsExpiry = useWatch({
    name: "fundsExpiry",
    control,
  })

  return estimatedTimeline ? addWeeks(estimatedTimeline.bountyFunding, fundsExpiry || 1) : null
}

const EstimatedTimeline: FC<{ control: RfpControlType }> = ({ control }) => {
  const estimatedTimeline = useStateObservable(estimatedTimeline$)
  const projectCompletion = useWatch({
    name: "projectCompletion",
    control,
  })
  const submissionDeadline = useSubmissionDeadline(control)

  const lateSubmissionDiff = estimatedTimeline
    ? differenceInDays(estimatedTimeline.referendumSubmissionDeadline, new Date())
    : 0

  return (
    <div>
      <h3 className="text-sm font-medium">Estimated Timeline</h3>
      {estimatedTimeline ? (
        <ol className="text-sm text-foreground/80 list-disc pl-4 leading-normal">
          <li>
            Referendum Executed Deadline:{" "}
            <span className="text-foreground">{formatDate(estimatedTimeline.referendumDeadline)}</span>
          </li>
          <li>
            Bounty Funding: <span className="text-foreground">{formatDate(estimatedTimeline.bountyFunding)}</span>
          </li>
          <li>
            Bounty Funding (if RFP submitted after deadline of{" "}
            {format(estimatedTimeline.referendumSubmissionDeadline, lateSubmissionDiff < 2 ? "LLL do kk:mm" : "LLL do")})
            : <span className="text-foreground">{formatDate(estimatedTimeline.lateBountyFunding)}</span>
          </li>
          <li>
            Funds Expiry Deadline: <span className="text-foreground">{formatDate(submissionDeadline)}</span>
          </li>
          <li>
            Project Completion Date: <span className="text-foreground">{formatDate(projectCompletion)}</span>
          </li>
        </ol>
      ) : (
        <span className="text-sm text-foreground/60">Loading...</span>
      )}
    </div>
  )
}


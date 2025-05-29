"use client"

import { TOKEN_SYMBOL } from "@/constants"
import { formatDate } from "@/lib/date"
import { formatCurrency, formatUsd } from "@/lib/formatToken"
import { currencyRate$ } from "@/services/currencyRate"
import { useStateObservable } from "@react-rxjs/core"
import { addWeeks, differenceInDays } from "date-fns"
import {
  BadgeInfo,
  OctagonAlert,
  TriangleAlert,
  FileText,
  RefreshCw,
  DollarSign,
  Clock,
  Users,
  CheckCircle2,
  Copy,
} from "lucide-react"
import { type FC, useEffect, useState, useMemo } from "react"
import { useWatch } from "react-hook-form"
import { combineLatest, map } from "rxjs"
import { Checkbox } from "../ui/checkbox"
import { estimatedTimeline$, identity$ } from "./data"
import { calculatePriceTotals, setBountyValue } from "./data/price"
import { generateMarkdown } from "./data/markdown"
import { MarkdownPreview } from "./MarkdownPreview"
import { type Milestone, parseNumber, type RfpControlType } from "./formSchema"

export const ReviewSection: FC<{
  control: RfpControlType
  onReset: () => void
}> = ({ control }) => {
  const [willReturnFunds, setWillReturnFunds] = useState(false)
  const estimatedTimeline = useStateObservable(estimatedTimeline$)

  const milestones = useWatch({ control, name: "milestones" })
  const prizePool = useWatch({ control, name: "prizePool" })
  const fundsExpiry = useWatch({ control, name: "fundsExpiry" })
  const projectCompletion = useWatch({ control, name: "projectCompletion" })

  const milestonesTotal = getMilestonesTotal(milestones)
  const milestonesMatchesPrize = parseNumber(prizePool) === milestonesTotal

  const submissionDeadline = estimatedTimeline
    ? addWeeks(estimatedTimeline.bountyFunding, fundsExpiry || 1)
    : new Date()
  const enoughDevDays = projectCompletion ? differenceInDays(projectCompletion, submissionDeadline) >= 7 : true

  return (
    <div className="poster-card">
      <h3 className="text-3xl font-medium mb-8 text-midnight-koi">review & submit</h3>

      {/* Summary Grid - Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <FundingSummary control={control} milestonesMatchesPrize={milestonesMatchesPrize} />
        <TimelineSummary control={control} enoughDevDays={enoughDevDays} />
        <ProjectSummary control={control} />
      </div>

      {/* Markdown Preview */}
      <ResultingMarkdown control={control} />

      {/* Final Confirmation */}
      <div className="mt-8 bg-canvas-cream border border-pine-shadow-20 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="return-funds"
            checked={willReturnFunds}
            onCheckedChange={(checked) => setWillReturnFunds(!!checked)}
            className="mt-1 border-pine-shadow data-[state=checked]:bg-lilypad data-[state=checked]:text-canvas-cream"
          />
          <label htmlFor="return-funds" className="text-pine-shadow leading-tight cursor-pointer text-sm">
            i agree that any unused funds will be returned to the treasury.
          </label>
        </div>
        {!willReturnFunds && (
          <div className="mt-3 poster-alert alert-error">
            <div className="flex items-center gap-2">
              <TriangleAlert size={16} />
              <div className="text-sm font-medium">you must agree to return unused funds to the treasury.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const FundingSummary: FC<{
  control: RfpControlType
  milestonesMatchesPrize: boolean
}> = ({ control, milestonesMatchesPrize }) => {
  const formFields = useWatch({ control })
  const milestonesTotal = getMilestonesTotal(formFields.milestones)
  const currencyRate = useStateObservable(currencyRate$)
  const { totalAmountWithBuffer } = calculatePriceTotals(formFields, currencyRate)

  useEffect(() => {
    setBountyValue(totalAmountWithBuffer)
  }, [totalAmountWithBuffer])

  return (
    <div className="bg-canvas-cream border border-lake-haze rounded-lg p-6">
      <h4 className="flex items-center gap-2 text-lg font-medium text-midnight-koi mb-4">
        <DollarSign size={20} className="text-lake-haze" />
        funding breakdown
      </h4>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-pine-shadow">prize pool</span>
          <span className="font-medium text-midnight-koi">{formatUsd(formFields.prizePool)}</span>
        </div>

        {(formFields.milestones ?? []).map((milestone, i) => (
          <div key={i} className="flex justify-between items-center pl-4 text-xs">
            <span className="text-pine-shadow-60">milestone #{i + 1}</span>
            <span className="text-pine-shadow">{formatUsd(milestone.amount)}</span>
          </div>
        ))}

        <div
          className={`flex justify-between items-center py-2 border-t border-pine-shadow-20 ${
            milestonesMatchesPrize ? "text-lilypad" : "text-tomato-stamp"
          }`}
        >
          <span className="text-sm font-medium">milestone sum</span>
          <span className="font-medium">{formatUsd(milestonesTotal)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-pine-shadow">finder's fee</span>
          <span className="text-midnight-koi">{formatUsd(formFields.findersFee)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-pine-shadow">supervisor's fee</span>
          <span className="text-midnight-koi">{formatUsd(formFields.supervisorsFee)}</span>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-pine-shadow-20">
          <span className="font-semibold text-midnight-koi">total +25% buffer</span>
          <span className="font-bold text-midnight-koi">{formatCurrency(totalAmountWithBuffer, TOKEN_SYMBOL)}</span>
        </div>

        <div className="text-right text-xs text-pine-shadow-60">
          1 {TOKEN_SYMBOL} = {formatCurrency(currencyRate, "USD")}
        </div>
      </div>

      {!milestonesMatchesPrize && (
        <div className="mt-4 poster-alert alert-error">
          <div className="flex items-center gap-2 text-xs">
            <OctagonAlert size={14} />
            <div className="font-medium">milestones must add up to the total prize pool.</div>
          </div>
        </div>
      )}
    </div>
  )
}

const TimelineSummary: FC<{
  control: RfpControlType
  enoughDevDays: boolean
}> = ({ control, enoughDevDays }) => {
  const estimatedTimeline = useStateObservable(estimatedTimeline$)
  const projectCompletion = useWatch({ name: "projectCompletion", control })
  const fundsExpiry = parseNumber(useWatch({ name: "fundsExpiry", control }))

  const submissionDeadline = estimatedTimeline ? addWeeks(estimatedTimeline.bountyFunding, fundsExpiry || 1) : null
  const devDays = submissionDeadline && projectCompletion && differenceInDays(projectCompletion, submissionDeadline)

  const daysToLateSubmission = estimatedTimeline
    ? differenceInDays(estimatedTimeline.referendumSubmissionDeadline, new Date())
    : null
  const lateSubmissionDiff = estimatedTimeline
    ? differenceInDays(estimatedTimeline.lateBountyFunding, estimatedTimeline.bountyFunding)
    : null

  return (
    <div className="bg-canvas-cream border border-sun-bleach rounded-lg p-6">
      <h4 className="flex items-center gap-2 text-lg font-medium text-midnight-koi mb-4">
        <Clock size={20} className="text-sun-bleach" />
        timeline
      </h4>

      <div className="space-y-3">
        <div className="grid grid-cols-[1fr,auto] gap-4 items-center">
          <span className="text-sm text-pine-shadow">referendum executed</span>
          <span className="text-xs text-midnight-koi font-mono tabular-nums">
            {formatDate(estimatedTimeline?.referendumDeadline)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr,auto] gap-4 items-center py-2 bg-sun-bleach bg-opacity-10 px-3 rounded">
          <span className="font-medium text-midnight-koi">bounty funding</span>
          <span className="font-medium text-midnight-koi text-xs font-mono tabular-nums">
            {formatDate(estimatedTimeline?.bountyFunding)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr,auto] gap-4 items-center">
          <span className="text-sm text-pine-shadow">submission deadline</span>
          <span className="text-xs text-midnight-koi font-mono tabular-nums">{formatDate(submissionDeadline)}</span>
        </div>

        <div className="grid grid-cols-[1fr,auto] gap-4 items-center">
          <span className="text-sm text-pine-shadow">project completion</span>
          <span className="text-xs text-midnight-koi font-mono tabular-nums">{formatDate(projectCompletion)}</span>
        </div>

        <div
          className={`grid grid-cols-[1fr,auto] gap-4 items-center pt-3 border-t border-pine-shadow-20 ${
            enoughDevDays ? "text-lilypad" : "text-tomato-stamp"
          }`}
        >
          <span className="font-medium">development time</span>
          <span className="font-medium text-xs font-mono tabular-nums">
            {devDays != null ? `${Math.round(devDays)} days` : "—"}
          </span>
        </div>
      </div>

      {!enoughDevDays ? (
        <div className="mt-4 poster-alert alert-error">
          <div className="flex items-center gap-2 text-xs">
            <OctagonAlert size={14} />
            <div className="font-medium">not enough development days</div>
          </div>
        </div>
      ) : devDays != null && daysToLateSubmission != null && daysToLateSubmission < 1 ? (
        <div className="mt-4 poster-alert alert-warning">
          <div className="flex items-center gap-2 text-xs">
            <TriangleAlert size={14} />
            <div className="font-medium">
              late submission may delay funding by {Math.round(lateSubmissionDiff!)} days.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const ProjectSummary: FC<{
  control: RfpControlType
}> = ({ control }) => {
  const formFields = useWatch({ control })
  const supervisors = formFields.supervisors || []
  const milestones = formFields.milestones || []

  return (
    <div className="bg-canvas-cream border border-lilypad rounded-lg p-6">
      <h4 className="flex items-center gap-2 text-lg font-medium text-midnight-koi mb-4">
        <Users size={20} className="text-lilypad" />
        project summary
      </h4>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">project title</div>
          <div className="text-sm font-medium text-midnight-koi break-words">
            {formFields.projectTitle || "untitled project"}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">supervisors</div>
          <div className="text-sm text-pine-shadow">
            {supervisors.length > 0 ? `${supervisors.length} supervisor${supervisors.length > 1 ? "s" : ""}` : "none"}
          </div>
          {supervisors.length > 1 && (
            <div className="text-xs text-pine-shadow-60">threshold: {formFields.signatoriesThreshold || 2}</div>
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">milestones</div>
          <div className="text-sm text-pine-shadow">
            {milestones.length > 0 ? `${milestones.length} milestone${milestones.length > 1 ? "s" : ""}` : "none"}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">submission window</div>
          <div className="text-sm text-pine-shadow">
            {formFields.fundsExpiry || 1} week{(formFields.fundsExpiry || 1) > 1 ? "s" : ""} after funding
          </div>
        </div>

        <div className="pt-3 border-t border-pine-shadow-20">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-lilypad" />
            <span className="text-sm text-pine-shadow font-medium">ready for submission</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const getMilestonesTotal = (milestones: Partial<Milestone>[] | undefined) =>
  (milestones ?? [])
    .map((milestone) => parseNumber(milestone.amount))
    .filter((v) => v != null)
    .reduce((a, b) => a + b, 0)

const ResultingMarkdown: FC<{
  control: RfpControlType
}> = ({ control }) => {
  const formFields = useWatch({ control })
  const currencyRate = useStateObservable(currencyRate$)
  const [copied, setCopied] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [identities, setIdentities] = useState<Record<string, string | undefined>>({})

  useEffect(() => {
    const supervisors = formFields.supervisors || []
    if (supervisors.length === 0) {
      setIdentities({})
      return
    }

    const subscription = combineLatest(
      Object.fromEntries(supervisors.map((addr) => [addr, identity$(addr).pipe(map((id) => id?.value))])),
    ).subscribe((r) => setIdentities(r))
    return () => subscription.unsubscribe()
  }, [formFields.supervisors])

  const markdown = useMemo(() => {
    const { totalAmountWithBuffer } = calculatePriceTotals(formFields, currencyRate)
    return generateMarkdown(formFields, totalAmountWithBuffer, identities)
  }, [formFields, currencyRate, identities, refreshKey])

  const copyToClipboard = async () => {
    if (markdown) {
      try {
        await navigator.clipboard.writeText(markdown)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error("Failed to copy:", err)
        const textArea = document.createElement("textarea")
        textArea.value = markdown
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand("copy")
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch (execErr) {
          console.error("Fallback copy failed:", execErr)
        }
        document.body.removeChild(textArea)
      }
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h4 className="flex items-center gap-2 text-lg font-medium text-midnight-koi">
          <FileText size={20} className="text-tomato-stamp" />
          rfp body preview
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="poster-btn btn-secondary flex items-center gap-1 text-xs py-2 px-3"
          >
            <RefreshCw size={14} />
            refresh
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            className="poster-btn btn-primary flex items-center gap-1 text-xs py-2 px-3"
          >
            <Copy size={14} />
            {copied ? "copied!" : "copy"}
          </button>
        </div>
      </div>

      <MarkdownPreview markdown={markdown} onCopy={copyToClipboard} copied={copied} />

      <div className="mt-4 poster-alert alert-warning">
        <div className="flex items-start gap-2">
          <BadgeInfo size={16} className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <strong>next step:</strong> copy this markdown content and paste it into the body of your referendum once
            submitted.
          </div>
        </div>
      </div>
    </div>
  )
}


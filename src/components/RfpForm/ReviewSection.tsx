"use client"

import { TOKEN_SYMBOL } from "@/constants"
import { formatDate } from "@/lib/date"
import { formatCurrency, formatToken, formatUsd } from "@/lib/formatToken" // Added formatToken
import { getPublicKey, sliceMiddleAddr } from "@/lib/ss58"
import { currencyRate$ } from "@/services/currencyRate"
import { PolkadotIdenticon } from "@polkadot-api/react-components"
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
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { type FC, useEffect, useState, useMemo, type Dispatch, type SetStateAction } from "react"
import { useWatch } from "react-hook-form"
import { combineLatest, map } from "rxjs"
import { Checkbox } from "../ui/checkbox"
import { estimatedTimeline$, identity$ } from "./data"
import { calculatePriceTotals, setBountyValue } from "./data/price"
import { generateMarkdown } from "./data/markdown"
import { MarkdownPreview } from "./MarkdownPreview"
import { type Milestone, parseNumber, type RfpControlType } from "./formSchema"
import { selectedAccount$ } from "../SelectAccount" // To check if an account is selected

interface ReviewSectionProps {
  control: RfpControlType
  isReturnFundsAgreed: boolean
  setIsReturnFundsAgreed: Dispatch<SetStateAction<boolean>>
  hasSufficientBalance: boolean
  currentBalance: bigint | null
  totalRequiredCost: bigint | null
}

export const ReviewSection: FC<ReviewSectionProps> = ({
  control,
  isReturnFundsAgreed,
  setIsReturnFundsAgreed,
  hasSufficientBalance,
  currentBalance,
  totalRequiredCost,
}) => {
  const estimatedTimeline = useStateObservable(estimatedTimeline$)
  const selectedAccount = useStateObservable(selectedAccount$) // Get selected account

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
      <h3 className="text-3xl font-medium mb-8 text-midnight-koi">Review & Submit</h3>

      {/* Insufficient Balance Warning */}
      {selectedAccount && !hasSufficientBalance && totalRequiredCost !== null && (
        <div className="mb-6 poster-alert alert-error">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <strong>Insufficient Balance:</strong> You need at least{" "}
              <strong className="font-semibold">{formatToken(totalRequiredCost)}</strong> to launch this RFP. Your
              current balance is <strong className="font-semibold">{formatToken(currentBalance)}</strong>. Please add
              funds or select another wallet.
            </div>
          </div>
        </div>
      )}

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
            checked={isReturnFundsAgreed}
            onCheckedChange={(checked) => setIsReturnFundsAgreed(!!checked)}
            className="mt-1 border-pine-shadow data-[state=checked]:bg-lilypad data-[state=checked]:text-canvas-cream"
          />
          <label htmlFor="return-funds" className="text-pine-shadow leading-tight cursor-pointer text-sm">
            I agree that any unused funds will be returned to the Treasury.
          </label>
        </div>
        {!isReturnFundsAgreed && (
          <div className="mt-3 poster-alert alert-error">
            <div className="flex items-center gap-2">
              <TriangleAlert size={16} />
              <div className="text-sm font-medium">You must agree to return unused funds to the Treasury.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const FundingSummaryListItem: FC<{
  label: string
  value: string | number | null | undefined
  isSubItem?: boolean
  valueClass?: string
  labelClass?: string
}> = ({ label, value, isSubItem, valueClass, labelClass }) => (
  <div className={`flex justify-between items-baseline ${isSubItem ? "pl-4" : ""}`}>
    <span className={`text-sm ${isSubItem ? "text-pine-shadow-60" : "text-pine-shadow"} ${labelClass}`}>{label}</span>
    <span className={`font-medium text-midnight-koi tabular-nums ${isSubItem ? "text-xs" : ""} ${valueClass}`}>
      {value}
    </span>
  </div>
)

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

  const formattedKsmString = formatCurrency(totalAmountWithBuffer, TOKEN_SYMBOL, 2)
  let ksmValueDisplay = "Calculating..."
  let ksmUnitDisplay = ""

  if (totalAmountWithBuffer != null && formattedKsmString) {
    const parts = formattedKsmString.split(" ")
    if (parts.length >= 1) {
      ksmValueDisplay = parts[0]
      if (parts.length >= 2) {
        ksmUnitDisplay = parts[1]
      } else {
        const symbolIndex = ksmValueDisplay.indexOf(TOKEN_SYMBOL)
        if (symbolIndex > -1 && ksmValueDisplay.endsWith(TOKEN_SYMBOL)) {
          ksmUnitDisplay = TOKEN_SYMBOL
          ksmValueDisplay = ksmValueDisplay.substring(0, symbolIndex).trim()
        } else {
          ksmUnitDisplay = TOKEN_SYMBOL
        }
      }
    }
  }

  return (
    <div className="bg-canvas-cream border border-lake-haze rounded-lg p-6">
      <h4 className="flex items-center gap-2 text-lg font-medium text-midnight-koi mb-4">
        <DollarSign size={20} className="text-lake-haze" />
        Funding Breakdown
      </h4>

      <div className="space-y-3">
        <FundingSummaryListItem label="Prize Pool" value={formatUsd(formFields.prizePool)} />

        {(formFields.milestones ?? []).map((milestone, i) => (
          <FundingSummaryListItem
            key={i}
            label={`Milestone #${i + 1}`}
            value={formatUsd(milestone.amount)}
            isSubItem
            valueClass="text-pine-shadow"
          />
        ))}

        <div
          className={`flex justify-between items-baseline py-2 border-t border-pine-shadow-20 ${
            milestonesMatchesPrize ? "text-lilypad" : "text-tomato-stamp"
          }`}
        >
          <span className="text-sm font-medium">Milestone Sum</span>
          <span className="font-medium tabular-nums">{formatUsd(milestonesTotal)}</span>
        </div>

        <FundingSummaryListItem label="Finder's Fee" value={formatUsd(formFields.findersFee)} />
        <FundingSummaryListItem label="Supervisor's Fee" value={formatUsd(formFields.supervisorsFee)} />

        {/* Enhanced Total + Buffer Section */}
        <div className="pt-4 mt-4 border-t-2 border-lake-haze">
          <div className="flex justify-between items-start">
            <div className="flex flex-col items-start">
              <span className="text-base font-semibold text-midnight-koi">Total</span>
              <span className="text-xs text-pine-shadow-60">+25% Buffer</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xl font-bold text-midnight-koi tabular-nums">{ksmValueDisplay}</span>
              {ksmUnitDisplay && <span className="text-xs text-pine-shadow-60">{ksmUnitDisplay}</span>}
            </div>
          </div>
        </div>

        <div className="text-right text-xs text-pine-shadow-60 mt-1 tabular-nums">
          1 {TOKEN_SYMBOL} = {formatCurrency(currencyRate, "USD")}
        </div>
      </div>

      {!milestonesMatchesPrize && (
        <div className="mt-4 poster-alert alert-error">
          <div className="flex items-center gap-2 text-xs">
            <OctagonAlert size={14} />
            <div className="font-medium">Milestones must add up to the total prize pool.</div>
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

  const devDaysValue = devDays != null ? Math.round(devDays) : null
  const devDaysUnit = "days"

  return (
    <div className="bg-canvas-cream border border-sun-bleach rounded-lg p-6">
      <h4 className="flex items-center gap-2 text-lg font-medium text-midnight-koi mb-4">
        <Clock size={20} className="text-sun-bleach" />
        Timeline
      </h4>

      <div className="space-y-3">
        <div className="grid grid-cols-[1fr,auto] gap-x-4 items-baseline">
          <span className="text-sm text-pine-shadow">Referendum Executed</span>
          <span className="text-xs text-midnight-koi font-mono tabular-nums text-right">
            {formatDate(estimatedTimeline?.referendumDeadline)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr,auto] gap-x-4 items-baseline py-2 bg-sun-bleach bg-opacity-10 px-3 -mx-3 rounded">
          <span className="font-medium text-midnight-koi">Bounty Funding</span>
          <span className="font-medium text-midnight-koi text-xs font-mono tabular-nums text-right">
            {formatDate(estimatedTimeline?.bountyFunding)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr,auto] gap-x-4 items-baseline">
          <span className="text-sm text-pine-shadow">Funds Expiry Deadline</span>
          <span className="text-xs text-midnight-koi font-mono tabular-nums text-right">
            {formatDate(submissionDeadline)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr,auto] gap-x-4 items-baseline">
          <span className="text-sm text-pine-shadow">Project Completion</span>
          <span className="text-xs text-midnight-koi font-mono tabular-nums text-right">
            {formatDate(projectCompletion)}
          </span>
        </div>

        <div
          className={`flex justify-between items-start pt-3 border-t border-pine-shadow-20 ${
            enoughDevDays ? "text-lilypad" : "text-tomato-stamp"
          }`}
        >
          <span className="text-base font-semibold text-midnight-koi pt-1">Development Time</span>
          <div className="flex flex-col items-end">
            <span className="text-xl font-bold text-midnight-koi tabular-nums">
              {devDaysValue != null ? devDaysValue : "—"}
            </span>
            {devDaysValue != null && <span className="text-xs text-pine-shadow-60">{devDaysUnit}</span>}
          </div>
        </div>
      </div>

      {!enoughDevDays ? (
        <div className="mt-4 poster-alert alert-error">
          <div className="flex items-center gap-2 text-xs">
            <OctagonAlert size={14} />
            <div className="font-medium">Not enough development days.</div>
          </div>
        </div>
      ) : devDays != null && daysToLateSubmission != null && daysToLateSubmission < 1 ? (
        <div className="mt-4 poster-alert alert-warning">
          <div className="flex items-center gap-2 text-xs">
            <TriangleAlert size={14} />
            <div className="font-medium">
              Late submission may delay funding by {Math.round(lateSubmissionDiff!)} days.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const SupervisorListItem: FC<{ address: string }> = ({ address }) => {
  const supervisorIdentity = useStateObservable(identity$(address))

  return (
    <li className="flex items-center gap-2 py-1">
      <PolkadotIdenticon size={20} publicKey={getPublicKey(address)} className="shrink-0" />
      <div className="text-xs leading-tight overflow-hidden">
        {supervisorIdentity ? (
          <>
            <span className="font-medium text-pine-shadow truncate block">
              {supervisorIdentity.value}
              {supervisorIdentity.verified && <CheckCircle size={12} className="inline ml-1 text-lilypad" />}
            </span>
            {!supervisorIdentity.verified && (
              <span className="text-pine-shadow-60 font-mono block truncate">{sliceMiddleAddr(address)}</span>
            )}
          </>
        ) : (
          <span className="text-pine-shadow font-mono truncate block">{sliceMiddleAddr(address)}</span>
        )}
      </div>
    </li>
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
        Project Summary
      </h4>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">Project Title</div>
          <div className="text-sm font-medium text-midnight-koi break-words">
            {formFields.projectTitle || "Untitled Project"}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">Supervisors</div>
          <div className="text-sm text-pine-shadow">
            {supervisors.length > 0 ? `${supervisors.length} supervisor${supervisors.length > 1 ? "s" : ""}` : "None"}
          </div>
          {supervisors.length > 1 && (
            <div className="text-xs text-pine-shadow-60 mb-1">Threshold: {formFields.signatoriesThreshold || 2}</div>
          )}
          {supervisors.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {supervisors.map((addr) => (
                <SupervisorListItem key={addr} address={addr} />
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">Milestones</div>
          <div className="text-sm text-pine-shadow">
            {milestones.length > 0 ? `${milestones.length} milestone${milestones.length > 1 ? "s" : ""}` : "None"}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">Submission Window</div>
          <div className="text-sm text-pine-shadow">
            {formFields.fundsExpiry || 1} week{(formFields.fundsExpiry || 1) > 1 ? "s" : ""} after funding
          </div>
        </div>

        <div className="pt-3 border-t border-pine-shadow-20">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-lilypad" />
            <span className="text-sm text-pine-shadow font-medium">Ready for Submission</span>
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
          RFP Body Preview
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="poster-btn btn-secondary flex items-center gap-1 text-xs py-2 px-3"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            className="poster-btn btn-primary flex items-center gap-1 text-xs py-2 px-3"
          >
            <Copy size={14} />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <MarkdownPreview markdown={markdown} onCopy={copyToClipboard} copied={copied} />

      <div className="mt-4 poster-alert alert-warning">
        <div className="flex items-start gap-2">
          <BadgeInfo size={16} className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <strong>Next Step:</strong> Copy this Markdown content and paste it into the body of your referendum once
            submitted.
          </div>
        </div>
      </div>
    </div>
  )
}


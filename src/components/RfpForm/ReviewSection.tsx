"use client";

import { TOKEN_SYMBOL } from "@/constants";
import { formatDate } from "@/lib/date";
import { formatCurrency, formatToken, formatUsd } from "@/lib/formatToken";
import { getPublicKey, sliceMiddleAddr } from "@/lib/ss58";
import { currencyRate$ } from "@/services/currencyRate";
import { PolkadotIdenticon } from "@polkadot-api/react-components";
import { useStateObservable } from "@react-rxjs/core";
import { addDays, differenceInDays } from "date-fns";
import {
  AlertCircle,
  ArrowLeftCircle,
  BadgeInfo,
  CheckCircle,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  FileText,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useState, type Dispatch, type FC, type SetStateAction } from "react";
import { useWatch, type UseFormSetValue } from "react-hook-form";
import { selectedAccount$ } from "../SelectAccount";
import { Checkbox } from "../ui/checkbox";
import { DatePicker } from "../ui/datepicker";
import { estimatedTimeline$, identity$ } from "./data";
import { markdown$ } from "./data/markdown";
import { currencyIsStables$, priceTotals$ } from "./data/price";
import {
  parseNumber,
  type FormSchema,
  type Milestone,
  type RfpControlType,
} from "./formSchema";
import { MarkdownPreview } from "./MarkdownPreview";

interface ReviewSectionProps {
  control: RfpControlType;
  isReturnFundsAgreed: boolean;
  setIsReturnFundsAgreed: Dispatch<SetStateAction<boolean>>;
  hasSufficientBalance: boolean;
  currentBalance: bigint | null;
  totalRequiredCost: bigint | null;
  setValue: UseFormSetValue<FormSchema>;
  submissionDeadline: Date | null; // Can be null if estimatedTimeline is null
  navigateToStep: (stepId: string) => void;
}

export const ReviewSection: FC<ReviewSectionProps> = ({
  control,
  isReturnFundsAgreed,
  setIsReturnFundsAgreed,
  hasSufficientBalance,
  currentBalance,
  totalRequiredCost,
  setValue,
  submissionDeadline,
  navigateToStep,
}) => {
  const selectedAccount = useStateObservable(selectedAccount$);

  const milestones = useWatch({ control, name: "milestones" });
  const prizePool = useWatch({ control, name: "prizePool" });
  const projectCompletion = useWatch({ control, name: "projectCompletion" });
  const supervisors = useWatch({ control, name: "supervisors" });
  const isChildRfp = useWatch({ control, name: "isChildRfp" });

  const milestonesTotal = getMilestonesTotal(milestones);
  const milestonesMatchesPrize = parseNumber(prizePool) === milestonesTotal;

  const enoughDevDays =
    projectCompletion && submissionDeadline
      ? differenceInDays(projectCompletion, submissionDeadline) >= 7
      : true;
  const hasSupervisors = supervisors && supervisors.length > 0;

  return (
    <div className="poster-card">
      <h3 className="text-3xl font-medium mb-8 text-midnight-koi">
        Review & Submit
      </h3>

      {/* Insufficient Balance Warning */}
      {selectedAccount &&
        !hasSufficientBalance &&
        totalRequiredCost !== null && (
          <div className="mb-6 poster-alert alert-error">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <div>
                <strong>Insufficient Balance:</strong> You need at least{" "}
                <strong className="font-semibold">
                  {formatToken(totalRequiredCost)}
                </strong>{" "}
                to launch this RFP. Your current balance is{" "}
                <strong className="font-semibold">
                  {formatToken(currentBalance)}
                </strong>
                . Please add funds or select another wallet.
              </div>
            </div>
          </div>
        )}

      {/* Summary Grid - Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <FundingSummary
          control={control}
          milestonesMatchesPrize={milestonesMatchesPrize}
          navigateToStep={navigateToStep}
        />
        <TimelineSummary
          control={control}
          enoughDevDays={enoughDevDays}
          submissionDeadline={submissionDeadline}
          setValue={setValue}
        />
        <ProjectSummary
          control={control}
          hasSupervisors={hasSupervisors}
          navigateToStep={navigateToStep}
        />
      </div>

      {/* Markdown Preview */}
      <ResultingMarkdown isChildRfp={isChildRfp} />

      {/* Final Confirmation */}
      {isChildRfp ? null : (
        <div className="mt-8 bg-canvas-cream border border-pine-shadow-20 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="return-funds"
              checked={isReturnFundsAgreed}
              onCheckedChange={(checked) => setIsReturnFundsAgreed(!!checked)}
              className="mt-1 border-pine-shadow data-[state=checked]:bg-lilypad data-[state=checked]:text-canvas-cream"
            />
            <label
              htmlFor="return-funds"
              className="text-pine-shadow leading-tight cursor-pointer text-sm"
            >
              I agree that any unused funds will be returned to the Treasury.
            </label>
          </div>
          {!isReturnFundsAgreed && (
            <div className="mt-3 poster-alert alert-error">
              <div className="flex items-center gap-2">
                <TriangleAlert size={16} />
                <div className="text-sm font-medium">
                  You must agree to return unused funds to the Treasury.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FundingSummaryListItem: FC<{
  label: string;
  value: string | number | null | undefined;
  isSubItem?: boolean;
  valueClass?: string;
  labelClass?: string;
}> = ({ label, value, isSubItem, valueClass, labelClass }) => (
  <div
    className={`flex justify-between items-baseline ${isSubItem ? "pl-4" : ""}`}
  >
    <span
      className={`text-sm ${isSubItem ? "text-pine-shadow-60" : "text-pine-shadow"} ${labelClass}`}
    >
      {label}
    </span>
    <span
      className={`font-medium text-midnight-koi tabular-nums ${isSubItem ? "text-xs" : ""} ${valueClass}`}
    >
      {value}
    </span>
  </div>
);

const FundingSummary: FC<{
  control: RfpControlType;
  milestonesMatchesPrize: boolean;
  navigateToStep: (stepId: string) => void;
}> = ({ control, milestonesMatchesPrize, navigateToStep }) => {
  const formFields = useWatch({ control });
  const milestonesTotal = getMilestonesTotal(formFields.milestones);
  const currencyRate = useStateObservable(currencyRate$);
  const currencyIsStables = useStateObservable(currencyIsStables$);
  const priceTotals = useStateObservable(priceTotals$);

  const formattedKsmString = priceTotals
    ? currencyIsStables
      ? formatCurrency(priceTotals.totalAmount, formFields.fundingCurrency!, 2)
      : formatCurrency(
          formFields.isChildRfp
            ? priceTotals.totalAmountToken
            : priceTotals.totalAmountWithBuffer,
          TOKEN_SYMBOL,
          2,
        )
    : null;

  let totalValueDisplay = "Calculating...";
  let valueUnitDisplay = "";

  if (formattedKsmString) {
    const parts = formattedKsmString.split(" ");
    if (parts.length >= 1) {
      totalValueDisplay = parts[0];
      if (parts.length >= 2) {
        valueUnitDisplay = parts[1];
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
        <FundingSummaryListItem
          label="Prize Pool"
          value={formatUsd(formFields.prizePool)}
        />

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
          <span className="font-medium tabular-nums">
            {formatUsd(milestonesTotal)}
          </span>
        </div>

        <FundingSummaryListItem
          label="Finder's Fee"
          value={formatUsd(formFields.findersFee)}
        />
        <FundingSummaryListItem
          label="Supervisor's Fee"
          value={formatUsd(formFields.supervisorsFee)}
        />

        {/* Enhanced Total + Buffer Section */}
        <div className="pt-4 mt-4 border-t-2 border-lake-haze">
          <div className="flex justify-between items-start">
            <div className="flex flex-col items-start">
              <span className="text-base font-semibold text-midnight-koi">
                Total
              </span>
              {currencyIsStables || formFields.isChildRfp ? null : (
                <span className="text-xs text-pine-shadow-60">+25% Buffer</span>
              )}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xl font-bold text-midnight-koi tabular-nums">
                {totalValueDisplay}
              </span>
              {valueUnitDisplay && (
                <span className="text-xs text-pine-shadow-60">
                  {valueUnitDisplay}
                </span>
              )}
            </div>
          </div>
        </div>

        {currencyIsStables ? null : (
          <div className="text-right text-xs text-pine-shadow-60 mt-1 tabular-nums">
            1 {TOKEN_SYMBOL} = {formatCurrency(currencyRate, "USD")}
          </div>
        )}
      </div>

      {!milestonesMatchesPrize && (
        <div className="mt-4 flex items-center gap-2 text-tomato-stamp">
          <TriangleAlert size={16} />
          <span className="text-sm font-medium">
            Milestones must match prize pool.
          </span>
          <button
            type="button"
            onClick={() => navigateToStep("scope")}
            className="inline-flex items-center gap-1 underline text-tomato-stamp hover:text-midnight-koi text-sm font-medium"
          >
            <ArrowLeftCircle size={14} />
            Fix
          </button>
        </div>
      )}
    </div>
  );
};

const TimelineSummary: FC<{
  control: RfpControlType;
  enoughDevDays: boolean;
  submissionDeadline: Date | null;
  setValue: UseFormSetValue<FormSchema>;
}> = ({ control, enoughDevDays, submissionDeadline, setValue }) => {
  const estimatedTimeline = useStateObservable(estimatedTimeline$);
  const projectCompletion = useWatch({ name: "projectCompletion", control });
  const isChildRfp = useWatch({ name: "isChildRfp", control });

  const devDays =
    submissionDeadline &&
    projectCompletion &&
    differenceInDays(projectCompletion, submissionDeadline);

  const daysToLateSubmission = estimatedTimeline?.referendumSubmissionDeadline
    ? differenceInDays(
        estimatedTimeline.referendumSubmissionDeadline,
        new Date(),
      )
    : null;
  const lateSubmissionDiff = estimatedTimeline?.lateBountyFunding
    ? differenceInDays(
        estimatedTimeline.lateBountyFunding,
        estimatedTimeline.bountyFunding,
      )
    : null;

  const devDaysValue = devDays != null ? Math.round(devDays) : null;
  const devDaysUnit = "days";

  const minCompletionDate = submissionDeadline
    ? addDays(submissionDeadline, 7)
    : new Date();

  return (
    <div className="bg-canvas-cream border border-sun-bleach rounded-lg p-6">
      <h4 className="flex items-center gap-2 text-lg font-medium text-midnight-koi mb-4">
        <Clock size={20} className="text-sun-bleach" />
        Timeline
      </h4>

      <div className="space-y-3">
        {isChildRfp ? null : (
          <div className="grid grid-cols-[1fr,auto] gap-x-4 items-baseline">
            <span className="text-sm text-pine-shadow">
              Referendum Executed
            </span>
            <span className="text-xs text-midnight-koi font-mono tabular-nums text-right">
              {formatDate(estimatedTimeline?.referendumDeadline)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-[1fr,auto] gap-x-4 items-baseline py-2 bg-sun-bleach bg-opacity-10 px-3 -mx-3 rounded">
          <span className="font-medium text-midnight-koi">RFP Funding</span>
          <span className="font-medium text-midnight-koi text-xs font-mono tabular-nums text-right">
            {formatDate(estimatedTimeline?.bountyFunding)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr,auto] gap-x-4 items-baseline">
          <span className="text-sm text-pine-shadow">
            Funds Expiry Deadline
          </span>
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
          <span className="text-base font-semibold text-midnight-koi pt-1">
            Development Time
          </span>
          <div className="flex flex-col items-end">
            <span className="text-xl font-bold text-midnight-koi tabular-nums">
              {devDaysValue != null ? devDaysValue : "—"}
            </span>
            {devDaysValue != null && (
              <span className="text-xs text-pine-shadow-60">{devDaysUnit}</span>
            )}
          </div>
        </div>
      </div>

      {!enoughDevDays && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-tomato-stamp">
            <TriangleAlert size={16} />
            <span className="text-sm font-medium">
              Development time must be at least 7 days after funds expiry.
            </span>
          </div>
          <div className="pl-1">
            <DatePicker
              value={projectCompletion}
              onChange={(date) =>
                setValue("projectCompletion", date, { shouldValidate: true })
              }
              disabled={(date) => date.getTime() < minCompletionDate.getTime()}
            />
            <p className="text-xs text-pine-shadow-60 mt-1">
              Funding expiry is{" "}
              {submissionDeadline ? formatDate(submissionDeadline) : "N/A"}.
              Select a date on or after {formatDate(minCompletionDate)}.
            </p>
          </div>
        </div>
      )}

      {enoughDevDays &&
        devDays != null &&
        daysToLateSubmission != null &&
        daysToLateSubmission < 1 && (
          <div className="mt-4 poster-alert alert-warning">
            <div className="flex items-center gap-2 text-xs">
              <TriangleAlert size={14} />
              <div className="font-medium">
                Late submission may delay funding by{" "}
                {Math.round(lateSubmissionDiff!)} days.
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

const SupervisorListItem: FC<{ address: string }> = ({ address }) => {
  const supervisorIdentity = useStateObservable(identity$(address));

  return (
    <li className="flex items-center gap-2 py-1">
      <PolkadotIdenticon
        size={20}
        publicKey={getPublicKey(address)}
        className="shrink-0"
      />
      <div className="text-xs leading-tight overflow-hidden">
        {supervisorIdentity ? (
          <>
            <span className="font-medium text-pine-shadow truncate block">
              {supervisorIdentity.value}
              {supervisorIdentity.verified && (
                <CheckCircle size={12} className="inline ml-1 text-lilypad" />
              )}
            </span>
            {!supervisorIdentity.verified && (
              <span className="text-pine-shadow-60 font-mono block truncate">
                {sliceMiddleAddr(address)}
              </span>
            )}
          </>
        ) : (
          <span className="text-pine-shadow font-mono truncate block">
            {sliceMiddleAddr(address)}
          </span>
        )}
      </div>
    </li>
  );
};

const ProjectSummary: FC<{
  control: RfpControlType;
  hasSupervisors: boolean;
  navigateToStep: (stepId: string) => void;
}> = ({ control, hasSupervisors, navigateToStep }) => {
  const formFields = useWatch({ control });
  const supervisors = formFields.supervisors || [];
  const milestones = formFields.milestones || [];

  return (
    <div className="bg-canvas-cream border border-lilypad rounded-lg p-6">
      <h4 className="flex items-center gap-2 text-lg font-medium text-midnight-koi mb-4">
        <Users size={20} className="text-lilypad" />
        Project Summary
      </h4>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">
            Project Title
          </div>
          <div className="text-sm font-medium text-midnight-koi break-words">
            {formFields.projectTitle || "Untitled Project"}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">
            Supervisors
          </div>
          <div className="text-sm text-pine-shadow">
            {supervisors.length > 0
              ? `${supervisors.length} supervisor${supervisors.length > 1 ? "s" : ""}`
              : "None"}
          </div>
          {supervisors.length > 1 && (
            <div className="text-xs text-pine-shadow-60 mb-1">
              Threshold: {formFields.signatoriesThreshold || 2}
            </div>
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
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">
            Milestones
          </div>
          <div className="text-sm text-pine-shadow">
            {milestones.length > 0
              ? `${milestones.length} milestone${milestones.length > 1 ? "s" : ""}`
              : "None"}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-pine-shadow-60 uppercase tracking-wide mb-1">
            Submission Window
          </div>
          <div className="text-sm text-pine-shadow">
            {formFields.fundsExpiry || 1} week
            {(formFields.fundsExpiry || 1) > 1 ? "s" : ""} after funding
          </div>
        </div>

        <div className="pt-3 border-t border-pine-shadow-20">
          {hasSupervisors ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-lilypad" />
              <span className="text-sm text-pine-shadow font-medium">
                Ready for Submission
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-tomato-stamp">
              <TriangleAlert size={16} />
              <span className="text-sm font-medium">Supervisor Required.</span>
              <button
                type="button"
                onClick={() => navigateToStep("supervisors")}
                className="inline-flex items-center gap-1 underline text-tomato-stamp hover:text-midnight-koi text-sm font-medium"
              >
                <ArrowLeftCircle size={14} />
                Fix
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getMilestonesTotal = (milestones: Partial<Milestone>[] | undefined) =>
  (milestones ?? [])
    .map((milestone) => parseNumber(milestone.amount))
    .filter((v) => v != null)
    .reduce((a, b) => a + b, 0);

const ResultingMarkdown: FC<{ isChildRfp: boolean }> = ({ isChildRfp }) => {
  const [copied, setCopied] = useState(false);
  const markdown = useStateObservable(markdown$);

  const copyToClipboard = async () => {
    if (markdown) {
      try {
        await navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        const textArea = document.createElement("textarea");
        textArea.value = markdown;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (execErr) {
          console.error("Fallback copy failed:", execErr);
        }
        document.body.removeChild(textArea);
      }
    }
  };

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
            onClick={copyToClipboard}
            className="poster-btn btn-primary flex items-center gap-1 text-xs py-2 px-3"
          >
            <Copy size={14} />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <MarkdownPreview markdown={markdown} />

      <div className="mt-4 poster-alert alert-warning">
        <div className="flex items-start gap-2">
          <BadgeInfo size={16} className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <strong>Next Step:</strong> Copy this Markdown content and paste it
            into the body of your {isChildRfp ? " child bounty " : "referendum"}{" "}
            once submitted.
          </div>
        </div>
      </div>
    </div>
  );
};

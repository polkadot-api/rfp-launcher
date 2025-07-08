import { REFERENDUM_PRICE_BUFFER, TOKEN_SYMBOL } from "@/constants";
import { format } from "date-fns";
import type { DeepPartial } from "react-hook-form";
import { type FormSchema, parseNumber } from "../formSchema";
import { combineLatest, map } from "rxjs";
import { formValue$ } from "./formValue";
import { bountyValue$ } from "./price";
import { supervisorIdentities$ } from "./identity";
import { state } from "@react-rxjs/core";

function generateMarkdown(
  data: DeepPartial<FormSchema>,
  totalAmount: number | null,
  identities: Record<string, string | undefined>,
) {
  // // Don't require full validation - work with partial data
  // console.log("Generating markdown with data:", data);
  // console.log("Total amount with buffer:", totalAmountWithBuffer);
  // console.log("Identities:", identities);

  // Extract values with fallbacks
  const projectTitle = data.projectTitle || "Untitled Project";
  const prizePool = parseNumber(data.prizePool) || 0;
  const findersFee = parseNumber(data.findersFee) || 0;
  const supervisorsFee = parseNumber(data.supervisorsFee) || 0;
  const supervisors = data.supervisors || [];
  const fundsExpiry = parseNumber(data.fundsExpiry) || 1;
  const projectCompletion = data.projectCompletion;
  const projectScope = data.projectScope || "";
  const milestones = data.milestones || [];
  const currency = data.fundingCurrency ?? TOKEN_SYMBOL;

  const formattedAmount = totalAmount
    ? Math.round(totalAmount).toLocaleString()
    : "TBD";
  const total =
    currency === TOKEN_SYMBOL
      ? data.isChildRfp
        ? `Total ${formattedAmount} ${TOKEN_SYMBOL}`
        : `${formattedAmount} ${TOKEN_SYMBOL} Requested (Amount + ${REFERENDUM_PRICE_BUFFER * 100}%)`
      : `Total ${formattedAmount} ${currency} Requested`;

  // Generate markdown even with partial data
  const markdown = `# ${projectTitle}

Prize Pool: $${prizePool.toLocaleString()}  
Finder's Fee: $${findersFee.toLocaleString()}  
Supervisors: $${supervisorsFee.toLocaleString()}  

${total}

## Supervisors

${
  supervisors.length > 0
    ? supervisors
        .filter((v) => v != null)
        .map((addr) => `- ${identities[addr] || addr}`)
        .join("  \n")
    : "- TBD"
}

${data.isChildRfp ? "" : "Excess or unused funds will be returned to the treasury by the supervisors (bounty curators)."}

## Timeline

${format(new Date(), "eeee, LLLL dd")} - Single-ref RFP + supervisors ✅  
${fundsExpiry} Week${fundsExpiry !== 1 ? "s" : ""} after RFP funding - submission deadline  
${projectCompletion ? format(projectCompletion, "eeee, LLLL dd") : "TBD"} - Project completion  

## Project Scope

${projectScope || "Project scope to be defined..."}

## Milestones

${
  milestones.length > 0
    ? milestones
        .filter((v) => v != null)
        .map((milestone, i) => {
          const amount = parseNumber(milestone.amount) || 0;
          const title = milestone.title || `Milestone ${i + 1}`;
          const description =
            milestone.description || "Description to be added...";

          return `### Milestone ${i + 1}, ${title}  
$${amount.toLocaleString()} USD

${description}`;
        })
        .join("\n\n")
    : "### Milestone 1, TBD  \n$0 USD\n\nMilestones to be defined..."
}
`;

  // console.log("Generated markdown:", markdown);
  return markdown;
}

export const markdown$ = state(
  combineLatest({
    formValue: formValue$,
    bountyValue: bountyValue$,
    supervisorIdentities: supervisorIdentities$.pipe(
      map((map) =>
        Object.fromEntries(
          [...map.entries()].map(([key, id]) => [key, id?.value]),
        ),
      ),
    ),
  }).pipe(
    map(({ formValue, bountyValue, supervisorIdentities }) =>
      generateMarkdown(formValue, bountyValue, supervisorIdentities),
    ),
  ),
  generateMarkdown({}, null, {}),
);

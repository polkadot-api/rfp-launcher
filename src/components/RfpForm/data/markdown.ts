import { REFERENDUM_PRICE_BUFFER, TOKEN_SYMBOL } from "@/constants";
import { format } from "date-fns";
import { DeepPartialSkipArrayKey } from "react-hook-form";
import { formSchema, FormSchema } from "../formSchema";

export function generateMarkdown(
  data: DeepPartialSkipArrayKey<FormSchema>,
  totalAmountWithBuffer: number | null,
  identities: Record<string, string | undefined>
) {
  let parsed: FormSchema;
  try {
    parsed = formSchema.parse(data);
  } catch (_) {
    return null;
  }

  return `\
# ${parsed.projectTitle}

Prize Pool: $${parsed.prizePool.toLocaleString()}  
Finder's Fee: $${parsed.findersFee.toLocaleString()}  
Supervisors: $${parsed.supervisorsFee.toLocaleString()}  

${
  totalAmountWithBuffer ? Math.round(totalAmountWithBuffer) : "???"
} ${TOKEN_SYMBOL} Requested (Amount + ${REFERENDUM_PRICE_BUFFER * 100}%)

## Supervisors (Bounty Curators)

${parsed.supervisors
  .map((addr) => `- ${identities[addr] ?? addr}`)
  .join("  \n")}

Excess or unused funds will be returned to the treasury by Bounty Curators.

## Timeline

${format(new Date(), "eeee, LLLL dd")} - Single-ref Bounty + Curators ✅  
${parsed.fundsExpiry} Weeks after Bounty Funding - Submission Deadline  
${format(parsed.projectCompletion, "eeee, LLLL dd")} - Project Completion  

## Project Scope

${parsed.projectScope}

## Milestones

${parsed.milestones
  .map(
    (milestone, i) => `\
### Milestone ${i + 1}, ${milestone.title}  
$${milestone.amount} USD

${milestone.description}
`
  )
  .join("\n\n")}
`;
}

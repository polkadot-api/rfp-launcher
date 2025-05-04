import { REFERENDUM_PRICE_BUFFER, TOKEN_SYMBOL } from "@/constants";
import { formSchema, FormSchema } from "./formSchema";
import { format } from "date-fns";
import { DeepPartialSkipArrayKey } from "react-hook-form";

export function generateMarkdown(
  data: DeepPartialSkipArrayKey<FormSchema>,
  conversionRate: number,
  identities: Record<string, string>
) {
  let parsed: FormSchema;
  try {
    parsed = formSchema.parse(data);
  } catch (_) {
    return null;
  }

  const totalAmount = [
    parsed.prizePool,
    parsed.findersFee,
    parsed.supervisorsFee,
  ].reduce((a, b) => a + b, 0);
  const totalAmountToken = totalAmount / conversionRate;
  const totalAmountWithBuffer =
    totalAmountToken * (1 + REFERENDUM_PRICE_BUFFER);

  return `\
Prize Pool: $${parsed.prizePool.toLocaleString()}  
Finder's Fee: $${parsed.findersFee.toLocaleString()}  
Supervisors: $${parsed.supervisorsFee.toLocaleString()}  

${Math.round(totalAmountWithBuffer)} ${TOKEN_SYMBOL} Requested (Amount + ${
    REFERENDUM_PRICE_BUFFER * 100
  }%)

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

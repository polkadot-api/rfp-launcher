import { REFERENDUM_PRICE_BUFFER, TOKEN_SYMBOL } from "@/constants"
import { format } from "date-fns"
import type { DeepPartialSkipArrayKey } from "react-hook-form"
import { type FormSchema, parseNumber } from "../formSchema"

export function generateMarkdown(
  data: DeepPartialSkipArrayKey<FormSchema>,
  totalAmountWithBuffer: number | null,
  identities: Record<string, string | undefined>,
) {
  // Don't require full validation - work with partial data
  console.log("Generating markdown with data:", data)
  console.log("Total amount with buffer:", totalAmountWithBuffer)
  console.log("Identities:", identities)

  // Extract values with fallbacks
  const projectTitle = data.projectTitle || "Untitled Project"
  const prizePool = parseNumber(data.prizePool) || 0
  const findersFee = parseNumber(data.findersFee) || 0
  const supervisorsFee = parseNumber(data.supervisorsFee) || 0
  const supervisors = data.supervisors || []
  const fundsExpiry = parseNumber(data.fundsExpiry) || 1
  const projectCompletion = data.projectCompletion
  const projectScope = data.projectScope || ""
  const milestones = data.milestones || []

  // Generate markdown even with partial data
  const markdown = `# ${projectTitle}

Prize Pool: $${prizePool.toLocaleString()}  
Finder's Fee: $${findersFee.toLocaleString()}  
Supervisors: $${supervisorsFee.toLocaleString()}  

${
  totalAmountWithBuffer ? Math.round(totalAmountWithBuffer).toLocaleString() : "TBD"
} ${TOKEN_SYMBOL} Requested (Amount + ${REFERENDUM_PRICE_BUFFER * 100}%)

## Supervisors (Bounty Curators)

${supervisors.length > 0 ? supervisors.map((addr) => `- ${identities[addr] || addr}`).join("  \n") : "- TBD"}

Excess or unused funds will be returned to the treasury by Bounty Curators.

## Timeline

${format(new Date(), "eeee, LLLL dd")} - Single-ref Bounty + Curators ✅  
${fundsExpiry} Week${fundsExpiry !== 1 ? "s" : ""} after Bounty Funding - Submission Deadline  
${projectCompletion ? format(projectCompletion, "eeee, LLLL dd") : "TBD"} - Project Completion  

## Project Scope

${projectScope || "Project scope to be defined..."}

## Milestones

${
  milestones.length > 0
    ? milestones
        .map((milestone, i) => {
          const amount = parseNumber(milestone.amount) || 0
          const title = milestone.title || `Milestone ${i + 1}`
          const description = milestone.description || "Description to be added..."

          return `### Milestone ${i + 1}, ${title}  
$${amount.toLocaleString()} USD

${description}`
        })
        .join("\n\n")
    : "### Milestone 1, TBD  \n$0 USD\n\nMilestones to be defined..."
}
`

  console.log("Generated markdown:", markdown)
  return markdown
}


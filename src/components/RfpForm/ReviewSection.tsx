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
import { parseNumber, RfpControlType } from "./formSchema";
import { OctagonAlert } from "lucide-react";
import { TOKEN_SYMBOL } from "@/constants";

export const ReviewSection: FC<{ control: RfpControlType }> = ({ control }) => {
  const formFields = useWatch({ control });

  const milestonesTotal = (formFields.milestones ?? [])
    .map((milestone) => parseNumber(milestone.amount))
    .filter((v) => v != null)
    .reduce((a, b) => a + b, 0);
  const milestonesMatchPrize =
    parseNumber(formFields.prizePool) === milestonesTotal;

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
  const totalAmountWithBuffer = totalAmountToken * 1.25;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review and Submit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                className={milestonesMatchPrize ? "" : "bg-destructive/10"}
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
                <TableCell className="font-medium">
                  Total Amount (KSM)
                </TableCell>
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
          {milestonesMatchPrize ? null : (
            <div className="text-destructive py-2 flex items-center gap-1">
              <OctagonAlert className="inline-block" />
              <div>Milestones must add up to the total prize pool.</div>
            </div>
          )}
        </div>
        <div className="text-right">
          <Button type="submit" disabled={!milestonesMatchPrize}>
            Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

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

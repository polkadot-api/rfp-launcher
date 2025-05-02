import { Control } from "react-hook-form";
import { z, ZodType } from "zod";

export const formSchema = z.object({
  prizePool: z.coerce.number().positive(),
  findersFee: z.coerce.number(),
  supervisorsFee: z.coerce.number(),
  supervisors: z.array(z.string()),
  // fundsExpiry: z.date(),
  // projectCompletion: z.date(),
  // projectScope: z.string(),
  // milestones: z.array(
  //   z.object({
  //     description: z.string(),
  //     amount: z.coerce.number(),
  //   })
  // ),
});

// zod with .coerce can work with strings, but TS complains.
export const emptyNumeric = "" as unknown as number;

export type FormSchema = typeof formSchema extends ZodType<infer R> ? R : never;

export type RfpFormContext = unknown;
export type RfpControlType = Control<FormSchema, RfpFormContext, FormSchema>;

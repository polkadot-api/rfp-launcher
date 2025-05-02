import { Control, FieldValues, Path } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { SelectItem } from "../ui/select";
import { SelectInput } from "../ui/selectInput";
import { FC } from "react";
import { RfpControlType } from "./formSchema";

const findersFeeValues = [1000, 2000, 5000, 10000];

export const FundingSection: FC<{ control: RfpControlType }> = ({
  control,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Funding</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <FormInputField
        control={control}
        name="prizePool"
        label="Prize Pool (USD)"
        description="Amount awarded to implementors"
      />
      <FormField
        control={control}
        name="findersFee"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Finder's Fee (USD)</FormLabel>
            <FormControl>
              <SelectInput
                {...field}
                value={String(field.value)}
                placeholder="value"
              >
                {findersFeeValues.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectInput>
            </FormControl>
            <FormDescription>
              Amount awarded to the referral of the implementors
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormInputField
        control={control}
        name="supervisorsFee"
        label="Supervisors' Fee (USD)"
        description="Amount awarded split amongst the supervisors"
      />
    </CardContent>
  </Card>
);

const FormInputField = <T extends FieldValues>({
  control,
  name,
  label,
  description,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input placeholder="value" {...field} value={field.value ?? ""} />
        </FormControl>
        {description ? <FormDescription>{description}</FormDescription> : null}
        <FormMessage />
      </FormItem>
    )}
  />
);

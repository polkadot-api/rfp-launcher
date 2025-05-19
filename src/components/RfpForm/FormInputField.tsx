import { HTMLInputTypeAttribute } from "react";
import { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";

export const FormInputField = <T extends FieldValues>({
  control,
  name,
  label,
  description,
  type,
  min,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
  type?: HTMLInputTypeAttribute;
  min?: number | string | undefined;
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input
            type={type}
            min={min}
            placeholder="Value"
            onWheel={
              type === "number" ? (evt) => evt.currentTarget.blur() : undefined
            }
            {...field}
            value={field.value ?? ""}
          />
        </FormControl>
        {description ? <FormDescription>{description}</FormDescription> : null}
        <FormMessage />
      </FormItem>
    )}
  />
);

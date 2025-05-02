import { FC, PropsWithChildren } from "react";
import { Select, SelectContent, SelectTrigger, SelectValue } from "./select";

export const SelectInput: FC<
  PropsWithChildren<{
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
  }>
> = ({ children, placeholder, onChange, ...props }) => {
  return (
    <Select {...props} onValueChange={(v) => onChange?.(v)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
};

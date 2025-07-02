import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { FC } from "react";
import { Matcher } from "react-day-picker";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { FormControl } from "./form";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export const DatePicker: FC<{
  value?: Date | undefined;
  onChange?: (value: Date | undefined) => void;
  disabled?: Matcher;
}> = ({ value, onChange, disabled }) => (
  <Popover>
    <PopoverTrigger asChild>
      <FormControl>
        <Button
          variant={"outline"}
          className={cn(
            "w-full pl-3 text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          {value ? formatDate(value) : <span>Pick a date</span>}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </FormControl>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={value}
        onSelect={onChange}
        disabled={disabled}
        initialFocus
      />
    </PopoverContent>
  </Popover>
);

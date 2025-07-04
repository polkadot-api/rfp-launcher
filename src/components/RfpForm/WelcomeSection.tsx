import type { FC } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RfpControlType } from "./formSchema";
import { FormControl, FormField, FormItem, FormMessage } from "../ui/form";

const rfpTypeLabel = {
  new: "New RFP",
  child: "Child bounty",
};

export const WelcomeSection: FC<{ control: RfpControlType }> = ({
  control,
}) => (
  <div className="poster-card relative overflow-hidden">
    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: `url('${import.meta.env.BASE_URL}rocket.jpg?height=400&width=1200')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "blur(2px) saturate(0.95)",
        mixBlendMode: "multiply",
      }}
    />

    {/* Content overlay */}
    <div className="relative z-10 max-w-2xl">
      <h2 className="text-4xl font-medium mb-6 text-midnight-koi">
        Launch your request for proposal
      </h2>

      <div className="space-y-4 text-lg leading-relaxed text-pine-shadow">
        <p>
          This tool guides you through creating an RFP (request for proposal).
        </p>
        <p>
          After completing the form, you'll submit three transactions to set up
          the RFP. Then we'll provide a pre-formatted body for your referendum.
        </p>
        <p>
          If you are already a curator for an existing bounty, you can choose to
          launch a child bounty RFP, which will use the funds from that bounty
          instead of creating a referendum for the treasury.
        </p>

        <FormField
          control={control}
          name="isChildRfp"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormControl>
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(v === "true")}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {field.value ? rfpTypeLabel.child : rfpTypeLabel.new}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">{rfpTypeLabel.new}</SelectItem>
                    <SelectItem value="true">{rfpTypeLabel.child}</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage className="text-tomato-stamp text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-8 text-sm text-pine-shadow-60">
        Grab some lemonade and let's get started.
      </div>
    </div>
  </div>
);

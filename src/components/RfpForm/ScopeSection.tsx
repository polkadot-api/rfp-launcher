import { Trash2 } from "lucide-react";
import { ChangeEvent, FC } from "react";
import { ControllerRenderProps } from "react-hook-form";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  emptyNumeric,
  FormSchema,
  Milestone,
  RfpControlType,
} from "./formSchema";

export const ScopeSection: FC<{ control: RfpControlType }> = ({ control }) => (
  <Card>
    <CardHeader>
      <CardTitle>Project Scope</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <FormField
        control={control}
        name="projectScope"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Scope</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Markdown"
                className="min-h-32 font-mono"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="milestones"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Milestones</FormLabel>
            <FormControl>
              <MilestonesControl {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </CardContent>
  </Card>
);

const MilestonesControl: FC<
  ControllerRenderProps<FormSchema, "milestones">
> = ({ value, onChange }) => {
  const editProps = (
    milestone: Milestone,
    idx: number,
    prop: keyof Milestone
  ) => ({
    value: milestone[prop],
    onChange: (
      evt: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>
    ) => {
      // zod does coertion for us
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newValue: any = [...value];
      newValue[idx] = { ...newValue[idx] };
      newValue[idx][prop] = evt.currentTarget.value;
      onChange(newValue);
    },
  });

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {value.map((milestone, i) => (
          <li key={i} className="border rounded p-2 space-y-4">
            <div className="flex items-center gap-1 overflow-hidden justify-between">
              <h3 className="font-bold text-foreground/60">
                Milestone {i + 1}
              </h3>
              <Button
                variant="destructive"
                className="mx-1 h-auto"
                onClick={() => onChange(value.filter((_, i2) => i !== i2))}
              >
                <Trash2 />
              </Button>
            </div>
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Text"
                  {...editProps(milestone, i, "title")}
                />
              </FormControl>
            </FormItem>
            <FormItem>
              <FormLabel>Amount (USD)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Value"
                  {...editProps(milestone, i, "amount")}
                />
              </FormControl>
            </FormItem>
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...editProps(milestone, i, "description")}
                  placeholder="Markdown"
                  className="min-h-32 font-mono"
                />
              </FormControl>
            </FormItem>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange([
            ...value,
            {
              title: "",
              amount: emptyNumeric,
              description: "",
            } satisfies Milestone,
          ])
        }
      >
        Add New Milestone
      </Button>
    </div>
  );
};

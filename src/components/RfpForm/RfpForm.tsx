import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { SubmitModal } from "../SubmitModal";
import { submit } from "../SubmitModal/submit.state";
import { Form } from "../ui/form";
import { emptyNumeric, FormSchema, formSchema } from "./formSchema";
import { FundingSection } from "./FundingSection";
import { ReviewSection } from "./ReviewSection";
import { ScopeSection } from "./ScopeSection";
import { SupervisorsSection } from "./SupervisorsSection";
import { TimelineSection } from "./TimelineSection";

const defaultValues: Partial<FormSchema> = {
  prizePool: emptyNumeric,
  findersFee: emptyNumeric,
  supervisorsFee: emptyNumeric,
  supervisors: [],
  signatoriesThreshold: 2,
  projectCompletion: undefined,
  fundsExpiry: 1,
  projectTitle: "",
  projectScope: "",
  milestones: [],
};

export const RfpForm = () => {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      ...JSON.parse(localStorage.getItem("rfp-form") ?? "{}", (key, value) => {
        if (key === "projectCompletion" && value) {
          return new Date(value);
        }
        return value;
      }),
    },
  });

  const watch = form.watch;
  useEffect(() => {
    const sub = watch((data) => {
      localStorage.setItem("rfp-form", JSON.stringify(data));
    });
    return () => sub.unsubscribe();
  }, [watch]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <FundingSection control={form.control} />
        <SupervisorsSection control={form.control} />
        <TimelineSection control={form.control} />
        <ScopeSection control={form.control} />
        <ReviewSection
          control={form.control}
          onReset={() => {
            if (!confirm("Are you sure you want to reset the form?")) return;

            Object.entries(defaultValues).forEach(([key, value]) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              form.setValue(key as any, value)
            );
          }}
        />
      </form>
      <SubmitModal />
    </Form>
  );
};

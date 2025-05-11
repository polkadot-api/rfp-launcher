import { zodResolver } from "@hookform/resolvers/zod";
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

export const RfpForm = () => {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prizePool: emptyNumeric,
      findersFee: emptyNumeric,
      supervisorsFee: emptyNumeric,
      supervisors: [],
      projectCompletion: undefined,
      fundsExpiry: 1,
      projectTitle: "",
      projectScope: "",
      milestones: [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <FundingSection control={form.control} />
        <SupervisorsSection control={form.control} />
        <TimelineSection control={form.control} />
        <ScopeSection control={form.control} />
        <ReviewSection control={form.control} />
      </form>
      <SubmitModal />
    </Form>
  );
};

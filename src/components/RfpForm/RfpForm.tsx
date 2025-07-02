"use client";

import { selectedAccount$ } from "@/components/SelectAccount";
import { zodResolver } from "@hookform/resolvers/zod";
import { useStateObservable } from "@react-rxjs/core";
import { addWeeks, differenceInDays } from "date-fns";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { SubmitModal } from "../SubmitModal";
import { submit } from "../SubmitModal/modalActions";
import { Form } from "../ui/form";
import { estimatedCost$, estimatedTimeline$, signerBalance$ } from "./data";
import { emptyNumeric, type FormSchema, formSchema } from "./formSchema";
import { FundingSection } from "./FundingSection";
import { ReviewSection } from "./ReviewSection";
import { ScopeSection } from "./ScopeSection";
import { SupervisorsSection } from "./SupervisorsSection";
import { TimelineSection } from "./TimelineSection";
import { WelcomeSection } from "./WelcomeSection";

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

const steps = [
  { id: "welcome", title: "Welcome", Component: WelcomeSection },
  { id: "funding", title: "Funding", Component: FundingSection },
  { id: "supervisors", title: "Supervisors", Component: SupervisorsSection },
  { id: "timeline", title: "Timeline", Component: TimelineSection },
  { id: "scope", title: "Project Scope", Component: ScopeSection },
];

export const RfpForm = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isReturnFundsAgreed, setIsReturnFundsAgreed] = useState(false);

  const estimatedCost = useStateObservable(estimatedCost$);
  const currentBalance = useStateObservable(signerBalance$);
  const selectedAccount = useStateObservable(selectedAccount$);
  const estimatedTimeline = useStateObservable(estimatedTimeline$);

  const methods = useForm<FormSchema>({
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
    mode: "onChange",
  });

  const {
    watch,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isValid: isFormValid },
  } = methods;

  useEffect(() => {
    const subscription = watch((data) => {
      localStorage.setItem("rfp-form", JSON.stringify(data));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const navigateToStepById = (stepId: string) => {
    const stepIndex = steps.findIndex((step) => step.id === stepId);
    if (stepIndex !== -1) {
      setCurrentStepIndex(stepIndex);
      window.scrollTo(0, 0);
    }
  };

  const handleNext = async () => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length));
    window.scrollTo(0, 0);
  };

  const handlePrev = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };

  const handleResetForm = () => {
    if (
      !confirm(
        "Are you sure you want to reset the form? This will clear all your progress.",
      )
    )
      return;
    Object.entries(defaultValues).forEach(([key, value]) =>
      setValue(key as keyof FormSchema, value as any),
    );
    setIsReturnFundsAgreed(false);
    setCurrentStepIndex(0);
    window.scrollTo(0, 0);
  };

  const isReviewStep = currentStepIndex === steps.length;
  const ActiveStepComponent = isReviewStep
    ? null
    : steps[currentStepIndex].Component;
  const hasErrors = Object.keys(errors).length > 0;

  const totalRequiredCost = estimatedCost
    ? estimatedCost.deposits + estimatedCost.fees
    : null;

  const hasSufficientBalanceForButton =
    selectedAccount !== null &&
    currentBalance !== null &&
    totalRequiredCost !== null
      ? currentBalance >= totalRequiredCost
      : selectedAccount === null;

  const fundsExpiry = getValues("fundsExpiry");
  const projectCompletion = getValues("projectCompletion");
  const submissionDeadlineForDevDays = estimatedTimeline
    ? addWeeks(estimatedTimeline.bountyFunding, fundsExpiry || 1)
    : new Date();
  const enoughDevDays = projectCompletion
    ? differenceInDays(projectCompletion, submissionDeadlineForDevDays) >= 7
    : true;

  const supervisors = getValues("supervisors");

  const isSubmitDisabled =
    hasErrors ||
    !isFormValid ||
    (isReviewStep && !isReturnFundsAgreed) ||
    (isReviewStep &&
      selectedAccount !== null &&
      !hasSufficientBalanceForButton) ||
    (isReviewStep && !enoughDevDays) ||
    (isReviewStep && (!supervisors || supervisors.length === 0));

  const hasSufficientBalanceForWarning =
    selectedAccount !== null &&
    currentBalance !== null &&
    totalRequiredCost !== null
      ? currentBalance >= totalRequiredCost
      : true;

  return (
    <FormProvider {...methods}>
      <Form {...methods}>
        <form onSubmit={handleSubmit(submit)} className="space-y-12">
          <div className="poster-section">
            {!ActiveStepComponent ? (
              <ReviewSection
                control={control}
                isReturnFundsAgreed={isReturnFundsAgreed}
                setIsReturnFundsAgreed={setIsReturnFundsAgreed}
                hasSufficientBalance={hasSufficientBalanceForWarning}
                currentBalance={currentBalance}
                totalRequiredCost={totalRequiredCost}
                setValue={setValue}
                submissionDeadline={submissionDeadlineForDevDays}
                navigateToStep={navigateToStepById} // Pass the navigation function
              />
            ) : (
              <ActiveStepComponent control={control} />
            )}
          </div>

          <div className="poster-section">
            <div className="flex flex-col md:flex-row items-stretch md:items-center md:justify-between gap-4">
              {/* Previous Button Wrapper: Mobile order 3, Desktop order 1 */}
              <div className="w-full md:w-auto order-3 md:order-1">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="poster-btn btn-secondary flex items-center gap-2 w-full justify-center md:w-auto"
                  >
                    <ArrowLeft size={16} />
                    Previous
                  </button>
                )}
              </div>

              {/* Step Text: Mobile order 2, Desktop order 2 */}
              <div className="text-sm text-pine-shadow-60 font-medium py-2 md:py-0 text-center order-2 md:order-2">
                Step {currentStepIndex + 1} of {steps.length} —{" "}
                {isReviewStep
                  ? "Review & Submit"
                  : steps[currentStepIndex].title}
              </div>

              {/* Next/Submit Button Wrapper: Mobile order 1, Desktop order 3 */}
              <div className="w-full md:w-auto order-1 md:order-3">
                {currentStepIndex < steps.length && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="poster-btn btn-primary flex items-center gap-2 w-full justify-center md:w-auto"
                  >
                    Next
                    <ArrowRight size={16} />
                  </button>
                )}
                {isReviewStep && (
                  <button
                    type="submit"
                    className={`poster-btn btn-success flex items-center gap-2 w-full justify-center md:w-auto ${
                      isSubmitDisabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={isSubmitDisabled}
                  >
                    Launch RFP
                    <Rocket size={16} />
                  </button>
                )}
              </div>
            </div>

            {isReviewStep && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-sm text-tomato-stamp hover:text-midnight-koi transition-colors"
                >
                  Reset Entire Form
                </button>
              </div>
            )}
          </div>
        </form>
      </Form>
      <SubmitModal />
    </FormProvider>
  );
};

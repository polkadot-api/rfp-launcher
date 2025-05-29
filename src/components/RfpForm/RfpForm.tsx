"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { SubmitModal } from "../SubmitModal"
import { submit } from "../SubmitModal/modalActions"
import { Form } from "../ui/form"
import { emptyNumeric, type FormSchema, formSchema } from "./formSchema"
import { FundingSection } from "./FundingSection"
import { ReviewSection } from "./ReviewSection"
import { ScopeSection } from "./ScopeSection"
import { SupervisorsSection } from "./SupervisorsSection"
import { TimelineSection } from "./TimelineSection"
import { WelcomeSection } from "./WelcomeSection"
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react"

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
}

const steps = [
  { id: "welcome", title: "welcome", Component: WelcomeSection },
  { id: "funding", title: "funding", Component: FundingSection },
  { id: "supervisors", title: "supervisors", Component: SupervisorsSection },
  { id: "timeline", title: "timeline", Component: TimelineSection },
  { id: "scope", title: "project scope", Component: ScopeSection },
  { id: "review", title: "review & submit", Component: ReviewSection },
]

export const RfpForm = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const methods = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      ...JSON.parse(localStorage.getItem("rfp-form") ?? "{}", (key, value) => {
        if (key === "projectCompletion" && value) {
          return new Date(value)
        }
        return value
      }),
    },
    mode: "onChange",
  })

  const {
    watch,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = methods

  useEffect(() => {
    const subscription = watch((data) => {
      localStorage.setItem("rfp-form", JSON.stringify(data))
    })
    return () => subscription.unsubscribe()
  }, [watch])

  const handleNext = async () => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handlePrev = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleResetForm = () => {
    if (!confirm("are you sure you want to reset the form? this will clear all your progress.")) return
    Object.entries(defaultValues).forEach(([key, value]) => setValue(key as keyof FormSchema, value as any))
    setCurrentStepIndex(0)
  }

  const ActiveStepComponent = steps[currentStepIndex].Component
  const hasErrors = Object.keys(errors).length > 0
  const isSubmitDisabled = hasErrors || !isValid

  return (
    <FormProvider {...methods}>
      <Form {...methods}>
        <form onSubmit={handleSubmit(submit)} className="space-y-12">
          {/* Current step content */}
          <div className="poster-section">
            {/* @ts-ignore */}
            <ActiveStepComponent control={control} onReset={handleResetForm} />
          </div>

          {/* Navigation */}
          <div className="poster-section">
            <div className="flex items-center justify-between">
              <div>
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="poster-btn btn-secondary flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    previous
                  </button>
                )}
              </div>

              <div className="text-sm text-pine-shadow-60 font-medium">
                step {currentStepIndex + 1} of {steps.length} — {steps[currentStepIndex].title}
              </div>

              <div>
                {currentStepIndex < steps.length - 1 && (
                  <button type="button" onClick={handleNext} className="poster-btn btn-primary flex items-center gap-2">
                    next
                    <ArrowRight size={16} />
                  </button>
                )}
                {currentStepIndex === steps.length - 1 && (
                  <button
                    type="submit"
                    className={`poster-btn btn-success flex items-center gap-2 ${
                      isSubmitDisabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={isSubmitDisabled}
                  >
                    launch rfp
                    <Rocket size={16} />
                  </button>
                )}
              </div>
            </div>

            {currentStepIndex === steps.length - 1 && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-sm text-tomato-stamp hover:text-midnight-koi transition-colors"
                >
                  reset entire form
                </button>
              </div>
            )}
          </div>
        </form>
      </Form>
      <SubmitModal />
    </FormProvider>
  )
}


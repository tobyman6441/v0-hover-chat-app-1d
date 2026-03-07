"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { signOut } from "@/lib/actions/auth"
import { markSetupCompleted, type EnabledFeatures } from "@/lib/actions/org"
import { StepLLMProvider } from "./step-llm-provider"
import { StepHoverConnect } from "./step-hover-connect"
import { StepFeatures } from "./step-features"
import { StepPipelineSetup } from "./step-pipeline-setup"
import { StepFeedbackIntro } from "./step-feedback-intro"
import { SetupComplete } from "./setup-complete"
import { cn } from "@/lib/utils"
import { LogOut } from "lucide-react"
import Image from "next/image"

type SetupStep = "llm" | "hover" | "features" | "pipeline" | "feedback" | "complete"

const STEPS = [
  { id: "llm" as const, label: "LLM" },
  { id: "hover" as const, label: "Hover" },
  { id: "features" as const, label: "Features" },
  { id: "pipeline" as const, label: "Pipeline" },
  { id: "feedback" as const, label: "Feedback" },
  { id: "complete" as const, label: "Done" },
]

function StepIndicator({ currentStep, showPipeline }: { currentStep: SetupStep; showPipeline: boolean }) {
  // Filter out pipeline step if not enabled, but always show feedback
  const visibleSteps = showPipeline ? STEPS : STEPS.filter(s => s.id !== "pipeline")
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {visibleSteps.map((step, i) => {
        const isActive = i === currentIndex
        const isDone = i < currentIndex

        return (
          <div key={step.id} className="flex items-center gap-1.5 sm:gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-4 sm:w-6 transition-colors",
                  isDone ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isActive || isDone
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:inline",
                  isActive || isDone
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface SetupWizardProps {
  initialStep?: "llm" | "hover"
}

export function SetupWizard({ initialStep }: SetupWizardProps) {
  const { user, org, refreshOrg } = useAuth()
  const [showPipelineStep, setShowPipelineStep] = useState(false)
  const [enabledFeatures, setEnabledFeatures] = useState<EnabledFeatures>({
    chat: true,
    dashboard: true,
    sales: true,
    production: true,
    marketing: true,
  })

  // Determine initial step based on prop, or what's already configured
  const getInitialStep = (): SetupStep => {
    // If a specific step is requested via URL, use it
    if (initialStep) return initialStep
    
    if (!org) return "llm"
    if (org.llm_provider && org.llm_api_key_encrypted) {
      if (org.hover_access_token) {
        // If setup was already completed, go to complete
        if (org.setup_completed) return "complete"
        // Otherwise go to features selection
        return "features"
      }
      return "hover"
    }
    return "llm"
  }

  const [currentStep, setCurrentStep] = useState<SetupStep>(getInitialStep)

  // Load enabled features from org when available
  useEffect(() => {
    if (org?.enabled_features) {
      setEnabledFeatures(org.enabled_features as EnabledFeatures)
      // Check if any CRM features are enabled
      const features = org.enabled_features as EnabledFeatures
      setShowPipelineStep(features.sales || features.production)
    }
  }, [org?.enabled_features])

  // Auto-advance when org data changes (e.g., after connecting LLM or Hover)
  useEffect(() => {
    if (!org) return
    
    // Only auto-advance if not on a manually requested step
    if (initialStep) return

    // If LLM is now connected and we're still on llm step, advance to hover
    if (org.llm_provider && org.llm_api_key_encrypted && currentStep === "llm") {
      setCurrentStep("hover")
    }
    // If Hover is now connected and we're on hover step, advance to features
    if (org.hover_access_token && currentStep === "hover") {
      setCurrentStep("features")
    }
  }, [org, currentStep, initialStep])

  const handleFeaturesComplete = (enabledCRM: boolean, features?: EnabledFeatures) => {
    // Update enabled features if provided
    if (features) {
      setEnabledFeatures(features)
    }
    setShowPipelineStep(enabledCRM)
    if (enabledCRM) {
      setCurrentStep("pipeline")
    } else {
      setCurrentStep("feedback")
    }
  }

  const handlePipelineComplete = () => {
    setCurrentStep("feedback")
  }

  const handlePipelineSkip = () => {
    setCurrentStep("feedback")
  }

  const handleFeedbackComplete = async () => {
    await handleSetupComplete()
  }

  const handleSetupComplete = async () => {
    await markSetupCompleted()
    await refreshOrg()
    setCurrentStep("complete")
  }

  async function handleSignOut() {
    await signOut()
    window.location.href = "/auth/login"
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <Image
            src="/images/hover-ninja-logo.png"
            alt="Hover Ninja logo"
            width={28}
            height={28}
            className="size-7 sm:size-8"
          />
          <span className="hidden text-sm font-semibold text-foreground sm:inline">
            Hover Ninja
            <sup className="ml-0.5 text-[10px] font-medium text-muted-foreground">ALPHA</sup>
          </span>
        </div>
        <StepIndicator currentStep={currentStep} showPipeline={showPipelineStep} />
        <button
          onClick={handleSignOut}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" />
        </button>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-6 sm:py-12">
        <div className="w-full max-w-lg">
          {currentStep === "llm" && (
            <StepLLMProvider onComplete={() => setCurrentStep("hover")} />
          )}
          {currentStep === "hover" && (
            <StepHoverConnect
              onComplete={() => setCurrentStep("features")}
              onBack={() => setCurrentStep("llm")}
            />
          )}
          {currentStep === "features" && (
            <StepFeatures
              onComplete={handleFeaturesComplete}
              onBack={() => setCurrentStep("hover")}
            />
          )}
          {currentStep === "pipeline" && (
            <StepPipelineSetup
              onComplete={handlePipelineComplete}
              onBack={() => setCurrentStep("features")}
              onSkip={handlePipelineSkip}
              enabledFeatures={enabledFeatures}
            />
          )}
          {currentStep === "feedback" && (
            <StepFeedbackIntro
              onComplete={handleFeedbackComplete}
              onBack={() => setCurrentStep(showPipelineStep ? "pipeline" : "features")}
            />
          )}
          {currentStep === "complete" && <SetupComplete />}
        </div>
      </main>
    </div>
  )
}

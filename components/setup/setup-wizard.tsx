"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { signOut } from "@/lib/actions/auth"
import { StepLLMProvider } from "./step-llm-provider"
import { StepHoverConnect } from "./step-hover-connect"
import { SetupComplete } from "./setup-complete"
import { cn } from "@/lib/utils"
import { LogOut } from "lucide-react"
import Image from "next/image"

type SetupStep = "llm" | "hover" | "complete"

const STEPS = [
  { id: "llm" as const, label: "LLM" },
  { id: "hover" as const, label: "Hover" },
  { id: "complete" as const, label: "Done" },
]

function StepIndicator({ currentStep }: { currentStep: SetupStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex
        const isDone = i < currentIndex

        return (
          <div key={step.id} className="flex items-center gap-1.5 sm:gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-4 sm:w-8 transition-colors",
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
  const { user, org } = useAuth()

  // Determine initial step based on prop, or what's already configured
  const getInitialStep = (): SetupStep => {
    // If a specific step is requested via URL, use it
    if (initialStep) return initialStep
    
    if (!org) return "llm"
    if (org.llm_provider && org.llm_api_key_encrypted) {
      if (org.hover_access_token) return "complete"
      return "hover"
    }
    return "llm"
  }

  const [currentStep, setCurrentStep] = useState<SetupStep>(getInitialStep)

  // Auto-advance when org data changes (e.g., after connecting LLM or Hover)
  useEffect(() => {
    if (!org) return
    
    // Only auto-advance if not on a manually requested step
    if (initialStep) return

    // If LLM is now connected and we're still on llm step, advance to hover
    if (org.llm_provider && org.llm_api_key_encrypted && currentStep === "llm") {
      setCurrentStep("hover")
    }
    // If Hover is now connected and we're on hover step, advance to complete
    if (org.hover_access_token && currentStep === "hover") {
      setCurrentStep("complete")
    }
  }, [org, currentStep, initialStep])

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
          </span>
        </div>
        <StepIndicator currentStep={currentStep} />
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
              onComplete={() => setCurrentStep("complete")}
              onBack={() => setCurrentStep("llm")}
            />
          )}
          {currentStep === "complete" && <SetupComplete />}
        </div>
      </main>
    </div>
  )
}

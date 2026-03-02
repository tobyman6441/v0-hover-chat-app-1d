"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, MessageCircle, Bug, Lightbulb, Star, Loader2 } from "lucide-react"

interface StepFeedbackIntroProps {
  onComplete: () => void | Promise<void>
  onBack: () => void
}

export function StepFeedbackIntro({ onComplete, onBack }: StepFeedbackIntroProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleContinue = async () => {
    setIsLoading(true)
    await onComplete()
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <MessageCircle className="size-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          We Value Your Feedback
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Hover Ninja is in alpha, and your input helps us improve. You will see a feedback button throughout the app.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <Bug className="size-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Report Bugs</p>
              <p className="text-xs text-muted-foreground">
                Found something that is not working right? Let us know so we can fix it quickly.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Lightbulb className="size-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Suggest Features</p>
              <p className="text-xs text-muted-foreground">
                Have an idea that would make Hover Ninja even better? We would love to hear it.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Star className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Share Your Experience</p>
              <p className="text-xs text-muted-foreground">
                Tell us what you love, what frustrates you, or anything else on your mind.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Look for the <span className="inline-flex items-center gap-1 font-medium"><MessageCircle className="size-3" /> Feedback</span> button in the bottom right corner of your screen. Click it anytime to share your thoughts!
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={isLoading}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

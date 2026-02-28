"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { SetupWizard } from "@/components/setup/setup-wizard"
import { createOrg } from "@/lib/actions/org"
import { Loader2 } from "lucide-react"

function SetupContent() {
  const { user, org, isLoading, refreshOrg, isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orgError, setOrgError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // If user is logged in but somehow has no org, create one as a fallback.
  // Normally the org is created during sign-up, but this handles edge cases.
  useEffect(() => {
    if (isLoading || !user || org || isRetrying) return

    const inviteToken = searchParams.get("invite")
    if (inviteToken) return

    const ensureOrg = async () => {
      setIsRetrying(true)
      setOrgError(null)
      const name = user.user_metadata?.full_name
        ? `${user.user_metadata.full_name}'s Workspace`
        : "My Workspace"
      const result = await createOrg(name)
      if (result.error) {
        setOrgError(result.error)
      } else {
        await refreshOrg()
      }
      setIsRetrying(false)
    }

    ensureOrg()
  }, [isLoading, user, org, isRetrying, refreshOrg, searchParams])

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/login")
    }
  }, [user, isLoading, router])

  // Redirect to chat if onboarding is already complete AND no specific step requested
  const requestedStep = searchParams.get("step")
  useEffect(() => {
    if (!isLoading && org?.onboarding_complete && !requestedStep) {
      router.replace("/chat")
    }
  }, [isLoading, org, router, requestedStep])

  if (isLoading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (orgError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background">
        <p className="text-destructive">Failed to create workspace: {orgError}</p>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={() => {
            setOrgError(null)
            setIsRetrying(false)
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2 bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Setting up workspace...</span>
      </div>
    )
  }

  return <SetupWizard initialStep={requestedStep as "llm" | "hover" | undefined} />
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  )
}

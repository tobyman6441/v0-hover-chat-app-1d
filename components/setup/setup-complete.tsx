"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { completeOnboarding } from "@/lib/actions/org"
import { Check, ArrowRight, Link2, Loader2 } from "lucide-react"
import Image from "next/image"
import { PROVIDER_LOGOS } from "@/components/provider-logos"

export function SetupComplete() {
  const router = useRouter()
  const { user, org, refreshOrg } = useAuth()
  const [isCompleting, setIsCompleting] = useState(false)

  const provider = org?.llm_provider
    ? PROVIDER_LOGOS[org.llm_provider as keyof typeof PROVIDER_LOGOS]
    : null
  const ProviderLogo = provider?.logo

  async function handleComplete() {
    if (!org) return
    setIsCompleting(true)
    await completeOnboarding(org.id)
    await refreshOrg()
    router.push("/chat")
  }

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary">
          <Check className="size-8 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {"You're all set" +
              (user?.user_metadata?.full_name
                ? `, ${user.user_metadata.full_name.split(" ")[0]}`
                : "") +
              "!"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your accounts are connected and ready to go.
          </p>
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {provider && ProviderLogo && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <ProviderLogo className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">
                {provider.name}
              </p>
              <p className="text-xs text-muted-foreground">
                API key connected
              </p>
            </div>
            <Check className="size-4 text-primary" />
          </div>
        )}

        {org?.hover_access_token && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Link2 className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Hover</p>
              <p className="text-xs text-muted-foreground">
                Workspace connected
              </p>
            </div>
            <Check className="size-4 text-primary" />
          </div>
        )}
      </div>

      <Button
        size="lg"
        className="w-full max-w-sm"
        onClick={handleComplete}
        disabled={isCompleting}
      >
        {isCompleting ? (
          <>
            <Loader2 className="animate-spin" />
            Setting up...
          </>
        ) : (
          <>
            <Image
              src="/images/hover-ninja-logo.png"
              alt=""
              width={16}
              height={16}
              className="size-4"
            />
            Start chatting
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </div>
  )
}

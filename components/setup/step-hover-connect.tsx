"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { disconnectHover } from "@/lib/actions/org"
import {
  Check,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Link2,
  AlertCircle,
  Loader2,
  Unplug,
} from "lucide-react"

const ERROR_MESSAGES: Record<string, string> = {
  no_code: "No authorization code was received from Hover. Please try again.",
  missing_credentials:
    "Hover API credentials are not configured. Please contact support.",
  token_exchange_failed:
    "Failed to exchange the authorization code. Please try connecting again.",
  invalid_token_response:
    "Received an unexpected response from Hover. Please try again.",
  unexpected_error:
    "Something went wrong during authorization. Please try again.",
  access_denied: "Authorization was denied. Please try again and click Allow.",
}

interface StepHoverConnectProps {
  onComplete: () => void
  onBack: () => void
}

export function StepHoverConnect({ onComplete, onBack }: StepHoverConnectProps) {
  const { org, refreshOrg } = useAuth()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(!!org?.hover_access_token)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Check for OAuth callback results
  useEffect(() => {
    const hoverError = searchParams.get("hover_error")
    const hoverConnected = searchParams.get("hover_connected")

    if (hoverError) {
      setError(ERROR_MESSAGES[hoverError] || ERROR_MESSAGES.unexpected_error)
    }

    if (hoverConnected === "true") {
      refreshOrg().then(() => {
        setIsConnected(true)
      })
    }
  }, [searchParams, refreshOrg])

  function handleConnect() {
    window.location.href = "/api/auth/hover"
  }

  async function handleDisconnect() {
    setIsDisconnecting(true)
    const result = await disconnectHover()
    if (result.error) {
      setError(result.error)
    } else {
      setIsConnected(false)
      await refreshOrg()
    }
    setIsDisconnecting(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Connect your Hover account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Link your Hover workspace to start using AI chat with your projects
          and documents.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <span className="text-xl font-bold tracking-tight text-foreground">
              H
            </span>
          </div>

          {!isConnected && (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="font-medium text-foreground">
                  Authorize with Hover
                </h3>
                <p className="max-w-xs text-sm text-muted-foreground">
                  {"You'll be redirected to Hover to log in and grant access. We use OAuth 2.0 to securely connect your account."}
                </p>
              </div>

              {error && (
                <div className="flex w-full max-w-xs items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <div className="flex w-full max-w-xs flex-col gap-3">
                <div className="flex items-center gap-3 rounded-md bg-muted p-3 text-left">
                  <ShieldCheck className="size-5 shrink-0 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Secure connection
                    </span>
                    <br />
                    Hover tokens are stored securely with your organization
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-muted p-3 text-left">
                  <Link2 className="size-5 shrink-0 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Revocable access
                    </span>
                    <br />
                    Disconnect at any time from your settings
                  </div>
                </div>
              </div>

              <Button
                onClick={handleConnect}
                size="lg"
                className="w-full max-w-xs"
              >
                Connect with Hover
                <ExternalLink className="size-4" />
              </Button>
            </>
          )}

          {isConnected && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <Check className="size-7 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Hover connected
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your Hover workspace has been successfully linked.
                </p>
              </div>
              <div className="flex w-full max-w-xs flex-col gap-2">
                <Button
                  onClick={onComplete}
                  size="lg"
                  className="w-full"
                >
                  Continue to Hover Ninja
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {isDisconnecting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Unplug className="size-4" />
                  )}
                  Disconnect Hover
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isConnected && (
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {org?.llm_provider && (
            <p className="text-xs text-muted-foreground">
              Connected to{" "}
              <span className="font-medium text-foreground">
                {org.llm_provider === "openai"
                  ? "OpenAI"
                  : org.llm_provider === "anthropic"
                    ? "Anthropic"
                    : org.llm_provider === "google"
                      ? "Google AI"
                      : org.llm_provider === "mistral"
                        ? "Mistral AI"
                        : org.llm_provider === "groq"
                          ? "Groq"
                          : "DeepSeek"}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

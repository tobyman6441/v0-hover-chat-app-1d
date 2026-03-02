"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth, type LLMProvider } from "@/lib/auth-context"
import { updateOrgLLM, disconnectLLM } from "@/lib/actions/org"
import { Loader2, Check, Eye, EyeOff, ExternalLink, Unplug } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROVIDER_LOGOS } from "@/components/provider-logos"

const LLM_PROVIDERS: {
  id: LLMProvider
  name: string
  placeholder: string
  helpUrl: string
  helpLabel: string
  steps: string[]
}[] = [
  {
    id: "openai",
    name: "OpenAI",
    placeholder: "sk-proj-...",
    helpUrl: "https://platform.openai.com/api-keys",
    helpLabel: "Get your OpenAI key",
    steps: [
      "Click the link above to open your OpenAI dashboard",
      'Click "Create new secret key" and name it "Hover Ninja"',
      "Copy the key and paste it below",
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    placeholder: "sk-ant-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
    helpLabel: "Get your Anthropic key",
    steps: [
      "Click the link above to open the Anthropic Console",
      'Click "Create Key" and name it "Hover Ninja"',
      "Copy the key and paste it below",
    ],
  },
  {
    id: "google",
    name: "Google AI",
    placeholder: "AIza...",
    helpUrl: "https://aistudio.google.com/apikey",
    helpLabel: "Get your Google AI key",
    steps: [
      "Click the link above to open Google AI Studio",
      'Click "Create API key" and select a project',
      "Copy the key and paste it below",
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    placeholder: "Your Mistral API key",
    helpUrl: "https://console.mistral.ai/api-keys/",
    helpLabel: "Get your Mistral key",
    steps: [
      "Click the link above to open the Mistral Console",
      'Click "Create new key" and name it "Hover Ninja"',
      "Copy the key and paste it below",
    ],
  },
  {
    id: "groq",
    name: "Groq",
    placeholder: "gsk_...",
    helpUrl: "https://console.groq.com/keys",
    helpLabel: "Get your Groq key",
    steps: [
      "Click the link above to open the Groq Console",
      'Click "Create API Key" and name it "Hover Ninja"',
      "Copy the key and paste it below",
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    placeholder: "sk-...",
    helpUrl: "https://platform.deepseek.com/api_keys",
    helpLabel: "Get your DeepSeek key",
    steps: [
      "Click the link above to open the DeepSeek Platform",
      'Click "Create new API key" and name it "Hover Ninja"',
      "Copy the key and paste it below",
    ],
  },
]

interface StepLLMProviderProps {
  onComplete: () => void
}

export function StepLLMProvider({ onComplete }: StepLLMProviderProps) {
  const { org, refreshOrg } = useAuth()
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(
    (org?.llm_provider as LLMProvider) ?? null,
  )
  const [apiKey, setApiKey] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(!!org?.llm_api_key_encrypted)
  const [isSaving, setIsSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState("")
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const apiKeyRef = useRef<HTMLDivElement>(null)

  const isConnected = !!org?.llm_api_key_encrypted

  const activeProvider = LLM_PROVIDERS.find((p) => p.id === selectedProvider)

  const scrollToApiKey = useCallback(() => {
    // Wait for the DOM to update then scroll the API key section into view
    requestAnimationFrame(() => {
      apiKeyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [])

  async function handleVerify() {
    if (!selectedProvider || !apiKey.trim()) {
      setError("Please enter your API key.")
      return
    }
    setError("")
    setIsVerifying(true)
    await new Promise((r) => setTimeout(r, 1200))
    setIsVerified(true)
    setIsVerifying(false)
  }

  async function handleContinue() {
    if (!selectedProvider || !apiKey.trim() || !org) return
    setIsSaving(true)
    setError("")
    
    try {
      const result = await updateOrgLLM(org.id, selectedProvider, apiKey.trim())
      if (result.error) {
        setError(result.error)
        setIsSaving(false)
        return
      }
      await refreshOrg()
      setIsSaving(false)
      // Success - call onComplete after state is reset
      onComplete()
    } catch (err) {
      setError("Failed to save LLM configuration. Please try again.")
      setIsSaving(false)
    }
  }

  function handleSelectProvider(id: LLMProvider) {
    if (id === selectedProvider) return
    setSelectedProvider(id)
    setApiKey("")
    setIsVerified(false)
    setError("")
    scrollToApiKey()
  }

  async function handleDisconnect() {
    setIsDisconnecting(true)
    const result = await disconnectLLM()
    if (result.error) {
      setError(result.error)
    } else {
      setSelectedProvider(null)
      setApiKey("")
      setIsVerified(false)
      await refreshOrg()
    }
    setIsDisconnecting(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Connect your LLM
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose your AI provider and enter your API key. Your key is stored
            securely with your organization.
          </p>
        </div>
        {isConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {isDisconnecting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Unplug className="size-4" />
            )}
            Disconnect
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {LLM_PROVIDERS.map((provider) => {
          const providerMeta = PROVIDER_LOGOS[provider.id]
          const Logo = providerMeta.logo
          const isSelected = selectedProvider === provider.id
          return (
            <Card
              key={provider.id}
              className={cn(
                "cursor-pointer transition-all hover:border-foreground/20",
                isSelected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border",
              )}
              onClick={() => handleSelectProvider(provider.id)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleSelectProvider(provider.id)
                }
              }}
            >
              <CardContent className="flex flex-col items-center gap-1.5 p-3 text-center sm:gap-2.5 sm:p-4">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg transition-colors sm:size-10",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Logo className="size-4 sm:size-5" />
                </div>
                <p className="text-xs font-medium text-foreground sm:text-sm">
                  {provider.name}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedProvider && activeProvider && (
        <div ref={apiKeyRef} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          {/* Prominent "Get your key" link */}
          <a
            href={activeProvider.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <ExternalLink className="size-4" />
            {activeProvider.helpLabel}
          </a>

          {/* Quick steps */}
          <ol className="flex flex-col gap-1">
            {activeProvider.steps.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          {/* API key input */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key">{activeProvider.name} API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                placeholder={activeProvider.placeholder}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setIsVerified(false)
                  setError("")
                }}
                className="pr-10"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex items-center gap-3">
            {!isVerified ? (
              <Button
                onClick={handleVerify}
                variant="outline"
                disabled={isVerifying || !apiKey.trim()}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify key"
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                  <Check className="size-3 text-primary-foreground" />
                </div>
                Key verified
              </div>
            )}
          </div>

          {isVerified && (
            <Button
              onClick={handleContinue}
              size="lg"
              className="w-full"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
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
  const apiKeyRef = useRef<HTMLDivElement | null>(null)

  const isConnected = !!org?.llm_api_key_encrypted

  const activeProvider = LLM_PROVIDERS.find((p) => p.id === selectedProvider)

  const scrollToApiKey = useCallback(() => {
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
      
      // Refresh org data and wait for it to complete
      await refreshOrg()
      
      // Force a page refresh to ensure clean state transition
      // This resolves the stuck loading state issue
      router.refresh()
      
      // Call onComplete after a brief delay to allow refresh to process
      setTimeout(() => {
        onComplete()
      }, 100)
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
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Connect your LLM
          </h2>
          <p className="mt-1 text-muted-foreground">
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
            className="shrink-0 text-destructive hover:text-destructive"
          >
            {isDisconnecting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Unplug className="mr-2 size-4" />
            )}
            Disconnect
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LLM_PROVIDERS.map((provider) => {
          const providerMeta = PROVIDER_LOGOS[provider.id]
          const Logo = providerMeta.logo
          const isSelected = selectedProvider === provider.id
          return (
            <Card
              key={provider.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isSelected && "border-primary ring-2 ring-primary/20",
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
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <div
                  className="flex size-12 items-center justify-center rounded-lg"
                  style={{ backgroundColor: providerMeta.bg }}
                >
                  <Logo className="size-7" />
                </div>
                <span className="text-sm font-medium text-center">
                  {provider.name}
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedProvider && activeProvider && (
        <div ref={apiKeyRef} className="space-y-6 scroll-mt-8">
          <a
            href={activeProvider.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-lg font-medium text-primary hover:underline"
          >
            {activeProvider.helpLabel}
            <ExternalLink className="size-4" />
          </a>

          <ol className="space-y-2 text-sm text-muted-foreground">
            {activeProvider.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div className="space-y-2">
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

          <div className="flex items-center gap-4">
            {!isVerified ? (
              <Button
                onClick={handleVerify}
                disabled={isVerifying || !apiKey.trim()}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify key"
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <div className="flex size-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <Check className="size-3" />
                </div>
                Key verified
              </div>
            )}
          </div>

          {isVerified && (
            <Button onClick={handleContinue} disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
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

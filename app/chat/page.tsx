"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useSidebar } from "./layout"
import { createChat, addMessage } from "@/lib/actions/chat"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Ruler,
  Camera,
  ClipboardCheck,
  ArrowUp,
  Menu,
  ChevronDown,
  FileText,
  Download,
  Bell,
  Building2,
  Wallet,
  Sparkles,
  Search,
  Users,
} from "lucide-react"
import Image from "next/image"
import { PROVIDER_LOGOS } from "@/components/provider-logos"

const PROMPT_SUGGESTIONS = [
  {
    icon: Plus,
    label: "Create a new job",
    prompt: "Create a new Hover job for a property",
  },
  {
    icon: Ruler,
    label: "Get measurements",
    prompt: "Give me the measurements for a specific Hover job",
  },
  {
    icon: Camera,
    label: "View job photos",
    prompt: "Show me the photos for a specific Hover job",
  },
  {
    icon: ClipboardCheck,
    label: "Inspection details",
    prompt: "Provide me with the inspection details for a specific Hover job",
  },
]

const MORE_PROMPT_OPTIONS = [
  {
    category: "Jobs & Properties",
    prompts: [
      { icon: Search, label: "List all jobs", prompt: "Show me all my Hover jobs" },
      { icon: Building2, label: "Get job details", prompt: "Show me the details for a Hover job" },
      { icon: FileText, label: "Job status", prompt: "What is the status of my recent Hover jobs?" },
    ],
  },
  {
    category: "3D Models & Deliverables",
    prompts: [
      { icon: Download, label: "Download measurements", prompt: "Download a measurement report" },
      { icon: FileText, label: "Get 3D model", prompt: "Get the 3D model deliverables for a job" },
      { icon: Ruler, label: "Roof measurements", prompt: "Get roof measurements for a job" },
    ],
  },
  {
    category: "Instant Design",
    prompts: [
      { icon: Sparkles, label: "Generate design", prompt: "Create an Instant Design visualization for a property" },
      { icon: Camera, label: "View design images", prompt: "Show me the Instant Design images for a job" },
    ],
  },
  {
    category: "Organization",
    prompts: [
      { icon: Users, label: "Team members", prompt: "List the users in my Hover organization" },
      { icon: Wallet, label: "Check wallet", prompt: "What is my current Hover wallet balance?" },
      { icon: Bell, label: "Webhooks", prompt: "Show me my configured webhooks" },
    ],
  },
]

export default function ChatPage() {
  const { user, org } = useAuth()
  const { toggle: toggleSidebar } = useSidebar()
  const [inputValue, setInputValue] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  const provider = org?.llm_provider
    ? PROVIDER_LOGOS[org.llm_provider as keyof typeof PROVIDER_LOGOS]
    : null

  async function handleSend(prompt?: string) {
    const text = prompt || inputValue.trim()
    if (!text || !org) return
    setIsSending(true)

    try {
      // Create a new chat with default title - generateChatTitle will update it after first AI response
      const chatResult = await createChat(org.id)
      if (chatResult.chat) {
        // Save the message first, then navigate with hard redirect
        await addMessage(chatResult.chat.id, "user", text)
        window.location.href = `/chat/${chatResult.chat.id}`
      } else {
        setIsSending(false)
      }
    } catch {
      setIsSending(false)
    }
  }

  const displayName = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ")[0]
    : "there"

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Mobile header */}
      <header className="flex items-center gap-3 border-b border-border px-3 py-2.5 md:hidden">
        <button
          onClick={toggleSidebar}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <Image
            src="/images/hover-ninja-logo.png"
            alt="Hover Ninja logo"
            width={24}
            height={24}
            className="size-6"
          />
          <span className="text-sm font-semibold text-foreground">
            Hover Ninja
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-4 sm:pb-6">
        <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 sm:gap-6">
          <Image
            src="/images/hover-ninja-logo.png"
            alt="Hover Ninja logo"
            width={56}
            height={56}
            className="hidden size-14 sm:block"
          />
          <div className="text-center">
            <h1 className="text-base font-semibold text-foreground text-balance sm:text-lg">
              {"Welcome, " + displayName}
            </h1>
            <p className="mt-1 max-w-md text-xs text-muted-foreground text-balance sm:text-sm">
              Ask me anything about your Hover workspace, or try one of these to
              get started:
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2">
            {PROMPT_SUGGESTIONS.map((suggestion) => {
              const SuggestionIcon = suggestion.icon
              return (
                <button
                  key={suggestion.label}
                  onClick={() => handleSend(suggestion.prompt)}
                  disabled={isSending}
                  className="group flex min-h-[44px] items-start gap-2 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/30 hover:bg-accent disabled:opacity-50 sm:gap-3 sm:p-3.5"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10 sm:size-8">
                    <SuggestionIcon className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary sm:size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground sm:text-sm">
                      {suggestion.label}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground sm:text-xs">
                      {suggestion.prompt}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* More options dropdown */}
          <div className="w-full">
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
            >
              <span>More options</span>
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${
                  showMoreOptions ? "rotate-180" : ""
                }`}
              />
            </button>

            {showMoreOptions && (
              <div className="mt-2 space-y-4 rounded-xl border border-border bg-card/50 p-3 sm:p-4">
                {MORE_PROMPT_OPTIONS.map((category) => (
                  <div key={category.category}>
                    <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                      {category.category}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {category.prompts.map((prompt) => {
                        const PromptIcon = prompt.icon
                        return (
                          <button
                            key={prompt.label}
                            onClick={() => handleSend(prompt.prompt)}
                            disabled={isSending}
                            className="group flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 text-xs transition-colors hover:border-primary/30 hover:bg-accent disabled:opacity-50 sm:px-3 sm:py-2 sm:text-sm"
                          >
                            <PromptIcon className="size-3 text-muted-foreground group-hover:text-primary sm:size-3.5" />
                            <span className="text-foreground">{prompt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div className="mt-4 w-full max-w-2xl sm:mt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm transition-all focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your Hover workspace..."
              className="min-h-[44px] flex-1 bg-transparent px-2 text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
              disabled={isSending}
            />
            <Button
              type="submit"
              size="icon"
              className="size-10 shrink-0 rounded-lg sm:size-8"
              disabled={!inputValue.trim() || isSending}
              aria-label="Send message"
            >
              <ArrowUp className="size-4" />
            </Button>
          </form>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Connected to {provider?.name || "AI"} and Hover
          </p>
        </div>
      </div>
    </main>
  )
}

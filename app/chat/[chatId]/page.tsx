"use client"

import { useEffect, useState, useRef, useMemo, use } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useAuth } from "@/lib/auth-context"
import { getChatMessages, addMessage, generateChatTitle, deleteChat } from "@/lib/actions/chat"
import { useRouter } from "next/navigation"
import { useSidebar } from "../layout"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  ArrowRight,
  ArrowUp,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  GitBranch,
  Kanban,
  List,
  Loader2,
  Menu,
  Plus,
  Ruler,
  Search,
  Send,
  Settings,
  Sparkles,
  Square,
  User,
  Users,
  Wallet,
} from "lucide-react"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { PROVIDER_LOGOS } from "@/components/provider-logos"
import Image from "next/image"
import {
  InlineForm,
  parseFormFromText,
  formatFormValues,
  type InlineFormData,
} from "@/components/chat/inline-form"
import { CaptureRequestForm } from "@/components/chat/capture-request-form"
import { MeasurementsDisplay } from "@/components/chat/measurements-display"
import { PhotosDisplay } from "@/components/chat/photos-display"
import { createCaptureRequest, type JobPhotosResult } from "@/app/actions/hover"
import {
  JobPicker,
  parseJobPickerFromText,
  formatJobSelection,
  type JobPickerData,
  type HoverJob,
} from "@/components/chat/job-picker"

// Type for measurements data in chat
interface MeasurementsData {
  jobName: string
  address: string
  measurements: Record<string, unknown>
}

// Type for photos data in chat
interface PhotosData {
  jobName: string
  address: string
  photosResult: JobPhotosResult
}

// Tool invocation part from AI SDK
interface ToolInvocationPart {
  type: "tool-invocation"
  toolInvocation: {
    state: "call" | "partial-call" | "result"
    toolCallId: string
    toolName: string
    args: unknown
    result?: unknown
  }
}

// Navigate block data
interface NavigateData {
  url: string
  label: string
}

function getUIMessageText(msg: UIMessage): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

// Render text with clickable URLs
function TextWithLinks({ text, isUser }: { text: string; isUser: boolean }) {
  // Regex to match URLs
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g
  
  const parts = text.split(urlRegex)
  
  return (
    <>
      {parts.map((part, i) => {
        if (urlRegex.test(part)) {
          // Reset regex lastIndex after test
          urlRegex.lastIndex = 0
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "underline underline-offset-2 transition-colors",
                isUser
                  ? "text-primary-foreground/90 hover:text-primary-foreground"
                  : "text-primary hover:text-primary/80"
              )}
            >
              {part}
            </a>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// Check if text contains an incomplete (streaming) form or job picker
function hasIncompleteSpecialBlock(text: string): { hasIncomplete: boolean; textBefore: string } {
  // Check for incomplete form: has [FORM] but no [/FORM]
  const formStartIndex = text.indexOf("[FORM]")
  if (formStartIndex !== -1 && !text.includes("[/FORM]")) {
    return { hasIncomplete: true, textBefore: text.slice(0, formStartIndex).trim() }
  }

  // Check for incomplete job picker: has [JOBS] but no [/JOBS]
  const jobsStartIndex = text.indexOf("[JOBS]")
  if (jobsStartIndex !== -1 && !text.includes("[/JOBS]")) {
    return { hasIncomplete: true, textBefore: text.slice(0, jobsStartIndex).trim() }
  }

  // Check for incomplete measurements: has [MEASUREMENTS] but no [/MEASUREMENTS]
  const measStartIndex = text.indexOf("[MEASUREMENTS]")
  if (measStartIndex !== -1 && !text.includes("[/MEASUREMENTS]")) {
  return { hasIncomplete: true, textBefore: text.slice(0, measStartIndex).trim() }
  }

  // Check for incomplete photos: has [PHOTOS] but no [/PHOTOS]
  const photosStartIndex = text.indexOf("[PHOTOS]")
  if (photosStartIndex !== -1 && !text.includes("[/PHOTOS]")) {
  return { hasIncomplete: true, textBefore: text.slice(0, photosStartIndex).trim() }
  }

  // Check for incomplete navigate block
  const navStartIndex = text.indexOf("[NAVIGATE]")
  if (navStartIndex !== -1 && !text.includes("[/NAVIGATE]")) {
    return { hasIncomplete: true, textBefore: text.slice(0, navStartIndex).trim() }
  }

  return { hasIncomplete: false, textBefore: "" }
}

// Loading placeholder for streaming forms/job pickers
function StreamingPlaceholder({ textBefore }: { textBefore: string }) {
  return (
    <div className="flex flex-col gap-3">
      {textBefore && (
        <div className="whitespace-pre-wrap">
          <TextWithLinks text={textBefore} isUser={false} />
        </div>
      )}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  )
}

// Parse [NAVIGATE] blocks from AI response
function parseNavigateBlocks(text: string): {
  segments: Array<{ type: "text" | "navigate"; content: string; data?: NavigateData }>
} {
  const regex = /\[NAVIGATE\]([\s\S]*?)\[\/NAVIGATE\]/g
  const segments: Array<{ type: "text" | "navigate"; content: string; data?: NavigateData }> = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) })
    }
    try {
      const data = JSON.parse(match[1]) as NavigateData
      segments.push({ type: "navigate", content: match[0], data })
    } catch {
      segments.push({ type: "text", content: match[0] })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) })
  }

  return { segments }
}

// Render text with [NAVIGATE] blocks replaced by buttons
function TextWithNavigate({
  text,
  isUser,
}: {
  text: string
  isUser: boolean
}) {
  const { segments } = parseNavigateBlocks(text)

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "navigate" && seg.data) {
          return (
            <Link
              key={i}
              href={seg.data.url}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {seg.data.label}
              <ArrowRight className="size-3.5" />
            </Link>
          )
        }
        return (
          <span key={i}>
            <TextWithLinks text={seg.content} isUser={isUser} />
          </span>
        )
      })}
    </>
  )
}

// Human-readable labels for tool names
function getToolLabel(toolName: string): string {
  const labels: Record<string, string> = {
    listPipelineStages: "Fetching pipeline stages",
    moveJobToStage: "Moving job to stage",
    createPipelineStage: "Creating pipeline stage",
    renamePipelineStage: "Renaming pipeline stage",
    deletePipelineStage: "Deleting pipeline stage",
    getJobsInStage: "Getting jobs in stage",
    searchLeads: "Searching leads",
    updateLead: "Updating lead",
  }
  return labels[toolName] || toolName
}

// Render a completed tool result in a compact card
function ToolResultCard({
  toolName,
  result,
}: {
  toolName: string
  result: Record<string, unknown>
}) {
  if (result.error) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm dark:border-red-900/50 dark:bg-red-950/30">
        <AlertCircle className="size-4 shrink-0 text-red-500" />
        <span className="text-red-700 dark:text-red-300">{String(result.error)}</span>
      </div>
    )
  }

  if (toolName === "listPipelineStages") {
    const stages = (result.stages as Array<{ id: string; name: string; pipeline_type: string; probability: number }>) || []
    return (
      <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
        <div className="mb-1.5 flex items-center gap-2 text-muted-foreground">
          <List className="size-3.5" />
          <span className="font-medium">Pipeline Stages ({stages.length})</span>
        </div>
        <div className="space-y-0.5">
          {stages.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-xs">
              <span className="text-foreground">{s.name}</span>
              <span className="text-muted-foreground capitalize">{s.pipeline_type} · {s.probability}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (toolName === "searchLeads") {
    const leads = (result.leads as Array<{ id: string; full_name: string | null; email: string | null; location_line_1: string | null; location_city: string | null }>) || []
    return (
      <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
        <div className="mb-1.5 flex items-center gap-2 text-muted-foreground">
          <Users className="size-3.5" />
          <span className="font-medium">{leads.length} lead{leads.length !== 1 ? "s" : ""} found</span>
        </div>
        <div className="space-y-0.5">
          {leads.slice(0, 5).map((lead) => (
            <div key={lead.id} className="flex items-center justify-between text-xs">
              <span className="text-foreground">{lead.full_name || lead.email || "Unknown"}</span>
              <span className="truncate ml-2 text-muted-foreground">{lead.location_city || lead.email || ""}</span>
            </div>
          ))}
          {leads.length > 5 && (
            <div className="text-xs text-muted-foreground">+{leads.length - 5} more</div>
          )}
        </div>
      </div>
    )
  }

  if (toolName === "getJobsInStage") {
    const count = (result.count as number) || 0
    const stageName = (result.stageName as string) || "stage"
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
        <Kanban className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">
          {count} job{count !== 1 ? "s" : ""} in &ldquo;{stageName}&rdquo;
        </span>
      </div>
    )
  }

  if (result.success) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm dark:border-green-900/50 dark:bg-green-950/30">
        <CheckCircle2 className="size-4 shrink-0 text-green-500" />
        <span className="text-green-700 dark:text-green-300">{String(result.message || "Done")}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
      <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{getToolLabel(toolName)} complete</span>
    </div>
  )
}

// Render a tool invocation (loading or result)
function ToolCallDisplay({ invocation }: { invocation: ToolInvocationPart["toolInvocation"] }) {
  const { toolName, state } = invocation

  if (state === "call" || state === "partial-call") {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
        <span className="text-muted-foreground">{getToolLabel(toolName)}…</span>
      </div>
    )
  }

  if (state === "result") {
    const result = (invocation.result ?? {}) as Record<string, unknown>
    return <ToolResultCard toolName={toolName} result={result} />
  }

  return null
}

// Parse measurements display from AI response
function parseMeasurementsFromText(text: string): {
  measurementsData: MeasurementsData | null
  textBefore: string
  textAfter: string
} {
  const regex = /\[MEASUREMENTS\]([\s\S]*?)\[\/MEASUREMENTS\]/
  const match = text.match(regex)

  if (!match) {
    return { measurementsData: null, textBefore: text, textAfter: "" }
  }

  try {
    const measurementsData = JSON.parse(match[1]) as MeasurementsData
    const textBefore = text.slice(0, match.index).trim()
    const textAfter = text.slice((match.index || 0) + match[0].length).trim()
    return { measurementsData, textBefore, textAfter }
  } catch {
    return { measurementsData: null, textBefore: text, textAfter: "" }
  }
}

// Parse photos display from AI response
function parsePhotosFromText(text: string): {
  photosData: PhotosData | null
  textBefore: string
  textAfter: string
} {
  const regex = /\[PHOTOS\]([\s\S]*?)\[\/PHOTOS\]/
  const match = text.match(regex)

  if (!match) {
    return { photosData: null, textBefore: text, textAfter: "" }
  }

  try {
    const photosData = JSON.parse(match[1]) as PhotosData
    const textBefore = text.slice(0, match.index).trim()
    const textAfter = text.slice((match.index || 0) + match[0].length).trim()
    return { photosData, textBefore, textAfter }
  } catch {
    return { photosData: null, textBefore: text, textAfter: "" }
  }
}

// Main message content renderer - handles text with URLs, inline forms, and job pickers
function MessageContent({
  text,
  isUser,
  onFormSubmit,
  onJobSelect,
  onMeasurementsLoaded,
  onPhotosLoaded,
  isStreaming,
}: {
  text: string
  isUser: boolean
  onFormSubmit?: (form: InlineFormData, values: Record<string, string>) => void
  onJobSelect?: (job: HoverJob, action: string) => void
  onMeasurementsLoaded?: (job: HoverJob, measurements: Record<string, unknown>) => void
  onPhotosLoaded?: (job: HoverJob, photos: JobPhotosResult) => void
  isStreaming?: boolean
}) {
  // Check for form or job picker in the message (only for assistant messages)
  if (!isUser) {
    // First check if we have an incomplete form/job picker being streamed
    if (isStreaming) {
      const { hasIncomplete, textBefore } = hasIncompleteSpecialBlock(text)
      if (hasIncomplete) {
        return <StreamingPlaceholder textBefore={textBefore} />
      }
    }

    // Check for measurements display first
    const { measurementsData, textBefore: measTextBefore, textAfter: measTextAfter } = parseMeasurementsFromText(text)
    
    if (measurementsData) {
      return (
        <div className="flex flex-col gap-3">
          {measTextBefore && (
            <div className="whitespace-pre-wrap">
              <TextWithLinks text={measTextBefore} isUser={isUser} />
            </div>
          )}
          <MeasurementsDisplay
            measurements={measurementsData.measurements}
            jobName={measurementsData.jobName}
            address={measurementsData.address}
          />
          {measTextAfter && (
            <div className="whitespace-pre-wrap">
              <TextWithLinks text={measTextAfter} isUser={isUser} />
            </div>
          )}
        </div>
      )
    }

    // Check for photos display
    const { photosData, textBefore: photosTextBefore, textAfter: photosTextAfter } = parsePhotosFromText(text)
    
    if (photosData && photosData.photosResult) {
      return (
        <div className="flex flex-col gap-3">
          {photosTextBefore && (
            <div className="whitespace-pre-wrap">
              <TextWithLinks text={photosTextBefore} isUser={isUser} />
            </div>
          )}
          <PhotosDisplay
            jobDetails={photosData.photosResult.jobDetails!}
            scanPhotos={photosData.photosResult.scanPhotos || []}
            inspections={photosData.photosResult.inspections || []}
            wireframeImages={photosData.photosResult.wireframeImages || []}
            instantDesignImages={photosData.photosResult.instantDesignImages || []}
          />
          {photosTextAfter && (
            <div className="whitespace-pre-wrap">
              <TextWithLinks text={photosTextAfter} isUser={isUser} />
            </div>
          )}
        </div>
      )
    }

    // Check for job picker
    const { picker, textBefore: jobTextBefore, textAfter: jobTextAfter } = parseJobPickerFromText(text)
    
    if (picker) {
      return (
        <div className="flex flex-col gap-3">
          {jobTextBefore && (
            <div className="whitespace-pre-wrap">
              <TextWithLinks text={jobTextBefore} isUser={isUser} />
            </div>
          )}
          <JobPicker
            data={picker}
            onSelect={(job, action) => onJobSelect?.(job, action)}
            onMeasurementsLoaded={onMeasurementsLoaded}
            onPhotosLoaded={onPhotosLoaded}
            disabled={isStreaming}
          />
          {jobTextAfter && (
            <div className="whitespace-pre-wrap">
              <TextWithLinks text={jobTextAfter} isUser={isUser} />
            </div>
          )}
        </div>
      )
    }

    // Check for inline form
    const { form, textBefore, textAfter } = parseFormFromText(text)
    
    if (form) {
      // Use specialized form for capture requests to load users dropdown
      const isCaptureRequest = form.action === "create_capture_request"
      
      return (
        <div className="flex flex-col gap-3">
          {textBefore && (
            <div className="whitespace-pre-wrap">
              <TextWithLinks text={textBefore} isUser={isUser} />
            </div>
          )}
          {isCaptureRequest ? (
            <CaptureRequestForm
              onSubmit={(values) => onFormSubmit?.(form, values)}
              disabled={isStreaming}
            />
          ) : (
            <InlineForm
              form={form}
              onSubmit={(values) => onFormSubmit?.(form, values)}
              disabled={isStreaming}
            />
          )}
          {textAfter && (
            <div className="whitespace-pre-wrap">
              <TextWithLinks text={textAfter} isUser={isUser} />
            </div>
          )}
        </div>
      )
    }
  }
  
  return <TextWithNavigate text={text} isUser={isUser} />
}

const PROMPT_SUGGESTIONS = [
  {
    icon: Plus,
    label: "Create a new job",
    prompt: "Create a new Hover job for a property",
  },
  {
    icon: Kanban,
    label: "Move a job",
    prompt: "Help me move a job to a different pipeline stage",
  },
  {
    icon: Camera,
    label: "View job photos",
    prompt: "Show me the photos for a specific Hover job",
  },
  {
    icon: Ruler,
    label: "Get measurements",
    prompt: "Give me the measurements for a specific Hover job",
  },
]

const MORE_PROMPT_OPTIONS = [
  {
    category: "Pipeline Management",
    prompts: [
      { icon: Kanban, label: "Move a job", prompt: "Help me move a job to a different pipeline stage" },
      { icon: List, label: "List stages", prompt: "What pipeline stages do I have?" },
      { icon: Plus, label: "Add a stage", prompt: "Add a new stage to my sales pipeline" },
      { icon: GitBranch, label: "Rename a stage", prompt: "Rename one of my pipeline stages" },
    ],
  },
  {
    category: "Leads & Marketing",
    prompts: [
      { icon: Search, label: "Search leads", prompt: "Search my leads" },
      { icon: Users, label: "Update a lead", prompt: "Update the contact info for a lead" },
    ],
  },
  {
    category: "Jobs & Properties",
    prompts: [
      { icon: Search, label: "List all jobs", prompt: "Show me all my Hover jobs" },
      { icon: Building2, label: "Get job details", prompt: "Show me the details for a Hover job" },
      { icon: ClipboardCheck, label: "Inspection details", prompt: "Provide me with the inspection details for a specific Hover job" },
    ],
  },
  {
    category: "3D Models & Deliverables",
    prompts: [
      { icon: Download, label: "Download measurements", prompt: "Download a measurement report" },
      { icon: Ruler, label: "Roof measurements", prompt: "Get roof measurements for a job" },
      { icon: Sparkles, label: "Instant Design", prompt: "Show me the Instant Design images for a job" },
    ],
  },
  {
    category: "Organization",
    prompts: [
      { icon: Settings, label: "Settings", prompt: "Take me to settings" },
      { icon: Users, label: "Team members", prompt: "List the users in my Hover organization" },
      { icon: Wallet, label: "Check wallet", prompt: "What is my current Hover wallet balance?" },
      { icon: Bell, label: "Webhooks", prompt: "Show me my configured webhooks" },
    ],
  },
]

export default function ChatDetailPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = use(params)
  const { user, org } = useAuth()
  const { toggle: toggleSidebar, refreshChats } = useSidebar()
  const router = useRouter()
  const [input, setInput] = useState("")
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [chatError, setChatError] = useState<{ message: string; billingUrl?: string } | null>(null)
  const hasLoadedHistory = useRef(false)
  const autoDeleteTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasUserInteracted = useRef(false)

  const displayName = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ")[0]
    : "there"

  const provider = org?.llm_provider
    ? PROVIDER_LOGOS[org.llm_provider as keyof typeof PROVIDER_LOGOS]
    : null

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
          body: {
            messages: msgs,
            chatId,
            id,
          },
        }),
      }),
    [chatId],
  )

  // Track if we need to auto-trigger AI response after loading
  const [needsAIResponse, setNeedsAIResponse] = useState(false)
  const [manuallyStreaming, setManuallyStreaming] = useState(false)
  const [pendingUserMessage, setPendingUserMessage] = useState(false)
  const pendingMessages = useRef<UIMessage[]>([])

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    id: chatId,
    transport,
    onFinish: async () => {
      refreshChats()
      setPendingUserMessage(false)
      // Auto-generate chat title after first exchange
      await generateChatTitle(chatId)
      refreshChats() // Refresh again to show updated title
    },
    onError: (err) => {
      console.error("[v0] Chat error:", err)
      setPendingUserMessage(false)
      
      // Parse error for quota/billing issues
      const errStr = String(err)
      if (errStr.includes("insufficient_quota") || errStr.includes("exceeded") || errStr.includes("quota")) {
        // Determine billing URL based on provider
        const provider = org?.llm_provider?.toLowerCase()
        let billingUrl = ""
        let providerName = "your LLM provider"
        
        if (provider === "openai") {
          billingUrl = "https://platform.openai.com/account/billing"
          providerName = "OpenAI"
        } else if (provider === "anthropic") {
          billingUrl = "https://console.anthropic.com/settings/billing"
          providerName = "Anthropic"
        } else if (provider === "google") {
          billingUrl = "https://console.cloud.google.com/billing"
          providerName = "Google Cloud"
        } else if (provider === "mistral") {
          billingUrl = "https://console.mistral.ai/billing"
          providerName = "Mistral"
        } else if (provider === "groq") {
          billingUrl = "https://console.groq.com/settings/billing"
          providerName = "Groq"
        } else if (provider === "deepseek") {
          billingUrl = "https://platform.deepseek.com/usage"
          providerName = "DeepSeek"
        }
        
        setChatError({
          message: `Your ${providerName} API key has exceeded its quota. Please add credits to continue using the chat.`,
          billingUrl,
        })
      } else {
        setChatError({
          message: "An error occurred while processing your message. Please try again.",
        })
      }
    },
  })
  
  // Clear pending state when status becomes ready (response finished)
  // Add a small delay to ensure we don't flash the indicator off too early
  useEffect(() => {
    if (status === "ready" && pendingUserMessage) {
      const timer = setTimeout(() => {
        setPendingUserMessage(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [status, pendingUserMessage])

  // Load existing messages from DB on mount
  useEffect(() => {
    if (hasLoadedHistory.current) return
    hasLoadedHistory.current = true

    async function loadHistory() {
      const result = await getChatMessages(chatId)

      if (result.messages && result.messages.length > 0) {
        const uiMessages: UIMessage[] = result.messages.map(
          (msg: { id: string; role: string; content: string; created_at: string }) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            parts: [{ type: "text" as const, text: msg.content }],
            createdAt: new Date(msg.created_at),
          }),
        )
        setMessages(uiMessages)

        // If the last message is from user and there's no assistant response,
        // mark that we need to trigger the AI
        const lastMsg = result.messages[result.messages.length - 1]
        if (lastMsg.role === "user") {
          pendingMessages.current = uiMessages
          setNeedsAIResponse(true)
        }
      }
      setInitialLoaded(true)
    }
    loadHistory()
  }, [chatId, setMessages])

  // Auto-delete empty chats after 1 minute of inactivity
  useEffect(() => {
    // Only start timer for new chats (no messages loaded)
    if (!initialLoaded) return
    
    // If chat already has messages, mark as interacted and skip
    if (messages.length > 0) {
      hasUserInteracted.current = true
      if (autoDeleteTimerRef.current) {
        clearTimeout(autoDeleteTimerRef.current)
        autoDeleteTimerRef.current = null
      }
      return
    }
    
    // If user hasn't interacted yet, start the auto-delete timer
    if (!hasUserInteracted.current && !autoDeleteTimerRef.current) {
      autoDeleteTimerRef.current = setTimeout(async () => {
        // Double-check no messages were sent
        if (!hasUserInteracted.current && messages.length === 0) {
          await deleteChat(chatId)
          refreshChats()
          router.push("/chat")
        }
      }, 60 * 1000) // 1 minute
    }
    
    return () => {
      if (autoDeleteTimerRef.current) {
        clearTimeout(autoDeleteTimerRef.current)
        autoDeleteTimerRef.current = null
      }
    }
  }, [initialLoaded, messages.length, chatId, refreshChats, router])

  // Trigger AI response after messages are set (separate effect to avoid dependency issues)
  useEffect(() => {
    if (needsAIResponse && pendingMessages.current.length > 0 && status === "ready") {
      setNeedsAIResponse(false)
      setManuallyStreaming(true)
      // Use reload to re-send existing messages without adding a new one
      // Since useChat doesn't have reload with our messages, we'll manually fetch
      const triggerAI = async () => {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: pendingMessages.current, chatId }),
        })
        if (!response.ok || !response.body) {
          setManuallyStreaming(false)
          return
        }

        // Parse SSE stream and update messages
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let fullContent = ""
        const assistantMsgId = crypto.randomUUID()

        // Add placeholder assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: "" }],
            createdAt: new Date(),
          },
        ])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith("data:")) {
              const data = trimmed.slice(5).trim()
              if (data === "[DONE]") continue
              try {
                const parsed = JSON.parse(data)
                if (parsed.type === "text-delta" && parsed.delta) {
                  fullContent += parsed.delta
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, parts: [{ type: "text" as const, text: fullContent }] }
                        : m,
                    ),
                  )
                }
              } catch {
                /* Skip invalid JSON */
              }
            }
          }
        }
        setManuallyStreaming(false)
        refreshChats()
      }
      triggerAI()
    }
  }, [needsAIResponse, status, chatId, setMessages, refreshChats])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Persist user message and send to AI
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || status !== "ready") return
    hasUserInteracted.current = true // Cancel auto-delete
    setInput("")
    setChatError(null) // Clear any previous errors
    setPendingUserMessage(true)
    await addMessage(chatId, "user", text)
    sendMessage({ text })
  }

  // Handle prompt suggestion click
  async function handlePromptClick(prompt: string) {
    hasUserInteracted.current = true // Cancel auto-delete
    setChatError(null) // Clear any previous errors
    setPendingUserMessage(true) // Show loading indicator immediately
    await addMessage(chatId, "user", prompt)
    sendMessage({ text: prompt })
  }

  // Handle inline form submission
  async function handleFormSubmit(form: InlineFormData, values: Record<string, string>) {
    if (status !== "ready") return
    hasUserInteracted.current = true // Cancel auto-delete
    setPendingUserMessage(true)
    
    // Handle create_capture_request action directly
    if (form.action === "create_capture_request") {
      const userMessage = formatFormValues(form, values)
      await addMessage(chatId, "user", userMessage)
      
      // Call the server action
      const result = await createCaptureRequest({
        capturing_user_name: values.capturing_user_name,
        capturing_user_email: values.capturing_user_email,
        capturing_user_phone: values.capturing_user_phone || undefined,
        location_line_1: values.location_line_1,
        location_city: values.location_city || undefined,
        location_region: values.location_region || undefined,
        location_postal_code: values.location_postal_code || undefined,
        name: values.name || undefined,
        deliverable_id: values.deliverable_id ? parseInt(values.deliverable_id) : undefined,
        signup_type: (values.signup_type as "homeowner" | "pro") || undefined,
        assign_to_user_id: values.assign_to_user_id ? parseInt(values.assign_to_user_id) : undefined,
      })
      
      // Send result back to chat
      if (result.success) {
        const successMsg = `Capture request created successfully! An invitation has been sent to ${values.capturing_user_email}. They will receive an email (and SMS if phone provided) to download the Hover app and capture the property at ${values.location_line_1}.`
        await addMessage(chatId, "assistant", successMsg)
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: successMsg }],
        }])
      } else {
        const errorMsg = `Failed to create capture request: ${result.error}${result.errorDetails ? `\n\nDetails: ${result.errorDetails}` : ""}\n\nPlease check the information and try again.`
        await addMessage(chatId, "assistant", errorMsg)
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: errorMsg }],
        }])
      }
      setPendingUserMessage(false)
      return
    }
    
    // Default behavior for other forms
    const message = formatFormValues(form, values)
    await addMessage(chatId, "user", message)
    sendMessage({ text: message })
  }

  // Handle job selection from job picker
  async function handleJobSelect(job: HoverJob, action: string) {
    if (status !== "ready") return
    hasUserInteracted.current = true // Cancel auto-delete
    setPendingUserMessage(true) // Show loading indicator immediately
    const message = formatJobSelection(job, action)
    await addMessage(chatId, "user", message)
    sendMessage({ text: message })
  }
  
  // Handle measurements loaded from job picker
  async function handleMeasurementsLoaded(job: HoverJob, measurements: Record<string, unknown>) {
    if (status !== "ready") return
    hasUserInteracted.current = true // Cancel auto-delete
    setPendingUserMessage(true)
    
    // Format address
    const address = job.address 
      ? [job.address.location_line_1, job.address.city, job.address.region, job.address.postal_code].filter(Boolean).join(", ")
      : "No address"
    
    // Create a message that includes the measurements data
    const userMessage = `Selected: ${job.name || `Job #${job.id}`} at ${address} (ID: ${job.id}) - Get measurements`
    await addMessage(chatId, "user", userMessage)
    
    // Create the measurements display data
    const measurementsData: MeasurementsData = {
      jobName: job.name || `Job #${job.id}`,
      address,
      measurements,
    }
    
    // Add assistant message with the measurements
    const assistantMessage = `Here are the measurements for ${job.name || `Job #${job.id}`}:\n\n[MEASUREMENTS]${JSON.stringify(measurementsData)}[/MEASUREMENTS]`
    await addMessage(chatId, "assistant", assistantMessage)
    
  // Refresh messages to show the new measurements
  const { messages: refreshedMessages } = await getChatMessages(chatId)
  const uiMessages: UIMessage[] = (refreshedMessages || []).map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    parts: [{ type: "text", text: m.content }],
    createdAt: new Date(m.created_at),
  }))
  setMessages(uiMessages)
  setPendingUserMessage(false)
  
  // Auto-generate chat title with job info
  await generateChatTitle(chatId)
  refreshChats()
  }
  
  // Handle photos loaded from job picker
  async function handlePhotosLoaded(job: HoverJob, photosResult: JobPhotosResult) {
    if (status !== "ready") return
    hasUserInteracted.current = true
    setPendingUserMessage(true)
    
    // Format address
    const address = job.address 
      ? [job.address.location_line_1, job.address.city, job.address.region, job.address.postal_code].filter(Boolean).join(", ")
      : "No address"
    
    // Count total photos
    const scanCount = photosResult.scanPhotos?.length || 0
    const inspectionCount = photosResult.inspections?.reduce((acc, i) => acc + (i.photos?.length || 0), 0) || 0
    const wireframeCount = photosResult.wireframeImages?.length || 0
    const instantDesignCount = photosResult.instantDesignImages?.length || 0
    const totalPhotos = scanCount + inspectionCount + wireframeCount + instantDesignCount
    
    // Create a message that includes the photos data
    const userMessage = `Selected: ${job.name || `Job #${job.id}`} at ${address} (ID: ${job.id}) - View photos`
    await addMessage(chatId, "user", userMessage)
    
    // Create the photos display data
    const photosData: PhotosData = {
      jobName: job.name || `Job #${job.id}`,
      address,
      photosResult,
    }
    
    // Add assistant message with the photos
    const assistantMessage = `Here are the photos for ${job.name || `Job #${job.id}`} (${totalPhotos} photos total):\n\n[PHOTOS]${JSON.stringify(photosData)}[/PHOTOS]`
    await addMessage(chatId, "assistant", assistantMessage)
    
    // Refresh messages to show the new photos
    const { messages: refreshedMessages } = await getChatMessages(chatId)
    const uiMessages: UIMessage[] = (refreshedMessages || []).map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      parts: [{ type: "text", text: m.content }],
      createdAt: new Date(m.created_at),
    }))
    setMessages(uiMessages)
    setPendingUserMessage(false)
    
    // Auto-generate chat title with job info
    await generateChatTitle(chatId)
    refreshChats()
  }

  // Track streaming status - include when useChat reports streaming OR when we just sent a message
  const isStreaming = status === "streaming" || status === "submitted" || manuallyStreaming || pendingUserMessage

  if (!initialLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Mobile header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-[#111111] px-3 py-2.5 md:hidden">
        <button
          onClick={toggleSidebar}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
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
          <span className="text-sm font-semibold text-white">
            Hover Ninja<sup className="ml-1 text-[10px] font-medium text-white/50 align-super">ALPHA</sup>
          </span>
        </div>
      </header>

      {/* Hover not connected banner */}
      {!org?.hover_access_token && (
        <div className="shrink-0 border-b border-border bg-muted px-3 py-2">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-foreground">
              <AlertCircle className="size-4 shrink-0" />
              <p className="text-xs sm:text-sm">
                Connect your Hover account to access your jobs and measurements
              </p>
            </div>
            <Link
              href="/setup?step=hover"
              className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:px-3 sm:py-1.5 sm:text-sm"
            >
              Connect Hover
            </Link>
          </div>
        </div>
      )}

      {/* API quota/billing error banner */}
      {chatError && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/30">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="size-4 shrink-0" />
              <p className="text-xs sm:text-sm">
                {chatError.message}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {chatError.billingUrl && (
                <a
                  href={chatError.billingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 sm:px-3 sm:py-1.5 sm:text-sm"
                >
                  Add Credits
                </a>
              )}
              <button
                onClick={() => setChatError(null)}
                className="shrink-0 rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/50 sm:px-3 sm:py-1.5 sm:text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 sm:py-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-4">
          {/* Show welcome screen when chat is empty - identical to /chat page */}
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 sm:gap-6">
              <Image
                src="/images/hover-ninja-logo.png"
                alt="Hover Ninja logo"
                width={56}
                height={56}
                className="hidden size-14 sm:block"
              />
              <div className="text-center">
                <h1 className="text-base font-semibold text-foreground text-balance sm:text-lg">
                  {`Welcome, ${displayName}`}
                </h1>
                <p className="mt-1 max-w-md text-xs text-muted-foreground text-balance sm:text-sm">
                  Ask me anything about your Hover workspace, or try one of these to
                  get started:
                </p>
              </div>

              <div className="grid w-full max-w-md grid-cols-2 gap-2">
                {PROMPT_SUGGESTIONS.map((suggestion) => {
                  const SuggestionIcon = suggestion.icon
                  return (
                    <button
                      key={suggestion.label}
                      onClick={() => handlePromptClick(suggestion.prompt)}
                      disabled={isStreaming}
                      className="group flex min-h-[44px] items-start gap-2 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/20 hover:bg-accent disabled:opacity-50 sm:gap-3 sm:p-3.5"
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
              <div className="w-full max-w-md">
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
                                onClick={() => handlePromptClick(prompt.prompt)}
                                disabled={isStreaming}
                                className="group flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 text-xs transition-colors hover:border-primary/20 hover:bg-accent disabled:opacity-50 sm:px-3 sm:py-2 sm:text-sm"
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
          )}

          {messages.map((msg) => {
            const text = getUIMessageText(msg)
            const toolInvocationParts = (msg.parts || []).filter(
              (p): p is ToolInvocationPart => p.type === "tool-invocation",
            )
            // Skip messages with no renderable content
            if (!text && toolInvocationParts.length === 0) return null

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" && "justify-end",
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                    <Image
                      src="/images/hover-ninja-logo.png"
                      alt="Hover Ninja"
                      width={32}
                      height={32}
                      className="size-8 object-cover"
                    />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "whitespace-pre-wrap bg-primary px-4 py-3 text-primary-foreground"
                      : "bg-transparent",
                  )}
                >
                  {msg.role === "user" ? (
                    <MessageContent text={text} isUser={true} />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {/* Tool call cards (loading / result) */}
                      {toolInvocationParts.map((part) => (
                        <ToolCallDisplay
                          key={part.toolInvocation.toolCallId}
                          invocation={part.toolInvocation}
                        />
                      ))}
                      {/* Text / rich content from the AI */}
                      {text && (
                        <div className="whitespace-pre-wrap rounded-xl bg-muted px-4 py-3">
                          <MessageContent
                            text={text}
                            isUser={false}
                            onFormSubmit={handleFormSubmit}
                            onJobSelect={handleJobSelect}
                            onMeasurementsLoaded={handleMeasurementsLoaded}
                            onPhotosLoaded={handlePhotosLoaded}
                            isStreaming={isStreaming}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <User className="size-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          })}
          {/* Show typing indicator when streaming/pending */}
          {isStreaming && (
            <div className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                <Image
                  src="/images/hover-ninja-logo.png"
                  alt="Hover Ninja"
                  width={32}
                  height={32}
                  className="size-8 object-cover"
                />
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-muted px-4 py-3">
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar - always visible at bottom */}
      <div className="shrink-0 border-t border-border bg-background px-3 py-2 sm:px-4 sm:py-3">
        <div className="mx-auto w-full max-w-2xl">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm transition-all focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isStreaming ? "AI is responding..." : "Type your message..."}
              className="min-h-[44px] flex-1 bg-transparent px-2 text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="size-10 shrink-0 rounded-lg sm:size-8"
                onClick={() => stop()}
                aria-label="Stop generating"
              >
                <Square className="size-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="size-10 shrink-0 rounded-lg bg-[#18784a] text-white hover:bg-[#15663c] sm:size-8"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </form>
          <p className="mt-1.5 text-center text-xs text-muted-foreground sm:mt-2">
            Connected to {provider?.name || "AI"} and Hover
          </p>
        </div>
      </div>
    </div>
  )
}

import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from "ai"
import { createClient } from "@/lib/supabase/server"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createMistral } from "@ai-sdk/mistral"
import { createGroq } from "@ai-sdk/groq"

export const maxDuration = 60

function getModel(provider: string, apiKey: string) {
  switch (provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey })
      return openai("gpt-4o")
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey })
      return anthropic("claude-sonnet-4-20250514")
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey })
      return google("gemini-2.0-flash")
    }
    case "mistral": {
      const mistral = createMistral({ apiKey })
      return mistral("mistral-large-latest")
    }
    case "groq": {
      const groq = createGroq({ apiKey })
      return groq("llama-3.3-70b-versatile")
    }
    case "deepseek": {
      const deepseek = createOpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com/v1",
      })
      return deepseek("deepseek-chat")
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, chatId }: { messages: UIMessage[]; chatId: string } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { data: config, error: configError } = await supabase.rpc(
      "get_org_llm_config",
      { p_user_id: user.id },
    )

    if (configError || !config?.llm_provider || !config?.llm_api_key) {
      return new Response("LLM not configured", { status: 400 })
    }

  const model = getModel(config.llm_provider, config.llm_api_key)

  // Check if Hover is connected for the system prompt
  const hoverConnected = !!config.hover_access_token

  const saveAssistantMessage = async (text: string) => {
    if (!text) return
    await supabase.rpc("add_chat_message", {
      p_chat_id: chatId,
      p_user_id: user.id,
      p_role: "assistant",
      p_content: text,
    })
    if (messages.length <= 1) {
      const firstUserMsg = messages.find((m) => m.role === "user")
      const firstUserText = firstUserMsg?.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("")
      if (firstUserText) {
        await supabase.rpc("update_chat_title", {
          p_chat_id: chatId,
          p_user_id: user.id,
          p_title: firstUserText.slice(0, 60),
        })
      }
    }
  }

  const systemPrompt = `You are Hover Ninja, a helpful AI assistant for the Hover platform.
You help users manage their Hover workspace, including creating jobs, reviewing measurements, viewing photos, and understanding inspection details.

${hoverConnected ? `Hover is connected and ready to use.

CREATING CAPTURE REQUESTS / NEW JOBS:
When a user wants to create a new job, capture request, draft project, or send someone to capture a property, respond with ONLY this form (no other text before it):
[FORM]{"title":"Create Capture Request","description":"This will create a draft job and send an invitation to capture the property. The capturer will receive an email (and SMS if phone provided) with instructions to download the Hover app.","action":"create_capture_request","fields":[{"name":"capturing_user_name","label":"Capturer Name *","type":"text","required":true,"placeholder":"Full name of person who will capture the property"},{"name":"capturing_user_email","label":"Capturer Email *","type":"email","required":true,"placeholder":"Email address for capture invitation"},{"name":"capturing_user_phone","label":"Capturer Phone (for SMS)","type":"tel","required":false,"placeholder":"Required if you want SMS notification sent"},{"name":"location_line_1","label":"Street Address *","type":"text","required":true,"placeholder":"123 Main Street"},{"name":"location_city","label":"City","type":"text","required":false,"placeholder":"Denver"},{"name":"location_region","label":"State","type":"text","required":false,"placeholder":"CO"},{"name":"location_postal_code","label":"ZIP Code","type":"text","required":false,"placeholder":"80204"},{"name":"name","label":"Job Name","type":"text","required":false,"placeholder":"Defaults to address if not provided"},{"name":"deliverable_id","label":"Deliverable Type","type":"select","required":false,"options":[{"value":"3","label":"Complete Exterior (default)"},{"value":"2","label":"Roof Only"},{"value":"7","label":"Photos Only"},{"value":"8","label":"Interior"}]},{"name":"signup_type","label":"Capturer Type","type":"select","required":false,"options":[{"value":"homeowner","label":"Homeowner (default)"},{"value":"pro","label":"Professional"}]}]}[/FORM]

After form submission, the system will process the API call automatically.

VIEWING MEASUREMENTS:
When a user asks about measurements, viewing measurements, getting measurements, roof measurements, siding measurements, or any measurement-related request, respond with ONLY this job picker (with a brief intro):
Here are your jobs with completed measurements. Select one to view its detailed measurements:

[JOBS]{"title":"Select a Job for Measurements","description":"Only jobs with completed measurements are shown. Use the search box to filter by name, address, email, or job ID.","action":"get_measurements","fetchFromApi":true}[/JOBS]

The job picker will automatically load jobs from the API and let users search/filter. When they select a job, the measurements will be fetched and displayed automatically in a clean, organized format with sections for Roof, Siding, Trim, Openings, Roofline, Footprint, and Corners.

VIEWING PHOTOS:
When a user asks about photos, viewing photos, getting photos, images, pictures, scan photos, inspection photos, wireframe images, or any photo/image-related request, ALWAYS respond with a job picker. NEVER ask for clarification - always show the job picker.

If the user specifies a job identifier (address, street name, job ID, job name, or customer name), include a "searchQuery" to pre-filter:

Here are the matching jobs for "[search term]". Select one to view its photos:

[JOBS]{"title":"Select a Job for Photos","description":"Showing jobs matching your search.","action":"get_photos","fetchFromApi":true,"searchQuery":"THE SEARCH TERM"}[/JOBS]

Examples: "Get photos for 419 48th st" -> searchQuery:"419 48th", "photos for job 19782217" -> searchQuery:"19782217"

If NO specific job is mentioned (e.g., "show me photos", "view photos", "get photos for a job"), show ALL jobs without a searchQuery:

Here are your jobs. Select one to view its photos:

[JOBS]{"title":"Select a Job for Photos","description":"All jobs are shown. Use the search box to filter by name, address, email, or job ID.","action":"get_photos","fetchFromApi":true}[/JOBS]

The job picker displays Scan Photos, Inspection Photos, and Sketches (wireframes for completed jobs).` 
: "Hover is not connected. Please ask the user to connect their Hover account in Settings."}

Be concise and helpful. Use markdown for formatting responses.`

  const modelMessages = await convertToModelMessages(messages)
  
  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    abortSignal: req.signal,
  })

  consumeStream(result.toUIMessageStream())
  
  return result.toUIMessageStreamResponse({
    async onFinish({ text }) {
      await saveAssistantMessage(text)
    },
  })
  } catch (error) {
    console.error("[v0] CHAT API ERROR:", error)
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}

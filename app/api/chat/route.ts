import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
  tool,
} from "ai"
import { z } from "zod"
import { createClient, createAdminClient } from "@/lib/supabase/server"
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

    const { data: configData, error: configError } = await supabase.rpc(
      "get_org_llm_config",
      { p_user_id: user.id },
    )

    // RPC returns an array of rows, get the first one
    const config = Array.isArray(configData) ? configData[0] : configData

    if (configError || !config?.llm_provider || !config?.llm_api_key) {
      return new Response("LLM not configured", { status: 400 })
    }

    const model = getModel(config.llm_provider, config.llm_api_key)
    const hoverConnected = !!config.hover_access_token

    // Get org ID for internal Hover Ninja actions
    const adminClient = createAdminClient()
    const { data: member } = await supabase
      .from("members")
      .select("org_id")
      .eq("user_id", user.id)
      .single()
    const orgId = member?.org_id as string | undefined

    // Fetch current pipeline stages to inject into system prompt
    let stagesContext = ""
    if (orgId) {
      const { data: stages } = await adminClient
        .from("stages")
        .select("id, name, pipeline_type, sort_order, probability")
        .eq("org_id", orgId)
        .order("pipeline_type")
        .order("sort_order", { ascending: true })

      if (stages && stages.length > 0) {
        const salesStages = stages.filter((s) => s.pipeline_type === "sales")
        const productionStages = stages.filter((s) => s.pipeline_type === "production")

        stagesContext = `

HOVER NINJA PIPELINE STAGES (use these exact IDs with pipeline tools):
Sales Pipeline:
${salesStages.map((s) => `  - "${s.name}" → stageId: "${s.id}" (${s.probability}% probability)`).join("\n")}

Production Pipeline:
${productionStages.map((s) => `  - "${s.name}" → stageId: "${s.id}" (${s.probability}% probability)`).join("\n")}`
      }
    }

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

    const systemPrompt = `You are Hover Ninja, a helpful AI assistant for both the Hover platform and for managing actions inside the Hover Ninja app itself.
You help users with Hover jobs (measurements, photos, capture requests) AND with managing their Hover Ninja account (pipeline stages, leads, settings).

HOVER NINJA APP PAGES:
- Sales Pipeline: /sales
- Production Pipeline: /production
- Marketing Pipeline (Leads): /marketing
- Settings: /settings

When directing users to a page, include a navigate block like: [NAVIGATE]{"url":"/sales","label":"View Sales Pipeline"}[/NAVIGATE]

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
: "Hover is not connected. Users can still manage their Hover Ninja pipelines, leads, and settings without Hover being connected."}
${stagesContext}

HOVER NINJA INTERNAL ACTIONS — use the available tools for these:

MOVING JOBS BETWEEN PIPELINE STAGES:
- If the user gives you a numeric Hover job ID, call moveJobToStage directly using the stageId from the pipeline stages list above.
- If the user doesn't know the job ID, show them a job picker first:
  [JOBS]{"title":"Select a Job to Move","description":"Select the job you want to move to a different pipeline stage.","action":"move_to_stage","fetchFromApi":true}[/JOBS]
  After the user selects, you will receive the job ID — then call moveJobToStage.
- Always confirm the move with a success message after the tool completes.

PIPELINE STAGE MANAGEMENT:
- List stages: use listPipelineStages tool
- Create a new stage: use createPipelineStage tool
- Rename a stage: use renamePipelineStage tool
- Delete a stage: use deletePipelineStage tool — always warn the user first that this will remove all job assignments from that stage

LEAD MANAGEMENT (Marketing Pipeline):
- Search leads: use searchLeads tool
- Update lead info: use updateLead tool
- To see all leads visually, direct users to [NAVIGATE]{"url":"/marketing","label":"View Marketing Pipeline"}[/NAVIGATE]

SETTINGS:
- Direct users to [NAVIGATE]{"url":"/settings","label":"Go to Settings"}[/NAVIGATE] for LLM key configuration, Hover OAuth, pipeline stage management, and feature toggles.

After using tools, always summarize what was done in a helpful text response.

Be concise and helpful. Use markdown for formatting responses.`

    // Tools for Hover Ninja internal actions — scoped to orgId
    const ninjaTools = orgId
      ? {
          listPipelineStages: tool({
            description:
              "List all pipeline stages for the Sales and/or Production pipelines in Hover Ninja",
            parameters: z.object({
              pipelineType: z
                .enum(["sales", "production", "all"])
                .optional()
                .describe("Which pipeline to list. Omit for all."),
            }),
            execute: async ({ pipelineType }) => {
              let query = adminClient
                .from("stages")
                .select("id, name, pipeline_type, sort_order, probability")
                .eq("org_id", orgId)
                .order("pipeline_type")
                .order("sort_order", { ascending: true })

              if (pipelineType && pipelineType !== "all") {
                query = query.eq("pipeline_type", pipelineType)
              }

              const { data: stages, error } = await query
              if (error) return { error: error.message }
              return { stages: stages || [] }
            },
          }),

          moveJobToStage: tool({
            description:
              "Move a Hover job to a specific pipeline stage in Hover Ninja. Use the stageId from the pipeline stages context.",
            parameters: z.object({
              hoverJobId: z.number().describe("The numeric Hover job ID"),
              stageId: z
                .string()
                .describe("The target stage UUID to move the job to"),
              stageName: z
                .string()
                .optional()
                .describe("The stage name for the confirmation message"),
            }),
            execute: async ({ hoverJobId, stageId, stageName }) => {
              const { error } = await adminClient.from("job_stages").upsert(
                {
                  org_id: orgId,
                  hover_job_id: hoverJobId,
                  stage_id: stageId,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "org_id,hover_job_id" },
              )

              if (error) return { success: false, error: error.message }
              return {
                success: true,
                message: `Job #${hoverJobId} has been moved to "${stageName || stageId}".`,
              }
            },
          }),

          createPipelineStage: tool({
            description:
              "Create a new stage in the Sales or Production pipeline",
            parameters: z.object({
              name: z.string().describe("Name for the new stage"),
              pipelineType: z
                .enum(["sales", "production"])
                .describe("Which pipeline to add the stage to"),
              probability: z
                .number()
                .min(0)
                .max(100)
                .optional()
                .describe("Win probability percentage (0–100)"),
            }),
            execute: async ({ name, pipelineType, probability = 0 }) => {
              const { data: lastStage } = await adminClient
                .from("stages")
                .select("sort_order")
                .eq("org_id", orgId)
                .eq("pipeline_type", pipelineType)
                .order("sort_order", { ascending: false })
                .limit(1)
                .single()

              const newSortOrder = (lastStage?.sort_order ?? -1) + 1

              const { data: stage, error } = await adminClient
                .from("stages")
                .insert({
                  org_id: orgId,
                  name,
                  sort_order: newSortOrder,
                  is_default: false,
                  pipeline_type: pipelineType,
                  probability,
                })
                .select()
                .single()

              if (error) return { success: false, error: error.message }
              return {
                success: true,
                stage,
                message: `Created new ${pipelineType} stage "${name}".`,
              }
            },
          }),

          renamePipelineStage: tool({
            description:
              "Rename or update a pipeline stage's name or probability percentage",
            parameters: z.object({
              stageId: z
                .string()
                .describe("The stage UUID to update"),
              name: z
                .string()
                .optional()
                .describe("New name for the stage"),
              probability: z
                .number()
                .min(0)
                .max(100)
                .optional()
                .describe("New win probability percentage (0–100)"),
            }),
            execute: async ({ stageId, name, probability }) => {
              const updates: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
              }
              if (name !== undefined) updates.name = name
              if (probability !== undefined) updates.probability = probability

              const { error } = await adminClient
                .from("stages")
                .update(updates)
                .eq("id", stageId)
                .eq("org_id", orgId)

              if (error) return { success: false, error: error.message }
              return { success: true, message: "Stage updated successfully." }
            },
          }),

          deletePipelineStage: tool({
            description:
              "Delete a pipeline stage. WARNING: removes all job assignments for this stage. Only call after user has confirmed.",
            parameters: z.object({
              stageId: z
                .string()
                .describe("The stage UUID to delete"),
              stageName: z
                .string()
                .describe("The stage name (used in confirmation message)"),
            }),
            execute: async ({ stageId, stageName }) => {
              // Remove job assignments first
              await adminClient
                .from("job_stages")
                .delete()
                .eq("stage_id", stageId)
                .eq("org_id", orgId)

              const { error } = await adminClient
                .from("stages")
                .delete()
                .eq("id", stageId)
                .eq("org_id", orgId)

              if (error) return { success: false, error: error.message }
              return {
                success: true,
                message: `Stage "${stageName}" has been deleted.`,
              }
            },
          }),

          getJobsInStage: tool({
            description:
              "Get all Hover job IDs assigned to a specific pipeline stage",
            parameters: z.object({
              stageId: z
                .string()
                .describe("The stage UUID to query"),
              stageName: z
                .string()
                .optional()
                .describe("The stage name for context"),
            }),
            execute: async ({ stageId, stageName }) => {
              const { data: jobStages, error } = await adminClient
                .from("job_stages")
                .select("hover_job_id, updated_at")
                .eq("stage_id", stageId)
                .eq("org_id", orgId)
                .order("updated_at", { ascending: false })

              if (error) return { error: error.message }
              const jobs = (jobStages || []).map((j) => ({
                hoverJobId: j.hover_job_id,
                movedAt: j.updated_at,
              }))
              return {
                stageName: stageName || stageId,
                count: jobs.length,
                jobs,
              }
            },
          }),

          searchLeads: tool({
            description:
              "Search for leads in the marketing pipeline by name, email, phone number, or address",
            parameters: z.object({
              query: z
                .string()
                .describe(
                  "Search query — can be a name, email, address, or phone number",
                ),
            }),
            execute: async ({ query }) => {
              const searchTerm = `%${query}%`
              const { data: leads, error } = await adminClient
                .from("leads")
                .select(
                  "id, full_name, email, phone_number, location_line_1, location_city, location_region, created_at",
                )
                .eq("org_id", orgId)
                .or(
                  `full_name.ilike.${searchTerm},email.ilike.${searchTerm},phone_number.ilike.${searchTerm},location_line_1.ilike.${searchTerm},location_city.ilike.${searchTerm}`,
                )
                .order("created_at", { ascending: false })
                .limit(10)

              if (error) return { error: error.message }
              return { leads: leads || [], count: leads?.length || 0 }
            },
          }),

          updateLead: tool({
            description:
              "Update a lead's contact information in the marketing pipeline",
            parameters: z.object({
              leadId: z.string().describe("The lead UUID"),
              fullName: z.string().optional().describe("Updated full name"),
              email: z.string().optional().describe("Updated email address"),
              phoneNumber: z
                .string()
                .optional()
                .describe("Updated phone number"),
              locationLine1: z
                .string()
                .optional()
                .describe("Updated street address"),
              locationCity: z.string().optional().describe("Updated city"),
              locationRegion: z
                .string()
                .optional()
                .describe("Updated state/region"),
              locationPostalCode: z
                .string()
                .optional()
                .describe("Updated ZIP/postal code"),
            }),
            execute: async ({
              leadId,
              fullName,
              email,
              phoneNumber,
              locationLine1,
              locationCity,
              locationRegion,
              locationPostalCode,
            }) => {
              const updates: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
              }
              if (fullName !== undefined) updates.full_name = fullName
              if (email !== undefined) updates.email = email
              if (phoneNumber !== undefined) updates.phone_number = phoneNumber
              if (locationLine1 !== undefined)
                updates.location_line_1 = locationLine1
              if (locationCity !== undefined) updates.location_city = locationCity
              if (locationRegion !== undefined)
                updates.location_region = locationRegion
              if (locationPostalCode !== undefined)
                updates.location_postal_code = locationPostalCode

              const { error } = await adminClient
                .from("leads")
                .update(updates)
                .eq("id", leadId)
                .eq("org_id", orgId)

              if (error) return { success: false, error: error.message }
              return { success: true, message: "Lead updated successfully." }
            },
          }),
        }
      : {}

    const modelMessages = await convertToModelMessages(messages)

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      tools: ninjaTools,
      maxSteps: 5,
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
      headers: { "Content-Type": "application/json" },
    })
  }
}

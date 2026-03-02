import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { gateway } from "@ai-sdk/gateway"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, orgId, currentSalesStages, currentProductionStages } = body

    if (!prompt || !orgId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user has access to this org
    const adminSupabase = createAdminClient()
    const { data: membership } = await adminSupabase
      .from("members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get org's LLM config
    const { data: config } = await adminSupabase.rpc("get_org_llm_config", {
      p_user_id: user.id,
    })

    const orgConfig = Array.isArray(config) ? config[0] : config
    if (!orgConfig?.llm_provider || !orgConfig?.llm_api_key) {
      return NextResponse.json({ error: "LLM not configured" }, { status: 400 })
    }

    // Generate stages using AI
    const systemPrompt = `You are a helpful assistant that helps configure CRM pipeline stages for roofing and exterior contractors.

Based on the user's description, generate appropriate stages for their sales and/or production pipelines.

Current sales stages: ${currentSalesStages.join(", ") || "None"}
Current production stages: ${currentProductionStages.join(", ") || "None"}

Respond with a JSON object containing:
- salesStages: array of stage names for the sales pipeline (if mentioned)
- productionStages: array of stage names for the production pipeline (if mentioned)

Only include the pipelines the user mentions. Keep stage names concise (2-4 words each).
Typical sales stages flow: Lead → Appointment → Proposal → Negotiation → Won/Lost
Typical production stages flow: Scheduled → Materials → In Progress → Complete

Respond ONLY with valid JSON, no other text.`

    // Map provider to appropriate model
    const modelMap: Record<string, string> = {
      openai: "openai/gpt-4o-mini",
      anthropic: "anthropic/claude-3-5-haiku-20241022",
      google: "google/gemini-2.0-flash",
      mistral: "mistral/mistral-small-latest",
      groq: "groq/llama-3.1-8b-instant",
      deepseek: "deepseek/deepseek-chat",
    }
    
    const modelId = modelMap[orgConfig.llm_provider] || "openai/gpt-4o-mini"
    
    const { text } = await generateText({
      model: gateway(modelId, {
        apiKey: orgConfig.llm_api_key,
      }),
      system: systemPrompt,
      prompt: prompt,
    })

    // Parse the AI response
    let parsedStages: { salesStages?: string[]; productionStages?: string[] }
    try {
      // Clean up the response in case it has markdown code blocks
      const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      parsedStages = JSON.parse(cleanedText)
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }

    const result: { salesStages?: any[]; productionStages?: any[] } = {}

    // Update sales stages if provided
    if (parsedStages.salesStages && parsedStages.salesStages.length > 0) {
      // Delete existing sales stages
      await adminSupabase
        .from("stages")
        .delete()
        .eq("org_id", orgId)
        .eq("pipeline_type", "sales")

      // Insert new sales stages
      const salesInserts = parsedStages.salesStages.map((name, idx) => ({
        org_id: orgId,
        name,
        sort_order: idx,
        is_default: idx === 0,
        pipeline_type: "sales",
        probability: Math.round((idx / (parsedStages.salesStages!.length - 1)) * 100) || 0,
      }))

      const { data: newSalesStages } = await adminSupabase
        .from("stages")
        .insert(salesInserts)
        .select()

      result.salesStages = newSalesStages
    }

    // Update production stages if provided
    if (parsedStages.productionStages && parsedStages.productionStages.length > 0) {
      // Delete existing production stages
      await adminSupabase
        .from("stages")
        .delete()
        .eq("org_id", orgId)
        .eq("pipeline_type", "production")

      // Insert new production stages
      const productionInserts = parsedStages.productionStages.map((name, idx) => ({
        org_id: orgId,
        name,
        sort_order: idx,
        is_default: idx === 0,
        pipeline_type: "production",
        probability: 100,
      }))

      const { data: newProductionStages } = await adminSupabase
        .from("stages")
        .insert(productionInserts)
        .select()

      result.productionStages = newProductionStages
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Generate stages error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate stages" },
      { status: 500 }
    )
  }
}

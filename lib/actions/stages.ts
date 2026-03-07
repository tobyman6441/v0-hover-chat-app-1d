"use server"

import { createAdminClient } from "@/lib/supabase/server"

export type PipelineType = "sales" | "production"

export interface Stage {
  id: string
  org_id: string
  name: string
  sort_order: number
  is_default: boolean
  pipeline_type: PipelineType
  probability: number
  linked_stage_id: string | null
  created_at: string
  updated_at: string
}

export interface JobStage {
  id: string
  org_id: string
  hover_job_id: number
  stage_id: string | null
  created_at: string
  updated_at: string
}

// Get all stages for an organization, optionally filtered by pipeline type
export async function getStages(orgId: string, pipelineType?: PipelineType): Promise<{ stages: Stage[]; error?: string }> {
  const supabase = createAdminClient()
  
  let query = supabase
    .from("stages")
    .select("*")
    .eq("org_id", orgId)
  
  if (pipelineType) {
    query = query.eq("pipeline_type", pipelineType)
  }
  
  const { data: stages, error } = await query.order("sort_order", { ascending: true })

  if (error) return { stages: [], error: error.message }
  
  return { stages: stages || [] }
}

// Default stage definitions: Sales (with probability) and Production. Sales "Approved" links to Production "Approved".
const DEFAULT_PRODUCTION_STAGES = [
  { name: "Pre-production", sort_order: 0, probability: 0 },
  { name: "Install", sort_order: 1, probability: 0 },
  { name: "Approved", sort_order: 2, probability: 100 },
] as const

const DEFAULT_SALES_STAGES = [
  { name: "Pre-appointment", sort_order: 0, probability: 10 },
  { name: "Appointment scheduled", sort_order: 1, probability: 25 },
  { name: "Waiting", sort_order: 2, probability: 50 },
  { name: "Approved", sort_order: 3, probability: 100 },
] as const

// Initialize default stages for an organization (if none exist). Creates sales and production pipelines with Sales "Approved" linked to Production "Approved".
export async function initializeDefaultStages(orgId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Check if we already have stages with pipeline_type (sales or production)
  const { data: existingStages } = await supabase
    .from("stages")
    .select("id, pipeline_type")
    .eq("org_id", orgId)
    .limit(10)

  const hasSales = existingStages?.some((s: { pipeline_type?: string }) => s.pipeline_type === "sales")
  const hasProduction = existingStages?.some((s: { pipeline_type?: string }) => s.pipeline_type === "production")
  if (hasSales && hasProduction) {
    return { success: true }
  }

  let productionApprovedId: string | null = null

  // Create production stages first so we can link Sales Approved → Production Approved
  if (!hasProduction) {
    for (const row of DEFAULT_PRODUCTION_STAGES) {
      const { data: stage, error } = await supabase
        .from("stages")
        .insert({
          org_id: orgId,
          name: row.name,
          sort_order: row.sort_order,
          is_default: true,
          pipeline_type: "production",
          probability: row.probability,
        })
        .select("id")
        .single()
      if (error) return { success: false, error: error.message }
      if (row.name === "Approved") productionApprovedId = stage.id
    }
  }

  // Create sales stages; link "Approved" to Production "Approved"
  if (!hasSales) {
    for (const row of DEFAULT_SALES_STAGES) {
      const { error } = await supabase
        .from("stages")
        .insert({
          org_id: orgId,
          name: row.name,
          sort_order: row.sort_order,
          is_default: true,
          pipeline_type: "sales",
          probability: row.probability,
          linked_stage_id: row.name === "Approved" && productionApprovedId ? productionApprovedId : null,
        })
      if (error) return { success: false, error: error.message }
    }
  }

  // If we just created production stages but sales already existed, link existing Sales "Approved" to Production "Approved"
  if (productionApprovedId && hasSales) {
    const { data: salesApproved } = await supabase
      .from("stages")
      .select("id")
      .eq("org_id", orgId)
      .eq("pipeline_type", "sales")
      .eq("name", "Approved")
      .limit(1)
      .maybeSingle()
    if (salesApproved?.id) {
      await supabase
        .from("stages")
        .update({ linked_stage_id: productionApprovedId, updated_at: new Date().toISOString() })
        .eq("id", salesApproved.id)
    }
  }

  return { success: true }
}

// Create a new stage
export async function createStage(
  orgId: string,
  name: string, 
  pipelineType: PipelineType = "sales",
  probability: number = 0
): Promise<{ stage?: Stage; error?: string }> {
  const supabase = createAdminClient()

  // Get the highest sort_order for this pipeline type
  const { data: lastStage } = await supabase
    .from("stages")
    .select("sort_order")
    .eq("org_id", orgId)
    .eq("pipeline_type", pipelineType)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single()

  const newSortOrder = (lastStage?.sort_order ?? -1) + 1

  const { data: stage, error } = await supabase
    .from("stages")
    .insert({
      org_id: orgId,
      name,
      sort_order: newSortOrder,
      is_default: false,
      pipeline_type: pipelineType,
      probability
    })
    .select()
    .single()

  if (error) return { error: error.message }
  
  return { stage }
}

// Update a stage (admin only)
export async function updateStage(
  stageId: string, 
  updates: { name?: string; sort_order?: number; probability?: number; linked_stage_id?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("stages")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", stageId)

  if (error) return { success: false, error: error.message }
  
  return { success: true }
}

// Reorder stages (admin only)
export async function reorderStages(
  stageIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Update each stage's sort_order
  for (let i = 0; i < stageIds.length; i++) {
    const { error } = await supabase
      .from("stages")
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq("id", stageIds[i])

    if (error) return { success: false, error: error.message }
  }
  
  return { success: true }
}

// Delete a stage (admin only - now allows deleting any stage including defaults)
export async function deleteStage(stageId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // First, delete any job_stages referencing this stage
  await supabase
    .from("job_stages")
    .delete()
    .eq("stage_id", stageId)

  // Then delete the stage itself
  const { error } = await supabase
    .from("stages")
    .delete()
    .eq("id", stageId)

  if (error) return { success: false, error: error.message }
  
  return { success: true }
}

// Get all job stages for an organization
export async function getJobStages(orgId: string): Promise<{ jobStages: JobStage[]; error?: string }> {
  const supabase = createAdminClient()

  const { data: jobStages, error } = await supabase
    .from("job_stages")
    .select("*")
    .eq("org_id", orgId)

  if (error) return { jobStages: [], error: error.message }
  
  return { jobStages: jobStages || [] }
}

// Update a job's stage
// Note: Linked stages are handled at query time by getJobStagesForPipeline,
// NOT by storing multiple records (since job_stages has a unique constraint on org_id,hover_job_id)
export async function updateJobStage(
  orgId: string,
  hoverJobId: number, 
  stageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Use direct upsert instead of RPC function (admin client bypasses RLS)
  // The RPC function uses auth.uid() which is null with service role
  const { error } = await supabase
    .from("job_stages")
    .upsert(
      {
        org_id: orgId,
        hover_job_id: hoverJobId,
        stage_id: stageId,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "org_id,hover_job_id"
      }
    )

  if (error) {
    console.error("updateJobStage error:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

// Get job stages for a specific pipeline (considering linked stages)
export async function getJobStagesForPipeline(
  orgId: string,
  pipelineType: PipelineType
): Promise<{ jobStages: JobStage[]; error?: string }> {
  const supabase = createAdminClient()

  // Get stages for this pipeline AND stages that link TO this pipeline's stages
  const { data: pipelineStages } = await supabase
    .from("stages")
    .select("id, linked_stage_id")
    .eq("org_id", orgId)
    .eq("pipeline_type", pipelineType)

  if (!pipelineStages || pipelineStages.length === 0) return { jobStages: [] }

  const pipelineStageIds = pipelineStages.map(s => s.id)
  
  // Also get stages from OTHER pipelines that link to THIS pipeline's stages
  // (so if a job is in production's "Approved" which links to sales' "Approved", 
  // it should show up in sales' "Approved")
  const { data: linkedFromOtherPipeline } = await supabase
    .from("stages")
    .select("id, linked_stage_id")
    .eq("org_id", orgId)
    .neq("pipeline_type", pipelineType)
    .in("linked_stage_id", pipelineStageIds)

  // Build a map: other pipeline stage ID -> this pipeline stage ID
  const linkedStageMap: Record<string, string> = {}
  if (linkedFromOtherPipeline) {
    for (const stage of linkedFromOtherPipeline) {
      if (stage.linked_stage_id) {
        linkedStageMap[stage.id] = stage.linked_stage_id
      }
    }
  }
  
  // Get ALL job stages for this org
  const { data: allJobStages, error } = await supabase
    .from("job_stages")
    .select("*")
    .eq("org_id", orgId)

  if (error) return { jobStages: [], error: error.message }
  if (!allJobStages) return { jobStages: [] }

  // Filter and transform job stages
  const jobStages: JobStage[] = []
  for (const js of allJobStages) {
    if (!js.stage_id) continue
    
    // If the job's stage is directly in this pipeline, include it
    if (pipelineStageIds.includes(js.stage_id)) {
      jobStages.push(js)
    } 
    // If the job's stage is in another pipeline but links to this pipeline, 
    // transform it to use this pipeline's stage
    else if (linkedStageMap[js.stage_id]) {
      jobStages.push({
        ...js,
        stage_id: linkedStageMap[js.stage_id]
      })
    }
  }
  
  return { jobStages }
}

// Ensure a job has a stage assignment (creates one in first stage if not exists)
export async function ensureJobStage(orgId: string, hoverJobId: number): Promise<{ jobStageId?: string; error?: string }> {
  const supabase = createAdminClient()

  const { data: jobStageId, error } = await supabase.rpc("get_or_create_job_stage", {
    p_org_id: orgId,
    p_hover_job_id: hoverJobId
  })

  if (error) return { error: error.message }
  
  return { jobStageId }
}

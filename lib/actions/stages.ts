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

// Initialize default stages for an organization (if none exist)
export async function initializeDefaultStages(orgId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Check if stages already exist
  const { data: existingStages } = await supabase
    .from("stages")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)

  if (existingStages && existingStages.length > 0) {
    return { success: true } // Already initialized
  }

  // Use the database function to create default stages
  const { error } = await supabase.rpc("create_default_stages", {
    p_org_id: orgId
  })

  if (error) return { success: false, error: error.message }
  
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

// Update a job's stage (handles linked stages automatically)
export async function updateJobStage(
  orgId: string,
  hoverJobId: number, 
  stageId: string,
  syncLinkedStages: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Update the job stage
  const { error } = await supabase.rpc("update_job_stage", {
    p_org_id: orgId,
    p_hover_job_id: hoverJobId,
    p_stage_id: stageId
  })

  if (error) return { success: false, error: error.message }

  // If syncing linked stages, also update linked stage assignments
  if (syncLinkedStages) {
    const { data: stage } = await supabase
      .from("stages")
      .select("linked_stage_id")
      .eq("id", stageId)
      .single()

    if (stage?.linked_stage_id) {
      // Also assign to the linked stage
      await supabase.rpc("update_job_stage", {
        p_org_id: orgId,
        p_hover_job_id: hoverJobId,
        p_stage_id: stage.linked_stage_id
      })
    }
  }
  
  return { success: true }
}

// Get job stages for a specific pipeline (considering linked stages)
export async function getJobStagesForPipeline(
  orgId: string,
  pipelineType: PipelineType
): Promise<{ jobStages: JobStage[]; error?: string }> {
  const supabase = createAdminClient()

  // Get stages for this pipeline
  const { data: stages } = await supabase
    .from("stages")
    .select("id")
    .eq("org_id", orgId)
    .eq("pipeline_type", pipelineType)

  if (!stages || stages.length === 0) return { jobStages: [] }

  const stageIds = stages.map(s => s.id)

  // Get job stages that belong to this pipeline's stages
  const { data: jobStages, error } = await supabase
    .from("job_stages")
    .select("*")
    .eq("org_id", orgId)
    .in("stage_id", stageIds)

  if (error) return { jobStages: [], error: error.message }
  
  return { jobStages: jobStages || [] }
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

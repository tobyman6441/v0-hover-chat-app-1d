"use server"

import { createClient } from "@/lib/supabase/server"

export interface LeadInstantDesignImageRow {
  image_id: number
  job_id: number | null
}

/** Get count of instant design images per lead for the current org (for leads list). */
export async function getLeadInstantDesignCounts(): Promise<{
  success: boolean
  counts?: Record<number, number>
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: membership } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id)
    .single()
  if (!membership?.org_id) return { success: false, error: "No organization" }

  const { data: rows, error } = await supabase
    .from("lead_instant_design_images")
    .select("lead_id")
    .eq("org_id", membership.org_id)

  if (error) return { success: false, error: error.message }

  const counts: Record<number, number> = {}
  for (const row of rows || []) {
    const leadId = (row as { lead_id: number }).lead_id
    counts[leadId] = (counts[leadId] ?? 0) + 1
  }
  return { success: true, counts }
}

/** Get instant design image ids (and job_id) for a lead (for lead detail "Saved designs"). */
export async function getLeadInstantDesignImages(leadId: number): Promise<{
  success: boolean
  images?: LeadInstantDesignImageRow[]
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: membership } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id)
    .single()
  if (!membership?.org_id) return { success: false, error: "No organization" }

  const { data: rows, error } = await supabase
    .from("lead_instant_design_images")
    .select("image_id, job_id")
    .eq("org_id", membership.org_id)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })

  if (error) return { success: false, error: error.message }

  const images: LeadInstantDesignImageRow[] = (rows || []).map((r) => ({
    image_id: (r as { image_id: number }).image_id,
    job_id: (r as { job_id: number | null }).job_id ?? null,
  }))
  return { success: true, images }
}

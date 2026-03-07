"use server"

import { createClient } from "@/lib/supabase/server"
import { listInstantDesignLeads, type HoverInstantDesignLead } from "@/app/actions/hover"
import { HOVER_LEAD_SOURCE } from "@/lib/types/leads"
import type { Lead, LeadInput } from "@/lib/types/leads"

async function getOrgId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: membership, error: membershipError } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id)
    .single()
  if (membershipError) {
    console.error("[leads] getOrgId membership query failed:", membershipError)
    return null
  }
  return membership?.org_id ?? null
}

function hoverToRow(orgId: string, h: HoverInstantDesignLead) {
  return {
    org_id: orgId,
    hover_lead_id: h.id,
    source: HOVER_LEAD_SOURCE,
    full_name: h.full_name ?? null,
    email: h.email ?? null,
    phone_number: h.phone_number ?? null,
    location_line_1: h.location_line_1 ?? null,
    location_city: h.location_city ?? null,
    location_region: h.location_region ?? null,
    location_postal_code: h.location_postal_code ?? null,
    phone_marketing_opt_in: h.phone_marketing_opt_in ?? null,
    phone_marketing_opt_in_at: h.phone_marketing_opt_in_at ?? null,
    updated_at: new Date().toISOString(),
  }
}

/** Sync Hover Instant Design leads into the leads table, then return all leads for the org. */
export async function listLeads(): Promise<{
  success: boolean
  leads?: Lead[]
  error?: string
}> {
  const orgId = await getOrgId()
  if (!orgId) return { success: false, error: "Not authenticated" }

  const hoverResult = await listInstantDesignLeads()
  if (hoverResult.success && hoverResult.leads?.length) {
    const supabase = await createClient()
    for (const h of hoverResult.leads) {
      const row = hoverToRow(orgId, h)
      const { data: existing, error: selectError } = await supabase
        .from("leads")
        .select("id, created_at")
        .eq("org_id", orgId)
        .eq("hover_lead_id", h.id)
        .maybeSingle()
      if (selectError) {
        console.error("[leads] sync select existing lead failed:", selectError)
        return { success: false, error: selectError.message }
      }
      if (existing) {
        const { error: updateError } = await supabase.from("leads").update(row).eq("id", existing.id)
        if (updateError) {
          console.error("[leads] sync update lead failed:", updateError)
          return { success: false, error: updateError.message }
        }
      } else {
        const { error: insertError } = await supabase.from("leads").insert({
          ...row,
          created_at: h.created_at || new Date().toISOString(),
        })
        if (insertError) {
          console.error("[leads] sync insert lead failed:", insertError)
          return { success: false, error: insertError.message }
        }
      }
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (error) return { success: false, error: error.message }
  const leads: Lead[] = (data || []).map((row) => ({
    id: row.id,
    org_id: row.org_id,
    hover_lead_id: row.hover_lead_id ?? null,
    source: row.source ?? "",
    full_name: row.full_name ?? null,
    email: row.email ?? null,
    phone_number: row.phone_number ?? null,
    location_line_1: row.location_line_1 ?? null,
    location_city: row.location_city ?? null,
    location_region: row.location_region ?? null,
    location_postal_code: row.location_postal_code ?? null,
    phone_marketing_opt_in: row.phone_marketing_opt_in ?? null,
    phone_marketing_opt_in_at: row.phone_marketing_opt_in_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
  return { success: true, leads }
}

export async function getLead(id: string): Promise<{
  success: boolean
  lead?: Lead
  error?: string
}> {
  const orgId = await getOrgId()
  if (!orgId) return { success: false, error: "Not authenticated" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single()

  if (error || !data) return { success: false, error: error?.message ?? "Lead not found" }
  return {
    success: true,
    lead: {
      id: data.id,
      org_id: data.org_id,
      hover_lead_id: data.hover_lead_id ?? null,
      source: data.source ?? "",
      full_name: data.full_name ?? null,
      email: data.email ?? null,
      phone_number: data.phone_number ?? null,
      location_line_1: data.location_line_1 ?? null,
      location_city: data.location_city ?? null,
      location_region: data.location_region ?? null,
      location_postal_code: data.location_postal_code ?? null,
      phone_marketing_opt_in: data.phone_marketing_opt_in ?? null,
      phone_marketing_opt_in_at: data.phone_marketing_opt_in_at ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  }
}

export async function createLead(input: LeadInput): Promise<{
  success: boolean
  lead?: Lead
  error?: string
}> {
  const orgId = await getOrgId()
  if (!orgId) return { success: false, error: "Not authenticated" }

  const supabase = await createClient()
  const row = {
    org_id: orgId,
    hover_lead_id: null,
    source: input.source ?? "",
    full_name: input.full_name ?? null,
    email: input.email ?? null,
    phone_number: input.phone_number ?? null,
    location_line_1: input.location_line_1 ?? null,
    location_city: input.location_city ?? null,
    location_region: input.location_region ?? null,
    location_postal_code: input.location_postal_code ?? null,
    phone_marketing_opt_in: input.phone_marketing_opt_in ?? null,
    phone_marketing_opt_in_at: input.phone_marketing_opt_in_at ?? null,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from("leads").insert(row).select().single()

  if (error) return { success: false, error: error.message }
  return {
    success: true,
    lead: {
      id: data.id,
      org_id: data.org_id,
      hover_lead_id: data.hover_lead_id ?? null,
      source: data.source ?? "",
      full_name: data.full_name ?? null,
      email: data.email ?? null,
      phone_number: data.phone_number ?? null,
      location_line_1: data.location_line_1 ?? null,
      location_city: data.location_city ?? null,
      location_region: data.location_region ?? null,
      location_postal_code: data.location_postal_code ?? null,
      phone_marketing_opt_in: data.phone_marketing_opt_in ?? null,
      phone_marketing_opt_in_at: data.phone_marketing_opt_in_at ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  }
}

export async function updateLead(id: string, input: LeadInput): Promise<{ success: boolean; error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { success: false, error: "Not authenticated" }

  const supabase = await createClient()
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.full_name !== undefined) updates.full_name = input.full_name
  if (input.email !== undefined) updates.email = input.email
  if (input.phone_number !== undefined) updates.phone_number = input.phone_number
  if (input.location_line_1 !== undefined) updates.location_line_1 = input.location_line_1
  if (input.location_city !== undefined) updates.location_city = input.location_city
  if (input.location_region !== undefined) updates.location_region = input.location_region
  if (input.location_postal_code !== undefined) updates.location_postal_code = input.location_postal_code
  if (input.source !== undefined) updates.source = input.source
  if (input.phone_marketing_opt_in !== undefined) updates.phone_marketing_opt_in = input.phone_marketing_opt_in
  if (input.phone_marketing_opt_in_at !== undefined) updates.phone_marketing_opt_in_at = input.phone_marketing_opt_in_at

  const { error } = await supabase.from("leads").update(updates).eq("id", id).eq("org_id", orgId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

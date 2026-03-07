"use server"

import { createClient } from "@/lib/supabase/server"

export interface CustomMarketingLead {
  id: string
  org_id: string
  full_name: string | null
  email: string | null
  phone_number: string | null
  location_line_1: string | null
  location_city: string | null
  location_region: string | null
  location_postal_code: string | null
  source: string | null
  created_at: string
  updated_at: string
}

export interface CustomLeadInput {
  full_name?: string | null
  email?: string | null
  phone_number?: string | null
  location_line_1?: string | null
  location_city?: string | null
  location_region?: string | null
  location_postal_code?: string | null
  source?: string | null
}

async function getOrgId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: membership } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id)
    .single()
  return membership?.org_id ?? null
}

export async function listCustomLeads(): Promise<{
  success: boolean
  leads?: CustomMarketingLead[]
  error?: string
}> {
  const orgId = await getOrgId()
  if (!orgId) return { success: false, error: "Not authenticated" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("custom_marketing_leads")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (error) return { success: false, error: error.message }
  const leads = (data || []).map((row) => ({
    id: row.id,
    org_id: row.org_id,
    full_name: row.full_name ?? null,
    email: row.email ?? null,
    phone_number: row.phone_number ?? null,
    location_line_1: row.location_line_1 ?? null,
    location_city: row.location_city ?? null,
    location_region: row.location_region ?? null,
    location_postal_code: row.location_postal_code ?? null,
    source: row.source ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
  return { success: true, leads }
}

export async function getCustomLead(id: string): Promise<{
  success: boolean
  lead?: CustomMarketingLead
  error?: string
}> {
  const orgId = await getOrgId()
  if (!orgId) return { success: false, error: "Not authenticated" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("custom_marketing_leads")
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
      full_name: data.full_name ?? null,
      email: data.email ?? null,
      phone_number: data.phone_number ?? null,
      location_line_1: data.location_line_1 ?? null,
      location_city: data.location_city ?? null,
      location_region: data.location_region ?? null,
      location_postal_code: data.location_postal_code ?? null,
      source: data.source ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  }
}

export async function createCustomLead(input: CustomLeadInput): Promise<{
  success: boolean
  lead?: CustomMarketingLead
  error?: string
}> {
  const orgId = await getOrgId()
  if (!orgId) return { success: false, error: "Not authenticated" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("custom_marketing_leads")
    .insert({
      org_id: orgId,
      full_name: input.full_name ?? null,
      email: input.email ?? null,
      phone_number: input.phone_number ?? null,
      location_line_1: input.location_line_1 ?? null,
      location_city: input.location_city ?? null,
      location_region: input.location_region ?? null,
      location_postal_code: input.location_postal_code ?? null,
      source: input.source ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return {
    success: true,
    lead: {
      id: data.id,
      org_id: data.org_id,
      full_name: data.full_name ?? null,
      email: data.email ?? null,
      phone_number: data.phone_number ?? null,
      location_line_1: data.location_line_1 ?? null,
      location_city: data.location_city ?? null,
      location_region: data.location_region ?? null,
      location_postal_code: data.location_postal_code ?? null,
      source: data.source ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  }
}

export async function updateCustomLead(id: string, input: CustomLeadInput): Promise<{
  success: boolean
  error?: string
}> {
  const orgId = await getOrgId()
  if (!orgId) return { success: false, error: "Not authenticated" }

  const supabase = await createClient()
  const { error } = await supabase
    .from("custom_marketing_leads")
    .update({
      ...(input.full_name !== undefined && { full_name: input.full_name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone_number !== undefined && { phone_number: input.phone_number }),
      ...(input.location_line_1 !== undefined && { location_line_1: input.location_line_1 }),
      ...(input.location_city !== undefined && { location_city: input.location_city }),
      ...(input.location_region !== undefined && { location_region: input.location_region }),
      ...(input.location_postal_code !== undefined && { location_postal_code: input.location_postal_code }),
      ...(input.source !== undefined && { source: input.source }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", orgId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

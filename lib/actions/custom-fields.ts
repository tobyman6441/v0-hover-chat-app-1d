"use server"

import { createClient } from "@/lib/supabase/server"

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldType =
  | "text"
  | "paragraph"
  | "number"
  | "boolean"
  | "select"
  | "multi_select"
  | "date"
  | "url"
  | "email"
  | "phone"

export type AppliesTo = "jobs" | "leads" | "both"

export interface FieldOption {
  label: string
  value: string
}

export interface CustomField {
  id: string
  org_id: string
  name: string
  field_key: string
  field_type: FieldType
  applies_to: AppliesTo
  options: FieldOption[] | null
  sort_order: number
  is_required: boolean
  created_at: string
  updated_at: string
}

export interface CustomFieldValue {
  id: string
  field_id: string
  entity_type: "job" | "lead"
  entity_id: string
  value: unknown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrgId(): Promise<{ orgId: string; error?: never } | { orgId?: never; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: member, error } = await supabase
    .from("members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single()

  if (error || !member) return { error: "Org not found" }
  return { orgId: member.org_id }
}

async function getAdminOrgId(): Promise<{ orgId: string; error?: never } | { orgId?: never; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: member, error } = await supabase
    .from("members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single()

  if (error || !member) return { error: "Org not found" }
  if (member.role !== "admin") return { error: "Admin access required" }
  return { orgId: member.org_id }
}

// ─── Field Definition CRUD ────────────────────────────────────────────────────

export async function getCustomFields(
  appliesTo?: AppliesTo
): Promise<{ fields: CustomField[]; error?: string }> {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getOrgId()
  if (orgError) return { fields: [], error: orgError }

  let query = supabase
    .from("custom_fields")
    .select("*")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true })

  if (appliesTo && appliesTo !== "both") {
    // Return fields that apply to this entity type OR both
    query = query.in("applies_to", [appliesTo, "both"])
  }

  const { data, error } = await query
  if (error) return { fields: [], error: error.message }
  return { fields: (data ?? []) as CustomField[] }
}

export async function createCustomField(input: {
  name: string
  field_type: FieldType
  applies_to: AppliesTo
  options?: FieldOption[]
  is_required?: boolean
}): Promise<{ field?: CustomField; error?: string }> {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getAdminOrgId()
  if (orgError) return { error: orgError }

  // Generate a unique key from the name
  const baseKey = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50) || "field"

  // Find the current max sort_order
  const { data: existing } = await supabase
    .from("custom_fields")
    .select("sort_order, field_key")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: false })
    .limit(1)

  const maxOrder = existing?.[0]?.sort_order ?? -1

  // Ensure key uniqueness by appending a suffix if needed
  const existingKeys = await supabase
    .from("custom_fields")
    .select("field_key")
    .eq("org_id", orgId)
  const takenKeys = new Set((existingKeys.data ?? []).map((r: { field_key: string }) => r.field_key))
  let fieldKey = baseKey
  let suffix = 1
  while (takenKeys.has(fieldKey)) {
    fieldKey = `${baseKey}_${suffix++}`
  }

  const { data, error } = await supabase
    .from("custom_fields")
    .insert({
      org_id: orgId,
      name: input.name.trim(),
      field_key: fieldKey,
      field_type: input.field_type,
      applies_to: input.applies_to,
      options: input.options && input.options.length > 0 ? input.options : null,
      sort_order: maxOrder + 1,
      is_required: input.is_required ?? false,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { field: data as CustomField }
}

export async function updateCustomField(
  id: string,
  input: {
    name?: string
    applies_to?: AppliesTo
    options?: FieldOption[]
    is_required?: boolean
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getAdminOrgId()
  if (orgError) return { error: orgError }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.applies_to !== undefined) updates.applies_to = input.applies_to
  if (input.options !== undefined) updates.options = input.options.length > 0 ? input.options : null
  if (input.is_required !== undefined) updates.is_required = input.is_required

  const { error } = await supabase
    .from("custom_fields")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)

  if (error) return { error: error.message }
  return {}
}

export async function deleteCustomField(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getAdminOrgId()
  if (orgError) return { error: orgError }

  const { error } = await supabase
    .from("custom_fields")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)

  if (error) return { error: error.message }
  return {}
}

export async function reorderCustomFields(orderedIds: string[]): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getAdminOrgId()
  if (orgError) return { error: orgError }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("custom_fields")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("org_id", orgId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) return { error: failed.error.message }
  return {}
}

// ─── Field Values ─────────────────────────────────────────────────────────────

/** Returns a map of field_id → value for the given entity */
export async function getCustomFieldValues(
  entityType: "job" | "lead",
  entityId: string
): Promise<{ values: Record<string, unknown>; error?: string }> {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getOrgId()
  if (orgError) return { values: {}, error: orgError }

  const { data, error } = await supabase
    .from("custom_field_values")
    .select("field_id, value")
    .eq("org_id", orgId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)

  if (error) return { values: {}, error: error.message }

  const values: Record<string, unknown> = {}
  for (const row of data ?? []) {
    values[row.field_id] = row.value
  }
  return { values }
}

/** Upsert a single field value for an entity */
export async function setCustomFieldValue(
  fieldId: string,
  entityType: "job" | "lead",
  entityId: string,
  value: unknown
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getOrgId()
  if (orgError) return { error: orgError }

  const { error } = await supabase
    .from("custom_field_values")
    .upsert(
      {
        org_id: orgId,
        field_id: fieldId,
        entity_type: entityType,
        entity_id: entityId,
        value: value ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "field_id,entity_type,entity_id" }
    )

  if (error) return { error: error.message }
  return {}
}

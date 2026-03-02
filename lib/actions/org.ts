"use server"

import { createClient } from "@/lib/supabase/server"

// Refresh Hover OAuth token using refresh token
export async function refreshHoverToken(
  orgId: string,
  refreshToken: string,
): Promise<{ accessToken?: string; refreshToken?: string; error?: string }> {
  try {
    const response = await fetch("https://hover.to/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.HOVER_CLIENT_ID || "",
        client_secret: process.env.HOVER_CLIENT_SECRET || "",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Hover token refresh failed:", response.status, errorText)
      return { error: `Token refresh failed: ${response.status}` }
    }

    const data = await response.json()
    
    // Update the token in database
    const supabase = await createClient()
    const { error } = await supabase
      .from("organizations")
      .update({
        hover_access_token: data.access_token,
        hover_refresh_token: data.refresh_token || refreshToken,
        hover_connected_at: new Date().toISOString(),
      })
      .eq("id", orgId)

    if (error) {
      console.error("[v0] Failed to save refreshed token:", error)
      return { error: "Failed to save refreshed token" }
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
    }
  } catch (err) {
    console.error("[v0] Hover token refresh error:", err)
    return { error: err instanceof Error ? err.message : "Token refresh failed" }
  }
}

export async function createOrg(name: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  // Use SECURITY DEFINER function to bypass RLS chicken-and-egg problem
  const { data: org, error } = await supabase.rpc("create_org_with_member", {
    org_name: name,
    creator_user_id: user.id,
  })

  if (error) return { error: error.message }

  return { org }
}

export async function updateOrgLLM(
  orgId: string,
  provider: string,
  apiKey: string,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.rpc("update_org_settings", {
    target_org_id: orgId,
    requesting_user_id: user.id,
    new_llm_provider: provider,
    new_llm_api_key: apiKey,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateOrgHover(
  orgId: string,
  accessToken: string,
  refreshToken: string,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.rpc("update_org_settings", {
    target_org_id: orgId,
    requesting_user_id: user.id,
    new_hover_access_token: accessToken,
    new_hover_refresh_token: refreshToken,
    new_hover_connected_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function completeOnboarding(orgId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.rpc("update_org_settings", {
    target_org_id: orgId,
    requesting_user_id: user.id,
    set_onboarding_complete: true,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function disconnectLLM(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.rpc("disconnect_llm", {
    p_user_id: user.id,
  })

  if (error) return { error: error.message }
  return {}
}

export async function disconnectHover(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.rpc("disconnect_hover", {
    p_user_id: user.id,
  })

  if (error) return { error: error.message }
  return {}
}

export interface EnabledFeatures {
  chat: boolean
  dashboard: boolean
  sales: boolean
  production: boolean
  marketing: boolean
}

export async function updateOrgFeatures(features: EnabledFeatures): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  // Get user's org via membership
  const { data: membership } = await supabase
    .from("members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single()

  if (!membership) return { error: "No organization found" }
  
  // Only admins/owners can update features
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { error: "Only admins can update features" }
  }

  const { error } = await supabase
    .from("organizations")
    .update({ enabled_features: features })
    .eq("id", membership.org_id)

  if (error) return { error: error.message }
  
  // Revalidate all pages to update navigation
  const { revalidatePath } = await import("next/cache")
  revalidatePath("/", "layout")
  
  return { success: true }
}

export async function markSetupCompleted(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  // Get user's org via membership
  const { data: membership } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id)
    .single()

  if (!membership) return { error: "No organization found" }

  const { error } = await supabase
    .from("organizations")
    .update({ setup_completed: true })
    .eq("id", membership.org_id)

  if (error) return { error: error.message }
  return { success: true }
}

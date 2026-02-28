"use server"

import { createClient } from "@/lib/supabase/server"

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("fullName") as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Check if the user already exists (Supabase returns empty identities)
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "An account with this email already exists. Please sign in instead." }
  }

  // If no session, try signing in directly
  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      return { error: "Account created but could not sign in automatically. Please sign in manually." }
    }
  }

  // Get the user ID (from signUp or signIn)
  const userId = data.user?.id
  if (!userId) {
    return { error: "Account created but could not determine user ID." }
  }

  // Check if user already has an org (e.g. from a previous failed attempt)
  const { data: existingOrg } = await supabase.rpc("get_user_org", {
    requesting_user_id: userId,
  })

  if (!existingOrg) {
    // Create org automatically during sign-up
    const orgName = fullName ? `${fullName}'s Workspace` : "My Workspace"
    const { error: orgError } = await supabase.rpc("create_org_with_member", {
      org_name: orgName,
      creator_user_id: userId,
    })

    if (orgError) {
      // Non-fatal: org creation failed but user is signed in
      // They'll get routed to setup which will retry
      console.error("[v0] Failed to create org during sign-up:", orgError.message)
    }
  }

  return { success: true }
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Provide clearer messages for common errors
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "Your email has not been confirmed yet. Please ask your admin to disable email confirmation in Supabase, or check your inbox." }
    }
    return { error: error.message }
  }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return { success: true }
}

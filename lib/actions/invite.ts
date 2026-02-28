"use server"

import { createClient } from "@/lib/supabase/server"

export async function createEmailInvite(orgId: string, email: string, role: "admin" | "member" = "member") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: invite, error } = await supabase
    .from("invitations")
    .insert({ org_id: orgId, email, role, created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message }
  return { invite }
}

export async function createShareableLink(orgId: string, role: "admin" | "member" = "member") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: invite, error } = await supabase
    .from("invitations")
    .insert({ org_id: orgId, role, created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const link = `${appUrl}/invite/${invite.token}`
  return { invite, link }
}

export async function getOrgInvitations(orgId: string) {
  const supabase = await createClient()

  const { data: invitations, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (error) return { error: error.message, invitations: [] }
  return { invitations: invitations ?? [] }
}

export async function getOrgMembers(orgId: string) {
  const supabase = await createClient()

  const { data: members, error } = await supabase
    .from("members")
    .select("*, profiles(full_name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })

  if (error) return { error: error.message, members: [] }
  return { members: members ?? [] }
}

export async function acceptInvite(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // Find the invite
  const { data: invite, error: findError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .single()

  if (findError || !invite) return { error: "Invitation not found or already used" }

  // Check if expired
  if (new Date(invite.expires_at) < new Date()) {
    return { error: "Invitation has expired" }
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .eq("org_id", invite.org_id)
    .single()

  if (existingMember) {
    return { error: "You are already a member of this organization" }
  }

  // Add user as a member
  const { error: memberError } = await supabase
    .from("members")
    .insert({ user_id: user.id, org_id: invite.org_id, role: invite.role })

  if (memberError) return { error: memberError.message }

  // Mark invite as accepted
  await supabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id)

  return { success: true, orgId: invite.org_id }
}

export async function removeMember(memberId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", memberId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateMemberRole(memberId: string, newRole: "admin" | "member") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // Verify the current user is an admin of the same org
  const { data: targetMember } = await supabase
    .from("members")
    .select("org_id")
    .eq("id", memberId)
    .single()

  if (!targetMember) return { error: "Member not found" }

  const { data: currentUserMember } = await supabase
    .from("members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", targetMember.org_id)
    .single()

  if (!currentUserMember || currentUserMember.role !== "admin") {
    return { error: "Only admins can change roles" }
  }

  const { error } = await supabase
    .from("members")
    .update({ role: newRole })
    .eq("id", memberId)

  if (error) return { error: error.message }
  return { success: true }
}

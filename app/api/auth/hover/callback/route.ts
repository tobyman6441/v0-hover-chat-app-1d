import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  if (error || !code) {
    const errorCode = error || "no_code"
    return NextResponse.redirect(`${appUrl}/setup?hover_error=${errorCode}`)
  }

  const clientId = process.env.HOVER_CLIENT_ID
  const clientSecret = process.env.HOVER_CLIENT_SECRET
  const redirectUri = `${appUrl}/api/auth/hover/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${appUrl}/setup?hover_error=missing_credentials`,
    )
  }

  try {
    console.log("[v0] Hover callback - starting token exchange", { redirectUri, hasCode: !!code })
    
    const tokenResponse = await fetch("https://hover.to/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error(
        "[v0] Hover token exchange failed:",
        tokenResponse.status,
        errorBody,
      )
      // Include more specific error info in the redirect for debugging
      const errorMessage = encodeURIComponent(errorBody.substring(0, 100))
      return NextResponse.redirect(
        `${appUrl}/setup?hover_error=token_exchange_failed&details=${errorMessage}`,
      )
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(
        `${appUrl}/setup?hover_error=invalid_token_response`,
      )
    }

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000)

    // Get the current user and save tokens to their org via RPC (bypasses RLS)
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log("[Hover Callback] User lookup:", { userId: user?.id, userError: userError?.message })

    if (!user) {
      console.error("[Hover Callback] No authenticated user found")
      return NextResponse.redirect(
        `${appUrl}/setup?hover_error=not_authenticated`,
      )
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    // Get user's org_id directly from members table (admin client bypasses RLS)
    const { data: membershipData, error: membershipError } = await adminSupabase
      .from("members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .single()

    console.log("[Hover Callback] Membership lookup:", { 
      userId: user.id,
      membershipData,
      membershipError: membershipError?.message 
    })
    
    const membership = membershipData

    if (!membership?.org_id) {
      console.error("[Hover Callback] User has no organization membership")
      return NextResponse.redirect(
        `${appUrl}/setup?hover_error=no_organization`,
      )
    }

    // Use admin client to update the organization (bypasses RLS)
    const { error: updateError } = await adminSupabase
      .from("organizations")
      .update({
        hover_access_token: access_token,
        hover_refresh_token: refresh_token,
        hover_connected_at: new Date().toISOString(),
        hover_token_expires_at: expiresAt.toISOString(),
      })
      .eq("id", membership.org_id)

    if (updateError) {
      console.error("Failed to save Hover tokens:", updateError)
      return NextResponse.redirect(
        `${appUrl}/setup?hover_error=save_failed`,
      )
    }

    console.log("[Hover Callback] Success - tokens saved for org:", membership.org_id)
    return NextResponse.redirect(`${appUrl}/setup?hover_connected=true`)
  } catch (err) {
    console.error("Hover OAuth callback error:", err)
    return NextResponse.redirect(`${appUrl}/setup?hover_error=unexpected_error`)
  }
}

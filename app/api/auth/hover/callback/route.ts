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
        "Hover token exchange failed:",
        tokenResponse.status,
        errorBody,
      )
      return NextResponse.redirect(
        `${appUrl}/setup?hover_error=token_exchange_failed`,
      )
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(
        `${appUrl}/setup?hover_error=invalid_token_response`,
      )
    }

    // Calculate expiry time (default to 2 hours if not provided)
    const expiresInSeconds = expires_in || 7200
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    // Get the current user and save tokens to their org
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Get user's org_id first
      const { data: membership } = await adminSupabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .single()

      if (membership?.org_id) {
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
      } else {
        console.error("User has no organization membership")
        return NextResponse.redirect(
          `${appUrl}/setup?hover_error=no_organization`,
        )
      }
    }

    return NextResponse.redirect(`${appUrl}/setup?hover_connected=true`)
  } catch (err) {
    console.error("Hover OAuth callback error:", err)
    return NextResponse.redirect(
      `${appUrl}/setup?hover_error=unexpected_error`,
    )
  }
}

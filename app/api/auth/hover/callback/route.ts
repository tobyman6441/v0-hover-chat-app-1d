import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    const { access_token, refresh_token } = tokenData

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(
        `${appUrl}/setup?hover_error=invalid_token_response`,
      )
    }

    // Get the current user and save tokens to their org via RPC (bypasses RLS)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { error: rpcError } = await supabase.rpc("save_hover_tokens", {
        p_user_id: user.id,
        p_access_token: access_token,
        p_refresh_token: refresh_token,
      })

      if (rpcError) {
        console.error("Failed to save Hover tokens:", rpcError)
        return NextResponse.redirect(
          `${appUrl}/setup?hover_error=save_failed`,
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

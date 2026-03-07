import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const clientId = process.env.HOVER_CLIENT_ID

  // Derive the app URL from the incoming request if NEXT_PUBLIC_APP_URL is not set
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const redirectUri = `${appUrl}/api/auth/hover/callback`

  if (!clientId) {
    return NextResponse.json(
      { error: "Hover Client ID is not configured" },
      { status: 500 }
    )
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read",
  })

  const authorizeUrl = `https://hover.to/oauth/authorize?${params.toString()}`

  return NextResponse.redirect(authorizeUrl)
}

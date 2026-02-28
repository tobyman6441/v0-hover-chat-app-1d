import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const { orgId, refreshToken } = await req.json()

    if (!orgId || !refreshToken) {
      return Response.json(
        { error: "Missing orgId or refreshToken" },
        { status: 400 }
      )
    }

    // Refresh the token with Hover
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
      return Response.json(
        { error: `Token refresh failed: ${response.status}` },
        { status: 400 }
      )
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
      return Response.json(
        { error: "Failed to save refreshed token" },
        { status: 500 }
      )
    }

    return Response.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
    })
  } catch (err) {
    console.error("[v0] Hover token refresh error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "Token refresh failed" },
      { status: 500 }
    )
  }
}

/**
 * Register webhook with Hover for the current org.
 * POST https://hover.to/api/v2/webhooks — see https://developers.hover.to/reference/register-webhook
 * Setup guide: docs/WEBHOOK_SETUP.md
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"

/**
 * POST: Register the webhook with Hover (url = app origin + /api/hover/webhook).
 * Requires auth and Hover connected. Hover then POSTs webhook-verification-code to our URL;
 * app/api/hover/webhook/route.ts handles verification (PUT .../webhooks/{code}/verify).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: configData } = await supabase.rpc("get_org_llm_config", {
    p_user_id: user.id,
  })
  const config = Array.isArray(configData) ? configData[0] : configData
  let accessToken = config?.hover_access_token as string | undefined
  const orgId = config?.org_id as string | undefined
  const refreshToken = config?.hover_refresh_token as string | undefined
  if (!accessToken || !orgId) {
    return NextResponse.json(
      { error: "Hover not connected. Connect Hover in Settings first." },
      { status: 403 }
    )
  }

  // Refresh Hover token if stale (same logic as getHoverToken) so Register Webhook gets a valid token
  const connectedAt = config?.hover_connected_at ? new Date(config.hover_connected_at as string) : null
  const tokenAgeHours = connectedAt ? (Date.now() - connectedAt.getTime()) / (1000 * 60 * 60) : 999
  if (tokenAgeHours > 1.5 && refreshToken) {
    const refreshRes = await fetch("https://hover.to/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.HOVER_CLIENT_ID ?? "",
        client_secret: process.env.HOVER_CLIENT_SECRET ?? "",
      }),
    })
    if (refreshRes.ok) {
      const tokenData = await refreshRes.json()
      if (tokenData.access_token) {
        const admin = createAdminClient()
        await admin.from("organizations").update({
          hover_access_token: tokenData.access_token,
          hover_refresh_token: tokenData.refresh_token ?? refreshToken,
          hover_connected_at: new Date().toISOString(),
        }).eq("id", orgId)
        accessToken = tokenData.access_token
      }
    }
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    request.nextUrl.origin
  const webhookUrl = `${base.replace(/\/$/, "")}/api/hover/webhook`

  const res = await fetch("https://hover.to/api/v2/webhooks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhook: {
        url: webhookUrl,
        "content-type": "json",
      },
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const status = res.status
    const msg = data.error ?? data.message ?? `Hover API: ${status}`
    const hint =
      status === 401
        ? " Token may be expired or invalid. Try disconnecting and reconnecting Hover in Settings, then run this again."
        : ""
    return NextResponse.json(
      { error: msg + hint, details: data },
      { status: status >= 500 ? 502 : 400 }
    )
  }

  const webhookId = data.id ?? data.webhook_id ?? data.webhook?.id
  if (webhookId != null) {
    const admin = createAdminClient()
    await admin.from("hover_webhook_org").upsert(
      { webhook_id: Number(webhookId), org_id: orgId },
      { onConflict: "webhook_id" }
    )
  }

  return NextResponse.json({
    success: true,
    webhookUrl,
    webhookId: webhookId ?? null,
    message:
      "Webhook registered. Hover will send a verification request to your URL; our handler will verify it automatically.",
  })
}

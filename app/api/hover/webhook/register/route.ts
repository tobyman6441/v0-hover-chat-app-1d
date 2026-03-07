import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"

/**
 * POST: Register the instant-design webhook with Hover for the current org.
 * Requires auth and Hover to be connected. Uses request origin or NEXT_PUBLIC_APP_URL for webhook URL.
 * After this, Hover will send a verification POST to /api/hover/webhook; our handler verifies automatically.
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
  const accessToken = config?.hover_access_token as string | undefined
  const orgId = config?.org_id as string | undefined
  if (!accessToken || !orgId) {
    return NextResponse.json(
      { error: "Hover not connected. Connect Hover in Settings first." },
      { status: 403 }
    )
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
    return NextResponse.json(
      { error: data.error ?? data.message ?? `Hover API: ${res.status}`, details: data },
      { status: res.status >= 500 ? 502 : 400 }
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

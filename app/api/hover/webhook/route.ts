/**
 * Hover webhook receiver. Handles:
 * - webhook-verification-code: calls PUT https://hover.to/api/v2/webhooks/{code}/verify
 * - instant-design-image-created: stores lead_id, image_id, job_id in lead_instant_design_images
 *
 * Docs: https://developers.hover.to/reference/webhooks
 * Events: https://developers.hover.to/docs/hovers-available-webhooks
 * Setup: docs/WEBHOOK_SETUP.md
 */
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

/** Hover webhook payload (common fields) */
interface HoverWebhookPayload {
  event: string
  webhook_id?: number
  code?: string
  lead_id?: number
  image_id?: number
  job_id?: number
  project_id?: number
  project_name?: string
  timestamp?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HoverWebhookPayload

    if (body.event === "webhook-verification-code") {
      const code = body.code
      const webhookId = body.webhook_id
      if (!code || typeof code !== "string") {
        return NextResponse.json(
          { error: "Missing verification code" },
          { status: 400 }
        )
      }
      const supabase = createAdminClient()
      let orgId: string | null = null
      if (webhookId != null) {
        const { data: mapping } = await supabase
          .from("hover_webhook_org")
          .select("org_id")
          .eq("webhook_id", webhookId)
          .maybeSingle()
        orgId = mapping?.org_id ?? null
      }
      if (!orgId) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id")
          .not("hover_access_token", "is", null)
          .limit(1)
        orgId = orgs?.[0]?.id ?? null
      }
      if (!orgId) {
        console.error("[Hover webhook] Verify: no org found for webhook_id", webhookId)
        return NextResponse.json(
          { error: "Could not determine organization for verification" },
          { status: 503 }
        )
      }
      const { data: org } = await supabase
        .from("organizations")
        .select("hover_access_token")
        .eq("id", orgId)
        .single()
      const token = org?.hover_access_token as string | null
      if (!token) {
        return NextResponse.json(
          { error: "Organization has no Hover token" },
          { status: 503 }
        )
      }
      const verifyRes = await fetch(
        `https://hover.to/api/v2/webhooks/${encodeURIComponent(code)}/verify`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      if (!verifyRes.ok) {
        const errText = await verifyRes.text()
        console.error("[Hover webhook] Verify request failed:", verifyRes.status, errText)
        return NextResponse.json(
          { error: "Webhook verification failed" },
          { status: 502 }
        )
      }
      if (webhookId != null) {
        await supabase.from("hover_webhook_org").upsert(
          { org_id: orgId, webhook_id: webhookId },
          { onConflict: "webhook_id" }
        )
      }
      return NextResponse.json({ verified: true })
    }

    if (body.event === "instant-design-image-created") {
      const webhookId = body.webhook_id
      const leadId = body.lead_id
      const imageId = body.image_id
      const jobId = body.job_id ?? null

      if (leadId == null || imageId == null) {
        return NextResponse.json(
          { error: "Missing lead_id or image_id in webhook payload" },
          { status: 400 }
        )
      }

      const supabase = createAdminClient()

      let orgId: string | null = null
      if (webhookId != null) {
        const { data: mapping, error: mappingError } = await supabase
          .from("hover_webhook_org")
          .select("org_id")
          .eq("webhook_id", webhookId)
          .maybeSingle()
        if (mappingError) {
          console.error("[Hover webhook] hover_webhook_org lookup failed:", mappingError)
          return NextResponse.json(
            { error: "Webhook organization lookup failed" },
            { status: 500 }
          )
        }
        orgId = mapping?.org_id ?? null
      }
      // Fallback: single-tenant — use the first org that has Hover connected
      if (!orgId) {
        const { data: orgs, error: orgsError } = await supabase
          .from("organizations")
          .select("id")
          .not("hover_access_token", "is", null)
          .limit(1)
        if (orgsError) {
          console.error("[Hover webhook] organizations fallback lookup failed:", orgsError)
          return NextResponse.json(
            { error: "Webhook organization lookup failed" },
            { status: 500 }
          )
        }
        orgId = orgs?.[0]?.id ?? null
      }

      if (!orgId) {
        console.error("[Hover webhook] Could not determine organization: no webhook mapping and no Hover-connected org")
        return NextResponse.json(
          { error: "Could not determine organization for webhook" },
          { status: 503 }
        )
      }

      {
        const { error: upsertError } = await supabase.from("lead_instant_design_images").upsert(
          {
            org_id: orgId,
            lead_id: leadId,
            image_id: imageId,
            job_id: jobId,
          },
          { onConflict: "org_id,lead_id,image_id" }
        )
        if (upsertError) {
          console.error("[Hover webhook] lead_instant_design_images upsert failed:", upsertError)
          return NextResponse.json(
            { error: "Failed to store instant design image" },
            { status: 500 }
          )
        }

        // Optional: log webhook event for debugging
        try {
          await supabase.from("webhook_events").insert({
            org_id: orgId,
            event_type: body.event,
            payload: body as unknown as Record<string, unknown>,
          })
        } catch {
          // ignore log failure
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Hover webhook] Error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

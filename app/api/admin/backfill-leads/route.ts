import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { listInstantDesignLeadsWithToken, refreshHoverToken } from "@/lib/hover-api"
import { HOVER_LEAD_SOURCE } from "@/lib/types/leads"
import type { HoverInstantDesignLeadRow } from "@/lib/hover-api"

function hoverToRow(orgId: string, h: HoverInstantDesignLeadRow) {
  return {
    org_id: orgId,
    hover_lead_id: h.id,
    source: HOVER_LEAD_SOURCE,
    full_name: h.full_name ?? null,
    email: h.email ?? null,
    phone_number: h.phone_number ?? null,
    location_line_1: h.location_line_1 ?? null,
    location_city: h.location_city ?? null,
    location_region: h.location_region ?? null,
    location_postal_code: h.location_postal_code ?? null,
    phone_marketing_opt_in: h.phone_marketing_opt_in ?? null,
    phone_marketing_opt_in_at: h.phone_marketing_opt_in_at ?? null,
    updated_at: new Date().toISOString(),
  }
}

export async function POST(request: Request) {
  const secret = process.env.BACKFILL_LEADS_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Backfill is not configured. Set BACKFILL_LEADS_SECRET to enable this endpoint." },
      { status: 503 }
    )
  }
  const authHeader = request.headers.get("authorization")
  const bearer = authHeader ?? ""
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : ""
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local to run the backfill." },
      { status: 503 }
    )
  }

  const supabase = createAdminClient()

  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, hover_access_token, hover_refresh_token, hover_connected_at")
    .not("hover_access_token", "is", null)

  if (orgsError) {
    return NextResponse.json(
      { success: false, error: orgsError.message, synced: [] },
      { status: 500 }
    )
  }

  if (!orgs?.length) {
    return NextResponse.json({
      success: true,
      message: "No Hover-connected orgs found",
      synced: [],
    })
  }

  const synced: { org_id: string; leads_count: number; error?: string }[] = []

  for (const org of orgs) {
    const orgId = org.id as string
    let accessToken = org.hover_access_token as string
    const refreshToken = org.hover_refresh_token as string | null
    const connectedAt = org.hover_connected_at ? new Date(org.hover_connected_at as string) : null
    const tokenAgeHours = connectedAt ? (Date.now() - connectedAt.getTime()) / (1000 * 60 * 60) : 999
    const needsRefresh = tokenAgeHours > 1.5 && refreshToken

    if (needsRefresh && refreshToken) {
      const refresh = await refreshHoverToken(refreshToken)
      if (refresh.success && refresh.accessToken) {
        accessToken = refresh.accessToken
        const { error: updateTokenError } = await supabase
          .from("organizations")
          .update({
            hover_access_token: refresh.accessToken,
            hover_refresh_token: refresh.refreshToken ?? refreshToken,
            hover_connected_at: new Date().toISOString(),
          })
          .eq("id", orgId)
        if (updateTokenError) {
          console.error("[backfill-leads] org token update failed:", updateTokenError)
          synced.push({ org_id: orgId, leads_count: 0, error: updateTokenError.message })
          continue
        }
      }
    }

    const result = await listInstantDesignLeadsWithToken(accessToken)
    if (!result.success) {
      synced.push({ org_id: orgId, leads_count: 0, error: result.error })
      continue
    }

    const leads = result.leads ?? []
    let upserted = 0

    for (const h of leads) {
      const row = hoverToRow(orgId, h)
      const { data: existing, error: selectError } = await supabase
        .from("leads")
        .select("id, created_at")
        .eq("org_id", orgId)
        .eq("hover_lead_id", h.id)
        .maybeSingle()

      if (selectError) {
        console.error("[backfill-leads] select existing lead failed:", selectError)
        synced.push({ org_id: orgId, leads_count: upserted, error: selectError.message })
        break
      }
      if (existing) {
        const { error: updateError } = await supabase.from("leads").update(row).eq("id", existing.id)
        if (updateError) {
          console.error("[backfill-leads] update lead failed:", updateError)
          synced.push({ org_id: orgId, leads_count: upserted, error: updateError.message })
          break
        }
      } else {
        const { error: insertError } = await supabase.from("leads").insert({
          ...row,
          created_at: h.created_at || new Date().toISOString(),
        })
        if (insertError) {
          console.error("[backfill-leads] insert lead failed:", insertError)
          synced.push({ org_id: orgId, leads_count: upserted, error: insertError.message })
          break
        }
      }
      upserted++
    }

    if (!synced.some((s) => s.org_id === orgId)) {
      synced.push({ org_id: orgId, leads_count: upserted })
    }
  }

  return NextResponse.json({
    success: true,
    message: `Backfilled leads for ${synced.length} org(s)`,
    synced,
  })
}

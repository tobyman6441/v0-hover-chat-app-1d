import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listInstantDesignImageIdsByLeadId } from "@/lib/hover-api"

/** GET ?debug=1 - Returns raw List + Show API responses for diagnosing saved designs. Auth required. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id)
    .single()
  const orgId = membership?.org_id
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 403 })
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, hover_lead_id")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }
  const hoverLeadId = lead.hover_lead_id as number | null
  if (hoverLeadId == null) {
    return NextResponse.json(
      { error: "Lead has no Hover lead ID", debug: { leadId, orgId } },
      { status: 400 }
    )
  }

  const { data: configData } = await supabase.rpc("get_org_llm_config", {
    p_user_id: user.id,
  })
  const config = Array.isArray(configData) ? configData[0] : configData
  const accessToken = config?.hover_access_token
  if (!accessToken) {
    return NextResponse.json({ error: "Hover not connected" }, { status: 403 })
  }

  const listUrl = `https://hover.to/api/v1/instant_design/images?lead_id=${hoverLeadId}`
  let listStatus: number
  let listOk: boolean
  let listBody: unknown
  try {
    const listRes = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
    listStatus = listRes.status
    listOk = listRes.ok
    const contentType = listRes.headers.get("content-type") ?? ""
    listBody = contentType.includes("application/json")
      ? await listRes.json()
      : { _raw: (await listRes.text()).slice(0, 500) }
  } catch (e) {
    listStatus = 0
    listOk = false
    listBody = { _error: String(e) }
  }

  const listResult = await listInstantDesignImageIdsByLeadId(accessToken, hoverLeadId)
  const refs = listResult.imageRefs ?? []

  const showResults: { imageId: number; jobId?: number; status: number; ok: boolean; bodySnippet: string }[] = []
  for (const { imageId, jobId } of refs.slice(0, 5)) {
    const showUrl = new URL(`https://hover.to/api/v1/instant_design/images/${imageId}`)
    if (jobId != null) showUrl.searchParams.set("job_id", String(jobId))
    try {
      const showRes = await fetch(String(showUrl), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      const contentType = showRes.headers.get("content-type") ?? ""
      let bodySnippet: string
      if (contentType.includes("application/json")) {
        const data = await showRes.json()
        bodySnippet = JSON.stringify(data).slice(0, 600)
      } else {
        bodySnippet = (await showRes.text()).slice(0, 400)
      }
      showResults.push({
        imageId,
        jobId,
        status: showRes.status,
        ok: showRes.ok,
        bodySnippet,
      })
    } catch (e) {
      showResults.push({
        imageId,
        jobId,
        status: 0,
        ok: false,
        bodySnippet: String(e),
      })
    }
  }

  return NextResponse.json({
    hoverLeadId,
    list: {
      url: listUrl,
      status: listStatus,
      ok: listOk,
      body: listBody,
      parsedRefsCount: refs.length,
    },
    showResults,
    note: refs.length > 5 ? `Only first 5 Show calls shown; ${refs.length} total refs.` : undefined,
  })
}

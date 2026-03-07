/**
 * Token-based Hover API helpers (no auth context). Used by server actions and backfill.
 */

export interface HoverInstantDesignLeadRow {
  id: number
  email: string | null
  phone_number: string | null
  full_name: string | null
  location_postal_code: string | null
  location_line_1: string | null
  location_city: string | null
  location_region: string | null
  created_at: string
  phone_marketing_opt_in?: boolean
  phone_marketing_opt_in_at?: string | null
}

export async function listInstantDesignLeadsWithToken(accessToken: string): Promise<{
  success: boolean
  leads?: HoverInstantDesignLeadRow[]
  error?: string
}> {
  try {
    const allLeads: HoverInstantDesignLeadRow[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await fetch(
        `https://hover.to/api/v1/instant_design/leads?page=${page}&per=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
      if (!response.ok) {
        return { success: false, error: `Failed to list instant design leads: HTTP ${response.status}` }
      }
      const data = await response.json()
      const leads = data.leads || []
      const meta = data.meta || {}
      const pagination = meta.pagination || {}
      for (const row of leads) {
        allLeads.push({
          id: row.id,
          email: row.email ?? null,
          phone_number: row.phone_number ?? null,
          full_name: row.full_name ?? null,
          location_postal_code: row.location_postal_code ?? null,
          location_line_1: row.location_line_1 ?? null,
          location_city: row.location_city ?? null,
          location_region: row.location_region ?? null,
          created_at: row.created_at ?? "",
          phone_marketing_opt_in: row.phone_marketing_opt_in,
          phone_marketing_opt_in_at: row.phone_marketing_opt_in_at ?? null,
        })
      }
      hasMore = pagination.next_page != null && page < (pagination.total_pages || 1)
      page++
      if (page > 50) break
    }
    return { success: true, leads: allLeads }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/** One image reference from List Instant Design Images (by lead_id or job_id). */
export interface InstantDesignImageRef {
  imageId: number
  jobId?: number
}

/** List Instant Design images for a lead. GET /api/v1/instant_design/images?lead_id= */
export async function listInstantDesignImageIdsByLeadId(
  accessToken: string,
  leadId: number
): Promise<{ success: boolean; imageIds?: number[]; imageRefs?: InstantDesignImageRef[]; error?: string }> {
  try {
    const numericLeadId = Number(leadId)
    if (!Number.isInteger(numericLeadId) || numericLeadId <= 0) {
      return { success: false, error: "Invalid lead_id" }
    }
    const response = await fetch(
      `https://hover.to/api/v1/instant_design/images?lead_id=${numericLeadId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    )
    if (!response.ok) {
      if (response.status === 404) return { success: true, imageIds: [], imageRefs: [] }
      const status = response.status
      const hint =
        status === 403
          ? " Your Hover connection may not have permission to access Instant Design. Try reconnecting Hover in Settings, or ensure your Hover integration has Instant Design API access in the Hover developer portal."
          : ""
      return { success: false, error: `Failed to list instant design images: HTTP ${status}.${hint}` }
    }
    const data = await response.json()
    // API returns { images: [ { id: number }, ... ] } per docs; some wrappers use data
    const raw =
      data.images ??
      data.data?.images ??
      data.data ??
      data.instant_design_images ??
      (Array.isArray(data) ? data : [])
    const list = Array.isArray(raw) ? raw : []
    const imageRefs: InstantDesignImageRef[] = []
    for (const item of list) {
      const id = typeof item === "object" && item != null && "id" in item ? item.id : item
      const numId = typeof id === "number" ? id : Number(id)
      if (Number.isInteger(numId) && numId > 0) {
        const jobId =
          typeof item === "object" && item != null && "job_id" in item
            ? (item as { job_id?: number }).job_id
            : undefined
        imageRefs.push({ imageId: numId, jobId })
      }
    }
    const imageIds = imageRefs.map((r) => r.imageId)
    return { success: true, imageIds, imageRefs }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function refreshHoverToken(refreshToken: string): Promise<{
  success: boolean
  accessToken?: string
  refreshToken?: string
  error?: string
}> {
  try {
    const response = await fetch("https://hover.to/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.HOVER_CLIENT_ID || "",
        client_secret: process.env.HOVER_CLIENT_SECRET || "",
      }),
    })
    if (!response.ok) {
      return { success: false, error: `Token refresh failed: HTTP ${response.status}` }
    }
    const tokenData = await response.json()
    if (!tokenData.access_token) {
      return { success: false, error: "Token response missing access_token" }
    }
    return {
      success: true,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Client-side lead field overrides (for empty fields the user fills in).
 * Stored in localStorage keyed by org so each org's overrides persist.
 */

import type { HoverInstantDesignLead } from "@/app/actions/hover"

const STORAGE_KEY_PREFIX = "hn_lead_overrides_"

export type LeadOverrides = Partial<Omit<HoverInstantDesignLead, "id" | "created_at">>

function getStorageKey(orgId: string): string {
  return `${STORAGE_KEY_PREFIX}${orgId}`
}

export function getLeadOverrides(orgId: string, leadId: number): LeadOverrides {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(getStorageKey(orgId))
    if (!raw) return {}
    const data = JSON.parse(raw) as Record<string, LeadOverrides>
    return data[String(leadId)] ?? {}
  } catch {
    return {}
  }
}

export function setLeadOverrides(orgId: string, leadId: number, overrides: LeadOverrides): void {
  if (typeof window === "undefined") return
  try {
    const key = getStorageKey(orgId)
    const raw = localStorage.getItem(key)
    const data = (raw ? JSON.parse(raw) : {}) as Record<string, LeadOverrides>
    data[String(leadId)] = overrides
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // ignore
  }
}

/** Merge API lead with overrides (override wins when present). */
export function mergeLeadWithOverrides(
  lead: HoverInstantDesignLead,
  overrides: LeadOverrides
): HoverInstantDesignLead {
  return {
    ...lead,
    ...overrides,
  }
}

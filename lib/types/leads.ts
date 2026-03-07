export const HOVER_LEAD_SOURCE = "Hover lead convert"

export interface Lead {
  id: string
  org_id: string
  hover_lead_id: number | null
  source: string
  full_name: string | null
  email: string | null
  phone_number: string | null
  location_line_1: string | null
  location_city: string | null
  location_region: string | null
  location_postal_code: string | null
  phone_marketing_opt_in: boolean | null
  phone_marketing_opt_in_at: string | null
  created_at: string
  updated_at: string
}

export interface LeadInput {
  full_name?: string | null
  email?: string | null
  phone_number?: string | null
  location_line_1?: string | null
  location_city?: string | null
  location_region?: string | null
  location_postal_code?: string | null
  source?: string | null
  phone_marketing_opt_in?: boolean | null
  phone_marketing_opt_in_at?: string | null
}

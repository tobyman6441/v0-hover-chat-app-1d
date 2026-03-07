"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getInstantDesignLeadById, type HoverInstantDesignLead } from "@/app/actions/hover"
import {
  getLeadOverrides,
  setLeadOverrides,
  mergeLeadWithOverrides,
  type LeadOverrides,
} from "@/lib/lead-overrides"
import {
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { NavMenu } from "@/components/navigation/nav-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const LEAD_FIELDS: { key: keyof Omit<HoverInstantDesignLead, "id" | "created_at">; label: string; icon: React.ReactNode }[] = [
  { key: "full_name", label: "Full name", icon: <User className="size-4" /> },
  { key: "email", label: "Email", icon: <Mail className="size-4" /> },
  { key: "phone_number", label: "Phone number", icon: <Phone className="size-4" /> },
  { key: "location_line_1", label: "Address line 1", icon: <MapPin className="size-4" /> },
  { key: "location_city", label: "City", icon: <MapPin className="size-4" /> },
  { key: "location_region", label: "State / Region", icon: <MapPin className="size-4" /> },
  { key: "location_postal_code", label: "Postal code", icon: <MapPin className="size-4" /> },
  { key: "phone_marketing_opt_in", label: "Phone marketing opt-in", icon: <CheckCircle className="size-4" /> },
  { key: "phone_marketing_opt_in_at", label: "Phone marketing opt-in at", icon: <Calendar className="size-4" /> },
]

export default function MarketingLeadPage() {
  const { user, org, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const leadId = params?.leadId ? Number(params.leadId) : NaN
  const [lead, setLead] = useState<HoverInstantDesignLead | null>(null)
  const [overrides, setOverridesState] = useState<LeadOverrides>({})
  const [isLoadingLead, setIsLoadingLead] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLead = useCallback(async () => {
    if (!Number.isInteger(leadId) || leadId <= 0) {
      setError("Invalid lead")
      setIsLoadingLead(false)
      return
    }
    const result = await getInstantDesignLeadById(leadId)
    if (result.success && result.lead) {
      setLead(result.lead)
      setError(null)
    } else {
      setError(result.error ?? "Failed to load lead")
      setLead(null)
    }
  }, [leadId])

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace("/auth/login")
      return
    }
    if (!org || !org.onboarding_complete) {
      router.replace("/setup")
      return
    }
    setIsLoadingLead(true)
    loadLead().finally(() => setIsLoadingLead(false))
  }, [user, org, isLoading, router, loadLead])

  // Load overrides from localStorage when org/leadId available
  useEffect(() => {
    if (!org?.id || !Number.isInteger(leadId)) return
    const stored = getLeadOverrides(org.id, leadId)
    setOverridesState(stored)
  }, [org?.id, leadId])

  const mergedLead = lead ? mergeLeadWithOverrides(lead, overrides) : null

  const handleOverrideChange = (field: keyof LeadOverrides, value: string | boolean | null) => {
    if (!org?.id || !Number.isInteger(leadId)) return
    const next: LeadOverrides = { ...overrides, [field]: value === "" ? undefined : value }
    setOverridesState(next)
    setLeadOverrides(org.id, leadId, next)
  }

  if (isLoading || !user || !org?.onboarding_complete) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isLoadingLead && !lead) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !mergedLead) {
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <header className="flex items-center gap-3 border-b border-border px-4 py-4">
          <NavMenu />
          <span className="text-sm font-medium text-muted-foreground">Marketing</span>
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <p className="text-destructive">{error ?? "Lead not found"}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/marketing">
                <ArrowLeft className="mr-2 size-4" />
                Back to leads
              </Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-4">
        <NavMenu />
        <div className="flex items-center gap-2">
          <Image
            src="/images/hover-ninja-logo.png"
            alt="Hover Ninja logo"
            width={28}
            height={28}
            className="size-7"
          />
          <span className="text-sm font-semibold text-foreground">Hover Ninja<sup className="ml-1 text-[10px] font-medium text-muted-foreground align-super">ALPHA</sup></span>
        </div>
        <span className="text-muted-foreground">/</span>
        <Link href="/marketing" className="text-sm text-muted-foreground hover:text-foreground">
          Marketing
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-sm font-medium text-foreground truncate max-w-[180px]">
          {mergedLead.full_name || mergedLead.email || `Lead #${mergedLead.id}`}
        </h1>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/marketing" className="gap-2">
              <ArrowLeft className="size-4" />
              Back to leads
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead details</CardTitle>
              <p className="text-xs text-muted-foreground">
                ID: {mergedLead.id} · Created {mergedLead.created_at ? new Date(mergedLead.created_at).toLocaleDateString() : "—"}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {LEAD_FIELDS.map(({ key, label, icon }) => {
                const value = mergedLead[key]
                const isEmpty = value === null || value === undefined || value === ""
                const isBoolean = key === "phone_marketing_opt_in"
                const isDate = key === "phone_marketing_opt_in_at"

                return (
                  <div key={key} className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      {icon}
                      {label}
                    </Label>
                    {isBoolean ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={value === true}
                          onChange={(e) => handleOverrideChange(key, e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="text-sm">{value === true ? "Yes" : "No"}</span>
                      </div>
                    ) : isEmpty ? (
                      <Input
                        placeholder={`Add ${label.toLowerCase()}`}
                        value={(overrides[key] as string) ?? ""}
                        onChange={(e) => handleOverrideChange(key, e.target.value)}
                        className="max-w-md"
                      />
                    ) : (
                      <p className="text-sm text-foreground">
                        {isDate && value ? new Date(value as string).toLocaleString() : String(value)}
                      </p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

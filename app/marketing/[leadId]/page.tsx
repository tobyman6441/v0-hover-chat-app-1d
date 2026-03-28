"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { getInstantDesignImageById, getLeadInstantDesignImagesFromHover, type HoverInstantDesignImageDetails } from "@/app/actions/hover"
import { getLeadInstantDesignImages } from "@/lib/actions/lead-instant-design"
import { getLead, updateLead } from "@/lib/actions/leads"
import { CustomFieldValuesEditor } from "@/components/custom-fields/custom-field-values-editor"
import { HOVER_LEAD_SOURCE, type Lead, type LeadInput } from "@/lib/types/leads"
import {
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  Palette,
  Tag,
  RefreshCw,
  Bug,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { NavMenu } from "@/components/navigation/nav-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Proxy Hover image URLs through our API (same as job page)
function proxyImageUrl(url: string): string {
  if (!url) return ""
  return `/api/hover/image?url=${encodeURIComponent(url)}`
}

const LEAD_FIELDS: { key: keyof LeadInput; label: string; icon: React.ReactNode }[] = [
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
  const searchParams = useSearchParams()
  const leadId = params?.leadId as string | undefined
  const showDebug = searchParams.get("debug") === "1"

  const { toast } = useToast()
  const [lead, setLead] = useState<Lead | null>(null)
  const [savedDesigns, setSavedDesigns] = useState<HoverInstantDesignImageDetails[]>([])
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false)
  const [designsError, setDesignsError] = useState<string | null>(null)
  const [isLoadingLead, setIsLoadingLead] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugResult, setDebugResult] = useState<unknown>(null)
  const [isLoadingDebug, setIsLoadingDebug] = useState(false)
  const [debugError, setDebugError] = useState<string | null>(null)

  const loadLead = useCallback(async () => {
    if (!leadId) return
    const result = await getLead(leadId)
    if (result.success && result.lead) {
      setLead(result.lead)
      setError(null)
    } else {
      setError(result.error ?? "Lead not found")
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
    if (!leadId) {
      setError("Invalid lead")
      setIsLoadingLead(false)
      return
    }
    setIsLoadingLead(true)
    loadLead().finally(() => setIsLoadingLead(false))
  }, [user, org, isLoading, router, leadId, loadLead])

  const loadSavedDesigns = useCallback(async () => {
    if (lead?.hover_lead_id == null) return
    setIsLoadingDesigns(true)
    setDesignsError(null)
    let loaded: HoverInstantDesignImageDetails[] = []
    const listResult = await getLeadInstantDesignImages(lead.hover_lead_id)
    if (listResult.success && listResult.images?.length) {
      const hoverLeadId = lead.hover_lead_id
      const details = await Promise.all(
        listResult.images.map(({ image_id, job_id }) =>
          getInstantDesignImageById(image_id, job_id ?? undefined, hoverLeadId)
        )
      )
      loaded = details.filter((r) => r.success && r.image).map((r) => r.image!)
    }
    if (loaded.length === 0) {
      const hoverResult = await getLeadInstantDesignImagesFromHover(lead.hover_lead_id)
      if (hoverResult.success && hoverResult.images?.length) {
        loaded = hoverResult.images
      } else {
        if (!hoverResult.success && hoverResult.error) {
          setDesignsError(hoverResult.error)
        } else if (
          hoverResult.listRefsCount != null &&
          hoverResult.listRefsCount > 0 &&
          (hoverResult.images?.length ?? 0) === 0
        ) {
          setDesignsError(
            hoverResult.showErrorSample
              ? `Hover listed ${hoverResult.listRefsCount} image(s) but could not load details: ${hoverResult.showErrorSample}. Ensure webhooks are configured so new images sync with job ID.`
              : `Hover listed ${hoverResult.listRefsCount} image(s) but could not load image details.`
          )
        }
      }
    }
    setSavedDesigns(loaded)
    setIsLoadingDesigns(false)
  }, [lead?.hover_lead_id])

  useEffect(() => {
    if (lead?.hover_lead_id == null) return
    loadSavedDesigns()
  }, [lead?.hover_lead_id, loadSavedDesigns])

  const runDesignsDebug = useCallback(async () => {
    if (!leadId) return
    setIsLoadingDebug(true)
    setDebugError(null)
    try {
      const res = await fetch(`/api/marketing/leads/${leadId}/designs-debug`)
      const data = await res.json()
      if (!res.ok) {
        setDebugError(data.error ?? `HTTP ${res.status}`)
        setDebugResult(null)
      } else {
        setDebugResult(data)
        setDebugOpen(true)
      }
    } catch (e) {
      setDebugError(String(e))
      setDebugResult(null)
    } finally {
      setIsLoadingDebug(false)
    }
  }, [leadId])

  const handleLeadUpdate = async (field: keyof LeadInput, value: string | boolean | null) => {
    if (!lead || !leadId) return
    const input = { [field]: value } as LeadInput
    const result = await updateLead(leadId, input)
    if (result.success) {
      setLead((prev) => (prev ? { ...prev, [field]: value, updated_at: new Date().toISOString() } : null))
    } else {
      toast({
        title: "Failed to save",
        description: result.error ?? "Your changes were not saved. Please try again.",
        variant: "destructive",
      })
      await loadLead()
    }
  }

  const displayTitle = lead
    ? (lead.full_name || lead.email || "Unnamed lead")
    : "Lead"

  const isHoverLead = lead != null && lead.hover_lead_id != null

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

  if (error || !lead) {
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
          {displayTitle}
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
                {lead.hover_lead_id != null ? `Hover lead ID: ${lead.hover_lead_id} · ` : ""}
                Created {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "—"}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Source: read-only for Hover lead convert, editable for others */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="size-4" />
                  Source
                </Label>
                {isHoverLead ? (
                  <p className="text-sm text-foreground">{lead.source?.trim() || HOVER_LEAD_SOURCE}</p>
                ) : (
                  <Input
                    placeholder="e.g. Website, Referral"
                    value={lead.source ?? ""}
                    onChange={(e) => setLead((prev) => (prev ? { ...prev, source: e.target.value } : null))}
                    onBlur={(e) => handleLeadUpdate("source", e.target.value || null)}
                    className="max-w-md"
                  />
                )}
              </div>

              {LEAD_FIELDS.map(({ key, label, icon }) => {
                const value = lead[key as keyof Lead]
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
                          onChange={(e) => handleLeadUpdate(key, e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="text-sm">{value === true ? "Yes" : "No"}</span>
                      </div>
                    ) : isDate && value ? (
                      <p className="text-sm text-foreground">{new Date(value as string).toLocaleString()}</p>
                    ) : (
                      <Input
                        placeholder={`Add ${label.toLowerCase()}`}
                        value={String(value ?? "")}
                        onChange={(e) => setLead((prev) => (prev ? { ...prev, [key]: e.target.value } : null))}
                        onBlur={(e) => handleLeadUpdate(key, e.target.value.trim() || null)}
                        className="max-w-md"
                      />
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Custom fields */}
          {leadId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom fields</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomFieldValuesEditor
                  entityType="lead"
                  entityId={leadId}
                  appliesTo="leads"
                />
              </CardContent>
            </Card>
          )}

          {/* Saved designs: only for Hover leads — uses Show Instant Design Image API */}
          {isHoverLead && (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Palette className="size-4" />
                      Saved designs
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Instant Design images this lead has created.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Palette className="size-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">Coming soon</p>
                  <p className="max-w-xs text-xs text-muted-foreground/70">
                    Instant Design image retrieval requires API updates. This feature will be available once those changes are complete.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Debug: Saved designs API (show with ?debug=1) */}
          {showDebug && isHoverLead && (
            <Card>
              <button
                type="button"
                onClick={() => setDebugOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Bug className="size-4" />
                  Debug: Saved designs API
                </span>
                {debugOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {debugOpen && (
                <CardContent className="border-t border-border pt-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Runs List Instant Design Images (by lead_id) and Show for each ref. Use to see raw Hover API responses.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runDesignsDebug}
                    disabled={isLoadingDebug}
                  >
                    {isLoadingDebug ? <Loader2 className="size-4 animate-spin" /> : null}
                    <span className="ml-2">{isLoadingDebug ? "Running…" : "Run debug"}</span>
                  </Button>
                  {debugError && (
                    <p className="mt-2 text-sm text-destructive">{debugError}</p>
                  )}
                  {debugResult != null && (
                    <pre className="mt-3 max-h-96 overflow-auto rounded border border-border bg-muted/30 p-3 text-xs">
                      {JSON.stringify(debugResult, null, 2)}
                    </pre>
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

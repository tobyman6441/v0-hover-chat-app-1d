"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { getInstantDesignImageById, type HoverInstantDesignImageDetails } from "@/app/actions/hover"
import { getLeadInstantDesignImages } from "@/lib/actions/lead-instant-design"
import { getLead, updateLead } from "@/lib/actions/leads"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { NavMenu } from "@/components/navigation/nav-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  const leadId = params?.leadId as string | undefined

  const { toast } = useToast()
  const [lead, setLead] = useState<Lead | null>(null)
  const [savedDesigns, setSavedDesigns] = useState<HoverInstantDesignImageDetails[]>([])
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false)
  const [isLoadingLead, setIsLoadingLead] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    const listResult = await getLeadInstantDesignImages(lead.hover_lead_id)
    if (!listResult.success || !listResult.images?.length) {
      setSavedDesigns([])
      setIsLoadingDesigns(false)
      return
    }
    const details = await Promise.all(
      listResult.images.map(({ image_id, job_id }) =>
        getInstantDesignImageById(image_id, job_id ?? undefined)
      )
    )
    const loaded = details
      .filter((r) => r.success && r.image)
      .map((r) => r.image!)
    setSavedDesigns(loaded)
    setIsLoadingDesigns(false)
  }, [lead?.hover_lead_id])

  useEffect(() => {
    if (lead?.hover_lead_id == null) return
    loadSavedDesigns()
  }, [lead?.hover_lead_id, loadSavedDesigns])

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

          {/* Saved designs: only for Hover leads */}
          {isHoverLead && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="size-4" />
                  Saved designs
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Instant Design images this lead has created. Design options they chose are listed below each image.
                </p>
              </CardHeader>
              <CardContent>
                {isLoadingDesigns ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : savedDesigns.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No saved designs yet. When this lead creates Instant Design images, they will appear here (and after webhooks are set up, new images will appear automatically).
                  </p>
                ) : (
                  <div className="space-y-6">
                    {savedDesigns.map((img, idx) => (
                      <div
                        key={img.id}
                        className="rounded-lg border border-border bg-muted/20 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <div className="shrink-0">
                            <a
                              href={`/api/hover/image?url=${encodeURIComponent(img.url)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded-md border border-border bg-background"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/api/hover/image?url=${encodeURIComponent(img.thumbnail_url || img.url)}`}
                                alt={`Design ${idx + 1}`}
                                className="h-40 w-auto max-w-full object-contain sm:h-48"
                              />
                            </a>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Image ID: {img.id}
                              {img.created_at && ` · ${new Date(img.created_at).toLocaleString()}`}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Design details / options</p>
                            {img.details && typeof img.details === "object" ? (
                              <ul className="space-y-1 text-sm">
                                {Object.entries(img.details)
                                  .filter(([k]) => !["url", "image_url", "download_url", "thumbnail_url", "image"].includes(k))
                                  .map(([key, value]) => {
                                    if (value == null || (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)) return null
                                    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                                    const display = typeof value === "object" ? JSON.stringify(value) : String(value)
                                    return (
                                      <li key={key} className="flex gap-2">
                                        <span className="shrink-0 text-muted-foreground">{label}:</span>
                                        <span className="truncate text-foreground">{display}</span>
                                      </li>
                                    )
                                  })}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">No additional details returned from API.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

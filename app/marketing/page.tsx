"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { listLeads, createLead } from "@/lib/actions/leads"
import { HOVER_LEAD_SOURCE, type Lead } from "@/lib/types/leads"
import { getLeadInstantDesignCounts } from "@/lib/actions/lead-instant-design"
import { Loader2, Megaphone, RefreshCw, User, Mail, MapPin, ChevronRight, Palette, Plus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { NavMenu } from "@/components/navigation/nav-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function MarketingPage() {
  const { user, org, isLoading } = useAuth()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [imageCounts, setImageCounts] = useState<Record<number, number>>({})
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createForm, setCreateForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    location_line_1: "",
    location_city: "",
    location_region: "",
    location_postal_code: "",
    source: "",
  })

  const loadLeads = useCallback(async () => {
    const [leadsResult, countsResult] = await Promise.all([
      listLeads(),
      getLeadInstantDesignCounts(),
    ])
    if (leadsResult.success && leadsResult.leads) {
      setLeads(leadsResult.leads)
      setError(null)
    } else {
      setError(leadsResult.error ?? "Failed to load leads")
      setLeads([])
    }
    if (countsResult.success && countsResult.counts) {
      setImageCounts(countsResult.counts)
    } else {
      setImageCounts({})
    }
  }, [])

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
    setIsLoadingData(true)
    loadLeads().finally(() => setIsLoadingData(false))
  }, [user, org, isLoading, router, loadLeads])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadLeads()
    setIsRefreshing(false)
  }

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateSaving(true)
    const result = await createLead({
      full_name: createForm.full_name || null,
      email: createForm.email || null,
      phone_number: createForm.phone_number || null,
      location_line_1: createForm.location_line_1 || null,
      location_city: createForm.location_city || null,
      location_region: createForm.location_region || null,
      location_postal_code: createForm.location_postal_code || null,
      source: createForm.source || null,
    })
    setCreateSaving(false)
    if (result.success && result.lead) {
      setCreateOpen(false)
      setCreateForm({
        full_name: "",
        email: "",
        phone_number: "",
        location_line_1: "",
        location_city: "",
        location_region: "",
        location_postal_code: "",
        source: "",
      })
      await loadLeads()
      router.push(`/marketing/${result.lead.id}`)
    }
  }

  const displayName = (lead: Lead) =>
    lead.full_name || lead.email || "Unnamed lead"

  const displaySubline = (lead: Lead) => {
    const parts: (string | null)[] = []
    if (lead.email) parts.push(lead.email)
    if (lead.phone_number) parts.push(lead.phone_number)
    if (lead.location_line_1 || lead.location_city) {
      parts.push([lead.location_line_1, lead.location_city, lead.location_region].filter(Boolean).join(", "))
    }
    return parts
  }

  if (isLoading || !user || !org?.onboarding_complete) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
        <h1 className="text-sm font-medium text-foreground">Marketing</h1>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Leads</h2>
            <div className="flex items-center gap-2">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="size-4" />
                    <span className="ml-2">New lead</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create lead</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateLead} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="create-full_name">Full name</Label>
                      <Input
                        id="create-full_name"
                        value={createForm.full_name}
                        onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-email">Email</Label>
                      <Input
                        id="create-email"
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-phone">Phone number</Label>
                      <Input
                        id="create-phone"
                        value={createForm.phone_number}
                        onChange={(e) => setCreateForm((p) => ({ ...p, phone_number: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-source">Source</Label>
                      <Input
                        id="create-source"
                        value={createForm.source}
                        onChange={(e) => setCreateForm((p) => ({ ...p, source: e.target.value }))}
                        placeholder="e.g. Website, Referral"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-address">Address line 1</Label>
                      <Input
                        id="create-address"
                        value={createForm.location_line_1}
                        onChange={(e) => setCreateForm((p) => ({ ...p, location_line_1: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="create-city">City</Label>
                        <Input
                          id="create-city"
                          value={createForm.location_city}
                          onChange={(e) => setCreateForm((p) => ({ ...p, location_city: e.target.value }))}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-region">State / Region</Label>
                        <Input
                          id="create-region"
                          value={createForm.location_region}
                          onChange={(e) => setCreateForm((p) => ({ ...p, location_region: e.target.value }))}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-postal">Postal code</Label>
                      <Input
                        id="create-postal"
                        value={createForm.location_postal_code}
                        onChange={(e) => setCreateForm((p) => ({ ...p, location_postal_code: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createSaving}>
                        {createSaving ? <Loader2 className="size-4 animate-spin" /> : "Save lead"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </div>

          {isLoadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error && leads.length === 0 ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-16 text-center">
              <Megaphone className="size-12 text-muted-foreground" />
              <p className="mt-4 font-medium text-foreground">No leads yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a lead with the button above, or connect Hover to see Instant Design leads here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/marketing/${lead.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {displayName(lead)}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-muted-foreground">
                        {displaySubline(lead).map((part, i) =>
                          part ? (
                            <span key={i} className="flex items-center gap-1 truncate">
                              {i === 0 && lead.email ? <Mail className="size-3 shrink-0" /> : null}
                              {part}
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground" title="Source">
                      {lead.source || "—"}
                    </span>
                    {lead.hover_lead_id != null && (imageCounts[lead.hover_lead_id] ?? 0) > 0 && (
                      <div className="flex shrink-0 items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground" title="Instant Design images">
                        <Palette className="size-3.5" />
                        <span>{imageCounts[lead.hover_lead_id]}</span>
                      </div>
                    )}
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

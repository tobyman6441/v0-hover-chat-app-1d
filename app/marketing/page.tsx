"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { listInstantDesignLeads, type HoverInstantDesignLead } from "@/app/actions/hover"
import { Loader2, Megaphone, RefreshCw, User, Mail, MapPin, ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { NavMenu } from "@/components/navigation/nav-menu"
import { Button } from "@/components/ui/button"

export default function MarketingPage() {
  const { user, org, isLoading } = useAuth()
  const router = useRouter()
  const [leads, setLeads] = useState<HoverInstantDesignLead[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLeads = useCallback(async () => {
    const result = await listInstantDesignLeads()
    if (result.success && result.leads) {
      setLeads(result.leads)
      setError(null)
    } else {
      setError(result.error ?? "Failed to load leads")
      setLeads([])
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
            <h2 className="text-lg font-semibold text-foreground">Instant Design Leads</h2>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>

          {isLoadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-16 text-center">
              <Megaphone className="size-12 text-muted-foreground" />
              <p className="mt-4 font-medium text-foreground">No leads yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Leads from Hover Instant Design forms will appear here.
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
                        {lead.full_name || lead.email || "Unnamed lead"}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-muted-foreground">
                        {lead.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="size-3 shrink-0" />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone_number && (
                          <span>{lead.phone_number}</span>
                        )}
                        {(lead.location_line_1 || lead.location_city) && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="size-3 shrink-0" />
                            {[lead.location_line_1, lead.location_city, lead.location_region].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
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

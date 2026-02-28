"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Calendar,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  listJobsWithMeasurements, 
  getMeasurements, 
  listAllJobs,
  getJobPhotos,
  type HoverJob,
  type JobPhotosResult 
} from "@/app/actions/hover"

export interface JobPickerData {
  title: string
  description?: string
  jobs?: HoverJob[] // Optional - if not provided, will fetch from API
  action: string // e.g., "get_measurements", "view_details", "view_photos"
  fetchFromApi?: boolean // If true, fetch jobs from API
  searchQuery?: string // Pre-populate search to filter jobs
}

interface JobPickerProps {
  data: JobPickerData
  onSelect: (job: HoverJob, action: string) => void
  onMeasurementsLoaded?: (job: HoverJob, measurements: Record<string, unknown>) => void
  onPhotosLoaded?: (job: HoverJob, photos: JobPhotosResult) => void
  disabled?: boolean
}

const DELIVERABLE_LABELS: Record<string, string> = {
  "complete": "Complete Exterior",
  "roof": "Roof Only",
  "interior": "Interior",
  "photos": "Photos Only",
  "tla": "Total Living Area",
}

function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "complete":
    case "completed":
      return "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400"
    case "processing":
    case "in_progress":
      return "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400"
    case "pending":
    case "draft":
      return "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400"
    case "failed":
    case "error":
      return "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400"
    default:
      return "text-muted-foreground bg-muted"
  }
}

function getStatusIcon(status?: string) {
  switch (status?.toLowerCase()) {
    case "complete":
    case "completed":
      return CheckCircle2
    case "processing":
    case "in_progress":
      return Loader2
    case "failed":
    case "error":
      return AlertCircle
    default:
      return Clock
  }
}

function formatAddress(job: HoverJob): string {
  if (!job.address) return "No address"
  const { location_line_1, city, region, postal_code } = job.address
  const parts = [location_line_1, city, region, postal_code].filter(Boolean)
  return parts.join(", ") || "No address"
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return "Unknown date"
  }
}

export function JobPicker({ data, onSelect, onMeasurementsLoaded, onPhotosLoaded, disabled }: JobPickerProps) {
  const { title, description, action, fetchFromApi, searchQuery: initialSearchQuery } = data
  
  const [jobs, setJobs] = useState<HoverJob[]>(data.jobs || [])
  const [loading, setLoading] = useState(fetchFromApi ?? false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "")
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [loadingMeasurements, setLoadingMeasurements] = useState(false)
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  // Fetch jobs from API if needed
  useEffect(() => {
    if (!fetchFromApi || (data.jobs && data.jobs.length > 0)) {
      setJobs(data.jobs || [])
      return
    }

    async function fetchJobs() {
      setLoading(true)
      setError(null)
      
      try {
        // Use listAllJobs for photos (shows all jobs), listJobsWithMeasurements for measurements (only completed)
        const result = action === "get_photos" 
          ? await listAllJobs()
          : await listJobsWithMeasurements()
        
        if (result.success && result.jobs) {
          setJobs(result.jobs)
        } else {
          setError(result.error || "Failed to load jobs")
        }
      } catch (err) {
        setError(`Error loading jobs: ${err instanceof Error ? err.message : String(err)}`)
      }
      
      setLoading(false)
    }
    
    fetchJobs()
  }, [fetchFromApi, data.jobs, action])

  // Filter jobs based on search query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs
    
    const query = searchQuery.toLowerCase()
    return jobs.filter((job) => {
      const searchableFields = [
        job.name,
        job.id.toString(),
        job.external_identifier,
        job.address?.location_line_1,
        job.address?.location_line_2,
        job.address?.city,
        job.address?.region,
        job.address?.postal_code,
        job.customer?.name,
        job.customer?.email,
        job.customer?.phone,
      ].filter(Boolean)
      
      return searchableFields.some((field) => 
        field?.toLowerCase().includes(query)
      )
    })
  }, [jobs, searchQuery])

  const handleJobSelect = async (job: HoverJob) => {
    if (disabled || selectedJobId !== null) return
    
    setSelectedJobId(job.id)
    
    // If action is get_measurements, fetch measurements first
    if (action === "get_measurements" && onMeasurementsLoaded) {
      setLoadingMeasurements(true)
      
      try {
        // Get the first completed model
        const model = Array.isArray(job.models) ? job.models.find((m) => m.state === "complete") : undefined
        if (model) {
          const result = await getMeasurements(model.id)
          if (result.success && result.measurements) {
            onMeasurementsLoaded(job, result.measurements)
          } else {
            setError(result.error || "Failed to load measurements")
            setSelectedJobId(null) // Allow re-selection
          }
        } else {
          setError("No completed model found for this job")
          setSelectedJobId(null)
        }
      } catch (err) {
        setError(`Error loading measurements: ${err instanceof Error ? err.message : String(err)}`)
        setSelectedJobId(null)
      }
      
      setLoadingMeasurements(false)
    } else if (action === "get_photos" && onPhotosLoaded) {
      // Fetch photos for the selected job
      setLoadingPhotos(true)
      
      try {
        const result = await getJobPhotos(job.id)
        if (result.success) {
          onPhotosLoaded(job, result)
        } else {
          setError(result.error || "Failed to load photos")
          setSelectedJobId(null)
        }
      } catch (err) {
        setError(`Error loading photos: ${err instanceof Error ? err.message : String(err)}`)
        setSelectedJobId(null)
      }
      
      setLoadingPhotos(false)
    } else {
      onSelect(job, action)
    }
  }

  if (loading) {
    const loadingText = action === "get_photos" 
      ? "Loading jobs..." 
      : "Loading jobs with measurements..."
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{loadingText}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-card p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-4" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No jobs with completed measurements found. Jobs need to have a model with state "complete" to view measurements.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <h3 className="font-medium text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      
      {/* Search Box */}
      <div className="border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, address, email, or job ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            disabled={disabled || selectedJobId !== null}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {filteredJobs.length} of {jobs.length} jobs{action === "get_photos" ? "" : " with completed measurements"}
        </p>
      </div>

      {/* Jobs List */}
      <div className="max-h-[400px] overflow-y-auto">
        {filteredJobs.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No jobs match your search
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filteredJobs.map((job) => {
              const isSelected = selectedJobId === job.id
              const deliverableType = Array.isArray(job.models) && job.models[0]?.deliverable || "complete"
              const StatusIcon = getStatusIcon(job.reconstruction_state)
              
              return (
                <button
                  key={job.id}
                  onClick={() => handleJobSelect(job)}
                  disabled={disabled || selectedJobId !== null}
                  className={cn(
                    "flex w-full items-start gap-3 p-3 text-left transition-colors",
                    isSelected
                      ? "bg-primary/5"
                      : selectedJobId !== null
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-accent/50",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="size-5 text-primary" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground">
                        {job.name || `Job #${job.id}`}
                      </p>
                      {isSelected && (loadingMeasurements || loadingPhotos) && (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{formatAddress(job)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        <span>Updated {formatDate(job.updated_at)}</span>
                      </div>
                      <span className="text-border">|</span>
                      <span>ID: {job.id}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {DELIVERABLE_LABELS[deliverableType] || deliverableType}
                    </Badge>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        getStatusColor(job.reconstruction_state)
                      )}
                    >
                      <StatusIcon className="size-3" />
                      {job.reconstruction_state}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
      
      {jobs.length > 5 && (
        <div className="border-t border-border bg-muted/30 px-4 py-2 text-center text-xs text-muted-foreground">
          Scroll to see all {jobs.length} jobs
        </div>
      )}
    </div>
  )
}

// Parse job picker from AI response
export function parseJobPickerFromText(text: string): {
  picker: JobPickerData | null
  textBefore: string
  textAfter: string
} {
  const regex = /\[JOBS\]([\s\S]*?)\[\/JOBS\]/
  const match = text.match(regex)

  if (!match) {
    return { picker: null, textBefore: text, textAfter: "" }
  }

  try {
    const picker = JSON.parse(match[1]) as JobPickerData
    const textBefore = text.slice(0, match.index).trim()
    const textAfter = text.slice((match.index || 0) + match[0].length).trim()
    return { picker, textBefore, textAfter }
  } catch {
    return { picker: null, textBefore: text, textAfter: "" }
  }
}

// Format the selected job as a user message
export function formatJobSelection(job: HoverJob, action: string): string {
  const jobName = job.name || `Job #${job.id}`
  const address = formatAddress(job)
  return `Selected: ${jobName} at ${address} (ID: ${job.id})`
}

// Re-export HoverJob type for convenience
export type { HoverJob }

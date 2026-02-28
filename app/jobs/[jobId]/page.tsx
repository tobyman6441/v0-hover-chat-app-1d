"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { 
  Loader2, 
  ExternalLink, 
  MapPin, 
  Calendar, 
  Home, 
  ArrowLeft,
  Camera,
  Ruler,
  ClipboardCheck,
  Palette,
  Image as ImageIcon
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { NavMenu } from "@/components/navigation/nav-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  getJobPhotos, 
  getMeasurements,
  type HoverJobDetails, 
  type HoverInspection,
  type HoverWireframeImage,
  type HoverInstantDesignImage,
  type HoverJobPhoto
} from "@/app/actions/hover"
import { getStages, getJobStages, updateJobStage, ensureJobStage, type Stage } from "@/lib/actions/stages"

// Helper to proxy image URLs through our API
function proxyImageUrl(url: string): string {
  if (!url) return ""
  return `/api/hover/image?url=${encodeURIComponent(url)}`
}

// Helper to format measurement values
function formatMeasurement(value: unknown): string {
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  if (typeof value === "string") {
    return value
  }
  return String(value)
}

// Interface for structured measurements
interface MeasurementCategory {
  name: string
  items: { label: string; value: string; unit?: string }[]
}

// Parse measurements into categories
function parseMeasurements(measurements: Record<string, unknown>): MeasurementCategory[] {
  const categories: MeasurementCategory[] = []
  
  // Common measurement categories we look for
  const categoryMappings: Record<string, string> = {
    roof: "Roof",
    siding: "Siding",
    windows: "Windows",
    doors: "Doors",
    gutters: "Gutters",
    soffit: "Soffit",
    fascia: "Fascia",
    trim: "Trim",
    total: "Totals",
    area: "Areas",
    perimeter: "Perimeters",
    length: "Lengths"
  }
  
  // Try to parse the measurements object
  for (const [key, value] of Object.entries(measurements)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const categoryName = categoryMappings[key.toLowerCase()] || key.charAt(0).toUpperCase() + key.slice(1)
      const items: { label: string; value: string; unit?: string }[] = []
      
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        if (subValue !== null && subValue !== undefined) {
          const label = subKey.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
          items.push({
            label,
            value: formatMeasurement(subValue),
            unit: typeof subValue === "number" ? "sq ft" : undefined
          })
        }
      }
      
      if (items.length > 0) {
        categories.push({ name: categoryName, items })
      }
    } else if (value !== null && value !== undefined && typeof value !== "object") {
      // Top-level values
      const existingTotals = categories.find(c => c.name === "Summary")
      const label = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
      const item = {
        label,
        value: formatMeasurement(value),
        unit: typeof value === "number" ? "sq ft" : undefined
      }
      
      if (existingTotals) {
        existingTotals.items.push(item)
      } else {
        categories.unshift({ name: "Summary", items: [item] })
      }
    }
  }
  
  return categories
}

export default function JobDetailPage() {
  const { user, org, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const jobId = Number(params.jobId)

  const [job, setJob] = useState<HoverJobDetails | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [currentStageId, setCurrentStageId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStage, setIsUpdatingStage] = useState(false)
  
  // Additional job data
  const [scanPhotos, setScanPhotos] = useState<HoverJobPhoto[]>([])
  const [inspections, setInspections] = useState<HoverInspection[]>([])
  const [wireframeImages, setWireframeImages] = useState<HoverWireframeImage[]>([])
  const [instantDesignImages, setInstantDesignImages] = useState<HoverInstantDesignImage[]>([])
  const [measurements, setMeasurements] = useState<MeasurementCategory[]>([])
  const [measurementsLoading, setMeasurementsLoading] = useState(false)

  const loadData = useCallback(async (orgId: string) => {
    if (!jobId) return

    // Load full job data including photos, inspections, design images
    const jobResult = await getJobPhotos(jobId)
    if (jobResult.success && jobResult.jobDetails) {
      setJob(jobResult.jobDetails)
      setScanPhotos(jobResult.scanPhotos || [])
      setInspections(jobResult.inspections || [])
      setWireframeImages(jobResult.wireframeImages || [])
      setInstantDesignImages(jobResult.instantDesignImages || [])
    }

    // Load stages (filter to sales pipeline for job detail view)
    const stagesResult = await getStages(orgId, "sales")
    if (stagesResult.stages) {
      setStages(stagesResult.stages)
    }

    // Ensure job has a stage and get current assignment
    await ensureJobStage(orgId, jobId)
    const jobStagesResult = await getJobStages(orgId)
    if (jobStagesResult.jobStages) {
      const assignment = jobStagesResult.jobStages.find(js => js.hover_job_id === jobId)
      if (assignment?.stage_id) {
        setCurrentStageId(assignment.stage_id)
      } else if (stagesResult.stages?.length) {
        // Default to first stage
        setCurrentStageId(stagesResult.stages[0].id)
      }
    }

    setIsLoading(false)
  }, [jobId])

  // Load measurements when job is loaded (needs model ID)
  useEffect(() => {
    async function loadMeasurements() {
      if (!job) return
      
      // Get model ID from job - typically the first model
      const modelId = (job as unknown as { model_id?: number })?.model_id
      if (!modelId) return
      
      setMeasurementsLoading(true)
      const result = await getMeasurements(modelId)
      if (result.success && result.measurements) {
        const parsed = parseMeasurements(result.measurements)
        setMeasurements(parsed)
      }
      setMeasurementsLoading(false)
    }
    
    loadMeasurements()
  }, [job])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace("/auth/login")
      return
    }
    if (!org || !org.onboarding_complete) {
      router.replace("/setup")
      return
    }

    loadData(org.id)
  }, [user, org, authLoading, router, loadData])

  const handleStageChange = async (newStageId: string) => {
    if (!org || isUpdatingStage) return
    
    const previousStageId = currentStageId
    setIsUpdatingStage(true)
    setCurrentStageId(newStageId) // Optimistic update
    
    try {
      const result = await updateJobStage(org.id, jobId, newStageId)
      if (result.error) {
        console.error("Stage update failed:", result.error)
        setCurrentStageId(previousStageId) // Revert on error
      }
    } catch (error) {
      console.error("Stage update exception:", error)
      setCurrentStageId(previousStageId) // Revert on error
    }
    
    setIsUpdatingStage(false)
  }

  if (authLoading || !user || !org?.onboarding_complete) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Format address
  const address = job?.address 
    ? [
        job.address.location_line_1,
        job.address.location_line_2,
        job.address.city,
        job.address.region,
        job.address.postal_code
      ].filter(Boolean).join(", ")
    : null

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <NavMenu />
          <div className="flex items-center gap-2">
            <Image
              src="/images/hover-ninja-logo.png"
              alt="Hover Ninja logo"
              width={28}
              height={28}
              className="size-7"
            />
            <span className="text-sm font-semibold text-foreground">Hover Ninja</span>
          </div>
          <span className="text-muted-foreground">/</span>
          <Link href="/sales" className="text-sm text-muted-foreground hover:text-foreground">
            Pipeline
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-sm font-medium text-foreground">
            {isLoading ? "Loading..." : job?.name || `Job #${jobId}`}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : job ? (
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Job Header Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {job.name || `Job #${job.id}`}
                    </CardTitle>
                    {address && (
                      <div className="mt-2 flex items-start gap-2 text-muted-foreground">
                        <MapPin className="mt-0.5 size-4 flex-shrink-0" />
                        <p className="text-sm">{address}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Stage Selector */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Pipeline Stage
                    </label>
                    <Select
                      value={currentStageId || ""}
                      onValueChange={handleStageChange}
                      disabled={isUpdatingStage}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select stage..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {job.state && (
                    <Badge variant="secondary">
                      {job.state}
                    </Badge>
                  )}
                  {job.updated_at && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="size-4" />
                      <span className="text-sm">
                        Updated {new Date(job.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <a
                      href={`https://hover.to/wr/jobs/${job.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 size-4" />
                      Open in Hover
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/chat?action=photos&jobId=${job.id}`}>
                      <Camera className="mr-2 size-4" />
                      View Photos
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/chat?action=measurements&jobId=${job.id}`}>
                      <Ruler className="mr-2 size-4" />
                      Get Measurements
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Inspections */}
            {inspections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardCheck className="size-5" />
                    Inspections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {inspections.map((inspection) => (
                      <Button
                        key={inspection.id}
                        variant="outline"
                        asChild
                      >
                        <a
                          href={`https://hover.to/wr/inspections/${inspection.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ClipboardCheck className="mr-2 size-4" />
                          {inspection.title || `Inspection #${inspection.id}`}
                        </a>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Measurements */}
            {(measurements.length > 0 || measurementsLoading) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Ruler className="size-5" />
                    Measurements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {measurementsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="text-sm">Loading measurements...</span>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      {measurements.map((category) => (
                        <div key={category.name}>
                          <h4 className="mb-3 text-sm font-semibold text-foreground">
                            {category.name}
                          </h4>
                          <div className="space-y-2">
                            {category.items.slice(0, 8).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className="font-medium">
                                  {item.value}
                                  {item.unit && <span className="ml-1 text-xs text-muted-foreground">{item.unit}</span>}
                                </span>
                              </div>
                            ))}
                            {category.items.length > 8 && (
                              <p className="text-xs text-muted-foreground">
                                +{category.items.length - 8} more items
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Scan Photos */}
            {scanPhotos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Camera className="size-5" />
                    Scan Photos ({scanPhotos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {scanPhotos.slice(0, 8).map((photo, index) => (
                      <div
                        key={photo.id || index}
                        className="aspect-video overflow-hidden rounded-lg bg-muted"
                      >
                        <img
                          src={proxyImageUrl(photo.thumb_url || photo.url)}
                          alt={`Scan photo ${index + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                  {scanPhotos.length > 8 && (
                    <p className="mt-3 text-center text-sm text-muted-foreground">
                      +{scanPhotos.length - 8} more photos
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Wireframe Images (3D Model Views) */}
            {wireframeImages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ImageIcon className="size-5" />
                    3D Model Views ({wireframeImages.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {wireframeImages.slice(0, 8).map((image, index) => (
                      <div
                        key={image.id || index}
                        className="aspect-video overflow-hidden rounded-lg bg-muted"
                      >
                        <img
                          src={proxyImageUrl(image.thumbnail_url || image.url)}
                          alt={`3D view ${index + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                  {wireframeImages.length > 8 && (
                    <p className="mt-3 text-center text-sm text-muted-foreground">
                      +{wireframeImages.length - 8} more images
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Instant Design Images */}
            {instantDesignImages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Palette className="size-5" />
                    Design Images ({instantDesignImages.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {instantDesignImages.slice(0, 8).map((image, index) => (
                      <div
                        key={image.id || index}
                        className="aspect-video overflow-hidden rounded-lg bg-muted"
                      >
                        <img
                          src={proxyImageUrl(image.thumbnail_url || image.url)}
                          alt={`Design ${index + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                  {instantDesignImages.length > 8 && (
                    <p className="mt-3 text-center text-sm text-muted-foreground">
                      +{instantDesignImages.length - 8} more designs
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Inspection Photos */}
            {inspections.some(i => i.photos && i.photos.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardCheck className="size-5" />
                    Inspection Photos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {inspections.filter(i => i.photos && i.photos.length > 0).map((inspection) => (
                    <div key={inspection.id}>
                      <h4 className="mb-3 text-sm font-semibold">
                        {inspection.title || `Inspection #${inspection.id}`}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {inspection.photos?.slice(0, 4).map((photo, index) => (
                          <div
                            key={photo.id || index}
                            className="aspect-video overflow-hidden rounded-lg bg-muted"
                          >
                            <img
                              src={proxyImageUrl(photo.thumb_url || photo.url)}
                              alt={`Inspection photo ${index + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                      {inspection.photos && inspection.photos.length > 4 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          +{inspection.photos.length - 4} more photos
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Customer Info */}
            {job.customer && (job.customer.name || job.customer.email || job.customer.phone) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Home className="size-5" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {job.customer.name && (
                      <p className="text-sm font-medium">{job.customer.name}</p>
                    )}
                    {job.customer.email && (
                      <p className="text-sm text-muted-foreground">{job.customer.email}</p>
                    )}
                    {job.customer.phone && (
                      <p className="text-sm text-muted-foreground">{job.customer.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center">
            <p className="text-muted-foreground">Job not found</p>
            <Button variant="link" onClick={() => router.push("/sales")}>
              Back to Pipeline
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

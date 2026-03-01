"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2, RefreshCw } from "lucide-react"
import Image from "next/image"
import { NavMenu } from "@/components/navigation/nav-menu"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { KanbanFilters } from "@/components/kanban/kanban-filters"
import { Button } from "@/components/ui/button"
import { getStages, getJobStagesForPipeline, initializeDefaultStages, type Stage, type JobStage } from "@/lib/actions/stages"
import { listAllJobs, type HoverJob } from "@/app/actions/hover"

export default function SalesPage() {
  const { user, org, member, isLoading } = useAuth()
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>([])
  const [jobs, setJobs] = useState<HoverJob[]>([])
  const [filteredJobs, setFilteredJobs] = useState<HoverJob[]>([])
  const [jobStageMap, setJobStageMap] = useState<Record<number, string>>({})
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [jobTypeFilter, setJobTypeFilter] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState<string | null>(null)

  const loadData = useCallback(async (orgId: string) => {
    // Initialize default stages if needed
    await initializeDefaultStages(orgId)
    
    // Load stages for sales pipeline
    const stagesResult = await getStages(orgId, "sales")
    if (stagesResult.stages) {
      setStages(stagesResult.stages)
    }

    // Load jobs from Hover
    const jobsResult = await listAllJobs()
    if (jobsResult.success && jobsResult.jobs) {
      setJobs(jobsResult.jobs)
      setFilteredJobs(jobsResult.jobs)
    }

    // Load job stage assignments for sales pipeline
    const jobStagesResult = await getJobStagesForPipeline(orgId, "sales")
    if (jobStagesResult.jobStages) {
      const map: Record<number, string> = {}
      jobStagesResult.jobStages.forEach((js: JobStage) => {
        if (js.stage_id) {
          map[js.hover_job_id] = js.stage_id
        }
      })
      setJobStageMap(map)
    }

    setIsLoadingData(false)
  }, [])

  // Apply filters
  useEffect(() => {
    let result = jobs

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(job => 
        job.name?.toLowerCase().includes(query) ||
        job.location_line_1?.toLowerCase().includes(query) ||
        job.location_line_2?.toLowerCase().includes(query) ||
        job.customer_name?.toLowerCase().includes(query) ||
        job.customer_email?.toLowerCase().includes(query) ||
        String(job.id).includes(query)
      )
    }

    // Job type filter
    if (jobTypeFilter) {
      result = result.filter(job => job.job_type === jobTypeFilter)
    }

    // State filter
    if (stateFilter) {
      result = result.filter(job => job.state === stateFilter)
    }

    setFilteredJobs(result)
  }, [jobs, searchQuery, jobTypeFilter, stateFilter])

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

    loadData(org.id)
  }, [user, org, isLoading, router, loadData])

  const handleRefresh = async () => {
    if (!org) return
    setIsRefreshing(true)
    await loadData(org.id)
    setIsRefreshing(false)
  }

  if (isLoading || !user || !org?.onboarding_complete) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isAdmin = member?.role === "admin"

  // Get unique job types and states for filters
  const jobTypes = [...new Set(jobs.map(j => j.job_type).filter(Boolean))]
  const states = [...new Set(jobs.map(j => j.state).filter(Boolean))]

  return (
    <div className="flex h-svh flex-col bg-background">
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
            <span className="text-sm font-semibold text-foreground">Hover Ninja<sup className="ml-0.5 text-[10px] font-medium text-muted-foreground">ALPHA</sup></span>
          </div>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-sm font-medium text-foreground">Sales Pipeline</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      {/* Filters */}
      <KanbanFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        jobTypes={jobTypes}
        jobTypeFilter={jobTypeFilter}
        onJobTypeChange={setJobTypeFilter}
        states={states}
        stateFilter={stateFilter}
        onStateChange={setStateFilter}
        totalJobs={jobs.length}
        filteredCount={filteredJobs.length}
      />

      {/* Kanban Board */}
      <main className="flex-1 overflow-hidden">
        {isLoadingData ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <KanbanBoard
            orgId={org.id}
            stages={stages}
            jobs={filteredJobs}
            jobStageMap={jobStageMap}
            isAdmin={isAdmin}
            onRefresh={handleRefresh}
            pipelineType="sales"
          />
        )}
      </main>
    </div>
  )
}

"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2, RefreshCw, DollarSign, TrendingUp, Briefcase, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { NavMenu } from "@/components/navigation/nav-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getStages, getJobStagesForPipeline, initializeDefaultStages, type Stage, type JobStage } from "@/lib/actions/stages"
import { listAllJobs, type HoverJob } from "@/app/actions/hover"

interface PipelineStageData {
  stage: Stage
  jobs: HoverJob[]
  totalValue: number
  weightedValue: number
}

export default function DashboardPage() {
  const { user, org, isLoading } = useAuth()
  const router = useRouter()
  const [salesStages, setSalesStages] = useState<Stage[]>([])
  const [productionStages, setProductionStages] = useState<Stage[]>([])
  const [jobs, setJobs] = useState<HoverJob[]>([])
  const [salesJobStageMap, setSalesJobStageMap] = useState<Record<number, string>>({})
  const [productionJobStageMap, setProductionJobStageMap] = useState<Record<number, string>>({})
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async (orgId: string) => {
    // Initialize default stages if needed
    await initializeDefaultStages(orgId)
    
    // Load all stages (no pipeline type filter to get both)
    const stagesResult = await getStages(orgId)
    if (stagesResult.stages) {
      setSalesStages(stagesResult.stages.filter(s => s.pipeline_type === "sales"))
      setProductionStages(stagesResult.stages.filter(s => s.pipeline_type === "production"))
    }

    // Load jobs from Hover
    const jobsResult = await listAllJobs()
    if (jobsResult.success && jobsResult.jobs) {
      setJobs(jobsResult.jobs)
    }

    // Load job stage assignments for sales pipeline
    const salesJobStagesResult = await getJobStagesForPipeline(orgId, "sales")
    if (salesJobStagesResult.jobStages) {
      const map: Record<number, string> = {}
      salesJobStagesResult.jobStages.forEach((js: JobStage) => {
        if (js.stage_id) {
          map[js.hover_job_id] = js.stage_id
        }
      })
      setSalesJobStageMap(map)
    }

    // Load job stage assignments for production pipeline
    const productionJobStagesResult = await getJobStagesForPipeline(orgId, "production")
    if (productionJobStagesResult.jobStages) {
      const map: Record<number, string> = {}
      productionJobStagesResult.jobStages.forEach((js: JobStage) => {
        if (js.stage_id) {
          map[js.hover_job_id] = js.stage_id
        }
      })
      setProductionJobStageMap(map)
    }

    setIsLoadingData(false)
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

  // Calculate pipeline data
  const getJobValue = (job: HoverJob): number => {
    // Use deliverable_cost or estimate_total as the job value
    return job.deliverable_cost || 0
  }

  const getPipelineData = (stages: Stage[], jobStageMap: Record<number, string>, includeUnassigned: boolean): PipelineStageData[] => {
    return stages.map(stage => {
      const stageJobs = jobs.filter(job => {
        const assignedStageId = jobStageMap[job.id]
        
        if (!assignedStageId) {
          // Unassigned jobs go to first stage only if includeUnassigned is true (sales)
          return includeUnassigned && stage.sort_order === 0
        }
        return assignedStageId === stage.id
      })

      const totalValue = stageJobs.reduce((sum, job) => sum + getJobValue(job), 0)
      const weightedValue = totalValue * (stage.probability / 100)

      return {
        stage,
        jobs: stageJobs,
        totalValue,
        weightedValue
      }
    })
  }

  // Sales: include unassigned jobs in first stage
  // Production: only show jobs explicitly assigned to production stages
  const salesData = getPipelineData(salesStages, salesJobStageMap, true)
  const productionData = getPipelineData(productionStages, productionJobStageMap, false)

  const totalSalesValue = salesData.reduce((sum, d) => sum + d.totalValue, 0)
  const totalWeightedValue = salesData.reduce((sum, d) => sum + d.weightedValue, 0)
  const totalJobs = jobs.length
  const avgDealSize = totalJobs > 0 ? totalSalesValue / totalJobs : 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

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
            <span className="text-sm font-semibold text-foreground">Hover Ninja<sup className="ml-0.5 text-[10px] font-medium text-muted-foreground">ALPHA</sup></span>
          </div>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-sm font-medium text-foreground">Dashboard</h1>
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

      {/* Content */}
      <main className="flex-1 overflow-auto p-4">
        {isLoadingData ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
                  <DollarSign className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalSalesValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {totalJobs} jobs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
                  <TrendingUp className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalWeightedValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Based on probability
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                  <Briefcase className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    Active in pipeline
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
                  <DollarSign className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(avgDealSize)}</div>
                  <p className="text-xs text-muted-foreground">
                    Per job
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sales Pipeline Overview */}
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Sales Pipeline</CardTitle>
                  <CardDescription>Revenue breakdown by stage</CardDescription>
                </div>
                <Link href="/sales">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    View Board
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesData.map((data) => (
                    <div key={data.stage.id} className="space-y-2">
                      {/* Mobile: Stack vertically */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{data.stage.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {data.stage.probability}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <div className="text-sm font-medium">{formatCurrency(data.totalValue)}</div>
                            <div className="text-xs text-muted-foreground">
                              {data.jobs.length} {data.jobs.length === 1 ? "job" : "jobs"}
                            </div>
                          </div>
                          <div className="hidden sm:block">
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(data.weightedValue)}
                            </div>
                            <div className="text-xs text-muted-foreground">weighted</div>
                          </div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                        <div 
                          className="bg-primary transition-all"
                          style={{ 
                            width: totalSalesValue > 0 
                              ? `${(data.totalValue / totalSalesValue) * 100}%` 
                              : '0%' 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Production Pipeline Overview */}
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Production Pipeline</CardTitle>
                  <CardDescription>Job progress through production</CardDescription>
                </div>
                <Link href="/production">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    View Board
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productionData.map((data) => (
                    <div key={data.stage.id} className="space-y-2">
                      {/* Mobile: Stack vertically */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{data.stage.name}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatCurrency(data.totalValue)}</div>
                          <div className="text-xs text-muted-foreground">
                            {data.jobs.length} {data.jobs.length === 1 ? "job" : "jobs"}
                          </div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                        <div 
                          className="bg-chart-2 transition-all"
                          style={{ 
                            width: totalJobs > 0 
                              ? `${(data.jobs.length / totalJobs) * 100}%` 
                              : '0%' 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import {
  getStages,
  initializeDefaultStages,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
  type Stage,
  type PipelineType,
} from "@/lib/actions/stages"
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Link2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Factory,
  Megaphone,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface StepPipelineSetupProps {
  onComplete: () => void
  onBack: () => void
  onSkip: () => void
  enabledFeatures: {
    sales: boolean
    production: boolean
    marketing: boolean
  }
}

export function StepPipelineSetup({ onComplete, onBack, onSkip, enabledFeatures }: StepPipelineSetupProps) {
  const { org } = useAuth()
  const [salesStages, setSalesStages] = useState<Stage[]>([])
  const [productionStages, setProductionStages] = useState<Stage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  // Default to expand sales section so users can see the default stages
  const [expandedSection, setExpandedSection] = useState<"marketing" | "sales" | "production" | null>("sales")

  useEffect(() => {
    async function loadStages() {
      if (!org?.id) return
      setIsLoading(true)
      
      // Initialize default stages if needed
      await initializeDefaultStages(org.id)
      
      // Load stages
      const [salesResult, productionResult] = await Promise.all([
        getStages(org.id, "sales"),
        getStages(org.id, "production"),
      ])
      
      setSalesStages(salesResult.stages)
      setProductionStages(productionResult.stages)
      setIsLoading(false)
    }
    loadStages()
  }, [org?.id])

  const handleAddStage = async (pipelineType: PipelineType) => {
    if (!org?.id) return
    const name = pipelineType === "sales" ? "New Stage" : "New Stage"
    const result = await createStage(org.id, name, pipelineType)
    if (result.stage) {
      if (pipelineType === "sales") {
        setSalesStages(prev => [...prev, result.stage!])
      } else {
        setProductionStages(prev => [...prev, result.stage!])
      }
    }
  }

  const handleUpdateStage = async (stageId: string, updates: Partial<Stage>, pipelineType: PipelineType) => {
    await updateStage(stageId, updates)
    const updateFn = pipelineType === "sales" ? setSalesStages : setProductionStages
    updateFn(prev => prev.map(s => s.id === stageId ? { ...s, ...updates } : s))
  }

  const handleDeleteStage = async (stageId: string, pipelineType: PipelineType) => {
    const stages = pipelineType === "sales" ? salesStages : productionStages
    if (stages.length <= 1) return // Must keep at least one stage
    
    await deleteStage(stageId)
    const updateFn = pipelineType === "sales" ? setSalesStages : setProductionStages
    updateFn(prev => prev.filter(s => s.id !== stageId))
  }

  const handleMoveStage = async (stageId: string, direction: "up" | "down", pipelineType: PipelineType) => {
    const stages = pipelineType === "sales" ? salesStages : productionStages
    const updateFn = pipelineType === "sales" ? setSalesStages : setProductionStages
    
    const idx = stages.findIndex(s => s.id === stageId)
    if (direction === "up" && idx > 0) {
      const newStages = [...stages]
      ;[newStages[idx - 1], newStages[idx]] = [newStages[idx], newStages[idx - 1]]
      updateFn(newStages)
      await reorderStages(newStages.map(s => s.id))
    } else if (direction === "down" && idx < stages.length - 1) {
      const newStages = [...stages]
      ;[newStages[idx], newStages[idx + 1]] = [newStages[idx + 1], newStages[idx]]
      updateFn(newStages)
      await reorderStages(newStages.map(s => s.id))
    }
  }

  const handleContinue = async () => {
    setIsSaving(true)
    onComplete()
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Configure Your Pipelines
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and customize the stages for your sales and production workflows. You can add, remove, rename, or reorder stages below. These can always be adjusted later in Settings.
        </p>
      </div>

      {/* Marketing Section (Coming Soon) */}
      {enabledFeatures.marketing && (
        <PipelineSection
          title="Marketing"
          description="Coming soon - Marketing pipeline stages"
          icon={<Megaphone className="size-4" />}
          expanded={expandedSection === "marketing"}
          onToggle={() => setExpandedSection(expandedSection === "marketing" ? null : "marketing")}
          comingSoon
        >
          <div className="py-6 text-center text-muted-foreground text-sm">
            Marketing pipeline configuration will be available soon.
          </div>
        </PipelineSection>
      )}

      {/* Sales Pipeline Section */}
      {enabledFeatures.sales && (
        <PipelineSection
          title="Sales Pipeline"
          description="Track jobs from lead to approval"
          icon={<TrendingUp className="size-4" />}
          expanded={expandedSection === "sales"}
          onToggle={() => setExpandedSection(expandedSection === "sales" ? null : "sales")}
        >
          <StageList
            stages={salesStages}
            pipelineType="sales"
            linkedStages={productionStages}
            onAdd={() => handleAddStage("sales")}
            onUpdate={(id, updates) => handleUpdateStage(id, updates, "sales")}
            onDelete={(id) => handleDeleteStage(id, "sales")}
            onMove={(id, dir) => handleMoveStage(id, dir, "sales")}
          />
        </PipelineSection>
      )}

      {/* Production Pipeline Section */}
      {enabledFeatures.production && (
        <PipelineSection
          title="Production Pipeline"
          description="Manage jobs through installation"
          icon={<Factory className="size-4" />}
          expanded={expandedSection === "production"}
          onToggle={() => setExpandedSection(expandedSection === "production" ? null : "production")}
        >
          <StageList
            stages={productionStages}
            pipelineType="production"
            linkedStages={salesStages}
            onAdd={() => handleAddStage("production")}
            onUpdate={(id, updates) => handleUpdateStage(id, updates, "production")}
            onDelete={(id) => handleDeleteStage(id, "production")}
            onMove={(id, dir) => handleMoveStage(id, dir, "production")}
          />
        </PipelineSection>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSkip}>
            Skip for now
          </Button>
          <Button onClick={handleContinue} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface PipelineSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  comingSoon?: boolean
  children: React.ReactNode
}

function PipelineSection({ title, description, icon, expanded, onToggle, comingSoon, children }: PipelineSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{title}</span>
              {comingSoon && (
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Coming Soon
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="border-t border-border p-4">{children}</div>}
    </div>
  )
}

interface StageListProps {
  stages: Stage[]
  pipelineType: PipelineType
  linkedStages: Stage[]
  onAdd: () => void
  onUpdate: (id: string, updates: Partial<Stage>) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: "up" | "down") => void
}

function StageList({ stages, pipelineType, linkedStages, onAdd, onUpdate, onDelete, onMove }: StageListProps) {
  return (
    <div className="flex flex-col gap-2">
      {stages.map((stage, idx) => (
        <StageItem
          key={stage.id}
          stage={stage}
          index={idx}
          totalStages={stages.length}
          pipelineType={pipelineType}
          linkedStages={linkedStages}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onMove={onMove}
        />
      ))}
      <Button variant="outline" size="sm" onClick={onAdd} className="mt-1">
        <Plus className="size-4" />
        Add Stage
      </Button>
    </div>
  )
}

interface StageItemProps {
  stage: Stage
  index: number
  totalStages: number
  pipelineType: PipelineType
  linkedStages: Stage[]
  onUpdate: (id: string, updates: Partial<Stage>) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: "up" | "down") => void
}

function StageItem({ stage, index, totalStages, pipelineType, linkedStages, onUpdate, onDelete, onMove }: StageItemProps) {
  // Use local state for the input to avoid issues with async updates
  const [localName, setLocalName] = useState(stage.name)
  
  // Sync local state when stage.name changes from external source
  useEffect(() => {
    setLocalName(stage.name)
  }, [stage.name])

  const handleBlur = () => {
    if (localName !== stage.name) {
      onUpdate(stage.id, { name: localName })
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove(stage.id, "up")}
          disabled={index === 0}
          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => onMove(stage.id, "down")}
          disabled={index === totalStages - 1}
          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ChevronDown className="size-3" />
        </button>
      </div>
      <GripVertical className="size-4 text-muted-foreground" />
      <Input
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={handleBlur}
        className="h-8 flex-1 text-sm"
      />
      {pipelineType === "production" && linkedStages.length > 0 && (
        <Select
          value={stage.linked_stage_id || "none"}
          onValueChange={(value) => onUpdate(stage.id, { linked_stage_id: value === "none" ? null : value })}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <Link2 className="size-3 mr-1" />
            <SelectValue placeholder="Link to sales" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No link</SelectItem>
            {linkedStages.map(ls => (
              <SelectItem key={ls.id} value={ls.id}>{ls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <button
        type="button"
        onClick={() => onDelete(stage.id)}
        disabled={totalStages <= 1}
        className="p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

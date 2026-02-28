"use client"

import { useState, useEffect } from "react"
import { 
  DndContext, 
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent
} from "@dnd-kit/core"
import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2 } from "lucide-react"
import type { Stage, PipelineType } from "@/lib/actions/stages"
import type { HoverJob } from "@/app/actions/hover"
import { updateJobStage, createStage, deleteStage, reorderStages } from "@/lib/actions/stages"

interface KanbanBoardProps {
  orgId: string
  stages: Stage[]
  jobs: HoverJob[]
  jobStageMap: Record<number, string> // hover_job_id -> stage_id
  isAdmin: boolean
  onRefresh: () => void
  pipelineType: PipelineType
}

export function KanbanBoard({ 
  orgId,
  stages: initialStages, 
  jobs, 
  jobStageMap: initialJobStageMap,
  isAdmin,
  onRefresh,
  pipelineType
}: KanbanBoardProps) {
  const [stages, setStages] = useState(initialStages)
  const [jobStageMap, setJobStageMap] = useState(initialJobStageMap)
  const [activeJob, setActiveJob] = useState<HoverJob | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const [isAddingStage, setIsAddingStage] = useState(false)
  const [newStageName, setNewStageName] = useState("")
  const [isCreatingStage, setIsCreatingStage] = useState(false)

  // Update local state when props change
  useEffect(() => {
    setStages(initialStages)
  }, [initialStages])

  useEffect(() => {
    setJobStageMap(initialJobStageMap)
  }, [initialJobStageMap])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  // Get jobs for a specific stage
  const getJobsForStage = (stageId: string) => {
    return jobs.filter(job => {
      const assignedStageId = jobStageMap[job.id]
      // If no assignment, put in first stage
      if (!assignedStageId) {
        return stageId === stages[0]?.id
      }
      return assignedStageId === stageId
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeId = String(active.id)
    
    // Check if dragging a column
    if (activeId.startsWith("column-")) {
      const stageId = activeId.replace("column-", "")
      setActiveColumnId(stageId)
      setActiveJob(null)
    } else {
      // Dragging a job card
      const jobId = Number(active.id)
      const job = jobs.find(j => j.id === jobId)
      if (job) {
        setActiveJob(job)
        setActiveColumnId(null)
      }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    
    // Only handle card drag over (not column)
    if (!activeId.startsWith("column-")) {
      const activeJobId = Number(active.id)
      const overId = String(over.id)

      // Check if we're over a stage column
      const overStage = stages.find(s => s.id === overId)
      if (overStage) {
        // Update local state immediately for visual feedback
        setJobStageMap(prev => ({
          ...prev,
          [activeJobId]: overStage.id
        }))
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveJob(null)
    setActiveColumnId(null)

    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Handle column reordering
    if (activeId.startsWith("column-")) {
      const activeStageId = activeId.replace("column-", "")
      let targetStageId = overId.startsWith("column-") 
        ? overId.replace("column-", "") 
        : overId

      // Find indices
      const activeIndex = stages.findIndex(s => s.id === activeStageId)
      let targetIndex = stages.findIndex(s => s.id === targetStageId)
      
      if (activeIndex === -1 || targetIndex === -1 || activeIndex === targetIndex) return

      // Reorder stages locally
      const newStages = [...stages]
      const [removed] = newStages.splice(activeIndex, 1)
      newStages.splice(targetIndex, 0, removed)
      setStages(newStages)

      // Update in database
      await reorderStages(newStages.map(s => s.id))
      return
    }

    // Handle job card drop
    const activeJobId = Number(active.id)

    // Find the target stage
    let targetStageId: string | null = null
    
    // Check if dropped on a stage column
    const overStage = stages.find(s => s.id === overId)
    if (overStage) {
      targetStageId = overStage.id
    } else {
      // Check if dropped on another job card - get that job's stage
      const overJobId = Number(overId)
      targetStageId = jobStageMap[overJobId] || stages[0]?.id
    }

    if (targetStageId) {
      // Update in database
      const result = await updateJobStage(orgId, activeJobId, targetStageId)
      if (result.error) {
        // Revert on error
        onRefresh()
      }
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    // Find the stage being deleted
    const stageIndex = stages.findIndex(s => s.id === stageId)
    if (stageIndex === -1) return

    // Get jobs in this stage
    const jobsInStage = getJobsForStage(stageId)
    
    // Find the first available stage to move jobs to (prefer previous, then next)
    const targetStage = stages[stageIndex - 1] || stages[stageIndex + 1]
    
    // Move jobs to target stage before deleting
    if (targetStage && jobsInStage.length > 0) {
      for (const job of jobsInStage) {
        await updateJobStage(orgId, job.id, targetStage.id)
      }
    }

    // Delete the stage
    const result = await deleteStage(stageId)
    if (!result.error) {
      // Remove from local state
      setStages(prev => prev.filter(s => s.id !== stageId))
      // Refresh to get updated data
      onRefresh()
    }
  }

  const handleAddStage = async () => {
    if (!newStageName.trim() || isCreatingStage) return
    
    setIsCreatingStage(true)
    const result = await createStage(orgId, newStageName.trim(), pipelineType)
    setIsCreatingStage(false)
    
    if (result.stage) {
      setNewStageName("")
      setIsAddingStage(false)
      onRefresh()
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            jobs={getJobsForStage(stage.id)}
            isAdmin={isAdmin}
            onDeleteStage={handleDeleteStage}
            isDraggingColumn={activeColumnId === stage.id}
          />
        ))}

        {/* Add Stage Button (Admin only) */}
        {isAdmin && (
          <div className="flex-shrink-0 w-72">
            {isAddingStage ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                <Input
                  placeholder="Stage name..."
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddStage()
                    if (e.key === "Escape") {
                      setIsAddingStage(false)
                      setNewStageName("")
                    }
                  }}
                  autoFocus
                  className="mb-2"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleAddStage}
                    disabled={!newStageName.trim() || isCreatingStage}
                  >
                    {isCreatingStage ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setIsAddingStage(false)
                      setNewStageName("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="h-12 w-full border-dashed"
                onClick={() => setIsAddingStage(true)}
              >
                <Plus className="mr-2 size-4" />
                Add Stage
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeJob ? (
          <KanbanCard job={activeJob} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

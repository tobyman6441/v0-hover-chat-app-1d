"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { useDraggable } from "@dnd-kit/core"
import { KanbanCard } from "./kanban-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { MoreVertical, Trash2, GripVertical } from "lucide-react"
import type { Stage } from "@/lib/actions/stages"
import type { HoverJob } from "@/app/actions/hover"

interface KanbanColumnProps {
  stage: Stage
  jobs: HoverJob[]
  isAdmin: boolean
  onDeleteStage?: (stageId: string) => Promise<void>
  isDraggingColumn?: boolean
}

export function KanbanColumn({ stage, jobs, isAdmin, onDeleteStage, isDraggingColumn }: KanbanColumnProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Droppable for cards
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: stage.id,
  })

  // Draggable for column reordering
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({ 
    id: `column-${stage.id}`,
    data: { type: "column", stageId: stage.id }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const handleDelete = async () => {
    if (!onDeleteStage) return
    setIsDeleting(true)
    try {
      await onDeleteStage(stage.id)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <div
        ref={(node) => {
          setDropRef(node)
          setDragRef(node)
        }}
        style={style}
        className={cn(
          "flex h-full w-72 flex-shrink-0 flex-col rounded-lg border border-border bg-muted/30 transition-all",
          isOver && "border-primary/50 bg-primary/5",
          (isDragging || isDraggingColumn) && "opacity-50 rotate-1 shadow-lg z-50"
        )}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Drag handle for column */}
            {isAdmin && (
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
              >
                <GripVertical className="size-4 text-muted-foreground" />
              </div>
            )}
            <h3 className="text-sm font-medium text-foreground">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {jobs.length}
            </Badge>
          </div>
          
          {/* Column actions */}
          {isAdmin && onDeleteStage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete Stage
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Column Content */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-2">
            {jobs.map((job) => (
              <KanbanCard key={job.id} job={job} />
            ))}
          </div>

          {jobs.length === 0 && (
            <div className="flex h-24 items-center justify-center">
              <p className="text-xs text-muted-foreground">
                Drop jobs here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{stage.name}&quot; stage? 
              {jobs.length > 0 && (
                <span className="block mt-2 font-medium text-foreground">
                  This stage contains {jobs.length} job{jobs.length !== 1 ? "s" : ""}. 
                  Jobs will be moved to the first available stage.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Stage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

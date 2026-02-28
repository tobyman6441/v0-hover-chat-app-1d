"use client"

import { useRef } from "react"
import { useDraggable } from "@dnd-kit/core"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Calendar, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { HoverJob } from "@/app/actions/hover"

interface KanbanCardProps {
  job: HoverJob
  isDragging?: boolean
}

export function KanbanCard({ job, isDragging }: KanbanCardProps) {
  const router = useRouter()
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingNow,
  } = useDraggable({ id: job.id })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  // Format address
  const address = job.address 
    ? [job.address.location_line_1, job.address.city, job.address.region].filter(Boolean).join(", ")
    : null

  // Get first image URL if available
  const firstImage = job.images?.[0]?.url || job.images?.[0]?.thumb_url

  // Format date
  const updatedDate = job.updated_at 
    ? new Date(job.updated_at).toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      })
    : null

  // Track mouse position to differentiate click vs drag
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY }
  }

  const handleClick = (e: React.MouseEvent) => {
    // If we dragged more than 5px, don't navigate
    if (dragStartPos.current) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x)
      const dy = Math.abs(e.clientY - dragStartPos.current.y)
      if (dx > 5 || dy > 5) {
        return
      }
    }
    router.push(`/jobs/${job.id}`)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={cn(
        "touch-none cursor-grab active:cursor-grabbing",
        (isDragging || isDraggingNow) && "opacity-50 z-50"
      )}
    >
      <Card 
        className={cn(
          "transition-shadow hover:shadow-md",
          isDraggingNow && "rotate-2 shadow-lg"
        )}
      >
        <CardContent className="p-3">
          {/* Image thumbnail */}
          {firstImage && (
            <div className="mb-2 aspect-video w-full overflow-hidden rounded-md bg-muted">
              <img
                src={firstImage}
                alt={job.name || "Job photo"}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Job name */}
          <h4 className="line-clamp-1 text-sm font-medium text-foreground">
            {job.name || `Job #${job.id}`}
          </h4>

          {/* Address */}
          {address && (
            <div className="mt-1 flex items-start gap-1.5">
              <MapPin className="mt-0.5 size-3 flex-shrink-0 text-muted-foreground" />
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {address}
              </p>
            </div>
          )}

          {/* Job type and date */}
          <div className="mt-2 flex items-center justify-between">
            {job.job_type && (
              <div className="flex items-center gap-1">
                <Home className="size-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {job.job_type}
                </span>
              </div>
            )}
            {updatedDate && (
              <div className="flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {updatedDate}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

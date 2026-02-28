"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface KanbanFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  jobTypes: string[]
  jobTypeFilter: string | null
  onJobTypeChange: (value: string | null) => void
  states: string[]
  stateFilter: string | null
  onStateChange: (value: string | null) => void
  totalJobs: number
  filteredCount: number
}

export function KanbanFilters({
  searchQuery,
  onSearchChange,
  jobTypes,
  jobTypeFilter,
  onJobTypeChange,
  states,
  stateFilter,
  onStateChange,
  totalJobs,
  filteredCount,
}: KanbanFiltersProps) {
  const hasFilters = searchQuery || jobTypeFilter || stateFilter

  const clearFilters = () => {
    onSearchChange("")
    onJobTypeChange(null)
    onStateChange(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search jobs..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Job Type Filter */}
      {jobTypes.length > 0 && (
        <Select
          value={jobTypeFilter || "all"}
          onValueChange={(value) => onJobTypeChange(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Job Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Job Types</SelectItem>
            {jobTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* State Filter */}
      {states.length > 0 && (
        <Select
          value={stateFilter || "all"}
          onValueChange={(value) => onStateChange(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {states.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 text-muted-foreground"
        >
          <X className="mr-1 size-4" />
          Clear
        </Button>
      )}

      {/* Results Count */}
      <span className="ml-auto text-sm text-muted-foreground">
        {filteredCount === totalJobs
          ? `${totalJobs} jobs`
          : `${filteredCount} of ${totalJobs} jobs`}
      </span>
    </div>
  )
}

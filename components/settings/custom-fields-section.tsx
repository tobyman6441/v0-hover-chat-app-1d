"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  reorderCustomFields,
  type CustomField,
  type FieldType,
  type AppliesTo,
  type FieldOption,
} from "@/lib/actions/custom-fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
  X,
  Check,
  Loader2,
  GripVertical,
  Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string; description: string }[] = [
  { value: "text", label: "Text", description: "Short single-line text" },
  { value: "paragraph", label: "Paragraph", description: "Multi-line text" },
  { value: "number", label: "Number", description: "Numeric value" },
  { value: "boolean", label: "Toggle", description: "Yes / No switch" },
  { value: "select", label: "Dropdown", description: "Single choice from a list" },
  { value: "multi_select", label: "Multi-select", description: "Multiple choices from a list" },
  { value: "date", label: "Date", description: "Date picker" },
  { value: "url", label: "URL", description: "Web link" },
  { value: "email", label: "Email", description: "Email address" },
  { value: "phone", label: "Phone", description: "Phone number" },
]

const APPLIES_TO_OPTIONS: { value: AppliesTo; label: string }[] = [
  { value: "jobs", label: "Jobs" },
  { value: "leads", label: "Leads" },
  { value: "both", label: "Jobs & Leads" },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldTypeBadge({ type }: { type: FieldType }) {
  const def = FIELD_TYPES.find((t) => t.value === type)
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {def?.label ?? type}
    </span>
  )
}

function AppliesToBadge({ appliesTo }: { appliesTo: AppliesTo }) {
  const def = APPLIES_TO_OPTIONS.find((a) => a.value === appliesTo)
  return (
    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
      {def?.label ?? appliesTo}
    </span>
  )
}

// Options editor used by both create and edit forms
function OptionsEditor({
  options,
  onChange,
}: {
  options: FieldOption[]
  onChange: (opts: FieldOption[]) => void
}) {
  const [newLabel, setNewLabel] = useState("")

  function addOption() {
    const label = newLabel.trim()
    if (!label) return
    const value = label.toLowerCase().replace(/[^a-z0-9]+/g, "_")
    onChange([...options, { label, value }])
    setNewLabel("")
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt, i) => (
          <span
            key={i}
            className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs"
          >
            {opt.label}
            <button
              type="button"
              onClick={() => removeOption(i)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Add option…"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addOption() }
          }}
          className="h-8 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// Inline create form
function CreateFieldForm({ onCreated, onCancel }: { onCreated: (f: CustomField) => void; onCancel: () => void }) {
  const [name, setName] = useState("")
  const [fieldType, setFieldType] = useState<FieldType>("text")
  const [appliesTo, setAppliesTo] = useState<AppliesTo>("jobs")
  const [options, setOptions] = useState<FieldOption[]>([])
  const [isRequired, setIsRequired] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsOptions = fieldType === "select" || fieldType === "multi_select"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Name is required"); return }
    if (needsOptions && options.length === 0) { setError("Add at least one option"); return }
    setIsSaving(true)
    setError(null)
    const result = await createCustomField({
      name,
      field_type: fieldType,
      applies_to: appliesTo,
      options: needsOptions ? options : undefined,
      is_required: isRequired,
    })
    setIsSaving(false)
    if (result.error) { setError(result.error); return }
    onCreated(result.field!)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-muted/40 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">New custom field</p>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Field name</Label>
          <Input
            placeholder="e.g. Roof material"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={fieldType} onValueChange={(v) => setFieldType(v as FieldType)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="font-medium">{t.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{t.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Show on</Label>
            <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as AppliesTo)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLIES_TO_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {needsOptions && (
          <div className="space-y-1">
            <Label className="text-xs">Options</Label>
            <OptionsEditor options={options} onChange={setOptions} />
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={isRequired}
            onClick={() => setIsRequired(!isRequired)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              isRequired ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                isRequired ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
          <Label className="cursor-pointer text-xs" onClick={() => setIsRequired(!isRequired)}>
            Required field
          </Label>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Create field
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}

// Inline edit form
function EditFieldForm({
  field,
  onSaved,
  onCancel,
}: {
  field: CustomField
  onSaved: (f: CustomField) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(field.name)
  const [appliesTo, setAppliesTo] = useState<AppliesTo>(field.applies_to)
  const [options, setOptions] = useState<FieldOption[]>(field.options ?? [])
  const [isRequired, setIsRequired] = useState(field.is_required)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsOptions = field.field_type === "select" || field.field_type === "multi_select"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Name is required"); return }
    if (needsOptions && options.length === 0) { setError("Add at least one option"); return }
    setIsSaving(true)
    setError(null)
    const result = await updateCustomField(field.id, {
      name,
      applies_to: appliesTo,
      options: needsOptions ? options : [],
      is_required: isRequired,
    })
    setIsSaving(false)
    if (result.error) { setError(result.error); return }
    onSaved({ ...field, name, applies_to: appliesTo, options: needsOptions ? options : null, is_required: isRequired })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 rounded-lg border border-border bg-muted/40 p-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Field name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Show on</Label>
          <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as AppliesTo)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPLIES_TO_OPTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {needsOptions && (
          <div className="space-y-1">
            <Label className="text-xs">Options</Label>
            <OptionsEditor options={options} onChange={setOptions} />
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={isRequired}
            onClick={() => setIsRequired(!isRequired)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              isRequired ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                isRequired ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
          <Label className="cursor-pointer text-xs" onClick={() => setIsRequired(!isRequired)}>
            Required field
          </Label>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}

// Single field row
function FieldRow({
  field,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdited,
  onDeleted,
}: {
  field: CustomField
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onEdited: (f: CustomField) => void
  onDeleted: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setIsDeleting(true)
    await deleteCustomField(field.id)
    onDeleted()
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Reorder arrows */}
        <div className="flex flex-col">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-20"
            aria-label="Move up"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-20"
            aria-label="Move down"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>

        <GripVertical className="size-3.5 shrink-0 text-muted-foreground/30" />

        {/* Info */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{field.name}</span>
          {field.is_required && (
            <span className="shrink-0 text-xs text-destructive">*</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <FieldTypeBadge type={field.field_type} />
          <AppliesToBadge appliesTo={field.applies_to} />
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => { setIsEditing(!isEditing); setConfirmDelete(false) }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              "text-muted-foreground",
              confirmDelete ? "text-destructive hover:text-destructive" : "hover:text-destructive"
            )}
          >
            {isDeleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </Button>
          {confirmDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setConfirmDelete(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {confirmDelete && !isDeleting && (
        <div className="border-t border-border px-3 py-2">
          <p className="text-xs text-destructive">
            Delete &quot;{field.name}&quot;? This will remove all stored values. Click the trash icon again to confirm.
          </p>
        </div>
      )}

      {isEditing && (
        <div className="border-t border-border px-3 pb-3 pt-2">
          <EditFieldForm
            field={field}
            onSaved={(updated) => { onEdited(updated); setIsEditing(false) }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {field.options && field.options.length > 0 && !isEditing && (
        <div className="border-t border-border px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {field.options.map((opt) => (
              <span key={opt.value} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {opt.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CustomFieldsSection() {
  const [fields, setFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    const result = await getCustomFields()
    setFields(result.fields)
    setIsLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function moveField(index: number, direction: "up" | "down") {
    const newFields = [...fields]
    const swapIndex = direction === "up" ? index - 1 : index + 1
    ;[newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]]
    setFields(newFields)
    await reorderCustomFields(newFields.map((f) => f.id))
  }

  function handleCreated(field: CustomField) {
    setFields((prev) => [...prev, field])
    setShowCreate(false)
  }

  function handleEdited(updated: CustomField) {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
  }

  function handleDeleted(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="size-4" />
          Custom Fields
        </CardTitle>
        <CardDescription>
          Define custom fields that appear on job and lead detail pages. Drag to reorder.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : fields.length === 0 && !showCreate ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No custom fields yet. Create one to start tracking additional data on your jobs and leads.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {fields.map((field, i) => (
              <FieldRow
                key={field.id}
                field={field}
                isFirst={i === 0}
                isLast={i === fields.length - 1}
                onMoveUp={() => moveField(i, "up")}
                onMoveDown={() => moveField(i, "down")}
                onEdited={handleEdited}
                onDeleted={() => handleDeleted(field.id)}
              />
            ))}
          </div>
        )}

        {showCreate ? (
          <CreateFieldForm
            onCreated={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="size-4" />
            Add custom field
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

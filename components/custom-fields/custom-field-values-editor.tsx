"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getCustomFields,
  getCustomFieldValues,
  setCustomFieldValue,
  type CustomField,
  type AppliesTo,
} from "@/lib/actions/custom-fields"
import { Loader2, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  entityType: "job" | "lead"
  entityId: string
  /** Filter: only show fields that apply to this entity type */
  appliesTo: AppliesTo
}

// ─── Individual field input ───────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onSave,
}: {
  field: CustomField
  value: unknown
  onSave: (v: unknown) => Promise<void>
}) {
  const [localValue, setLocalValue] = useState<unknown>(value ?? null)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  // Keep in sync when parent value changes (e.g. initial load)
  useEffect(() => { setLocalValue(value ?? null) }, [value])

  async function commitSave(v: unknown) {
    setIsSaving(true)
    await onSave(v)
    setIsSaving(false)
  }

  function handleChange(v: unknown) {
    setLocalValue(v)
    // Debounce text saves; immediate for other types
    if (field.field_type === "text" || field.field_type === "paragraph" ||
        field.field_type === "number" || field.field_type === "url" ||
        field.field_type === "email" || field.field_type === "phone") {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => commitSave(v), 600)
    } else {
      commitSave(v)
    }
  }

  const baseInput = "h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/30"

  switch (field.field_type) {
    case "boolean":
      return (
        <button
          type="button"
          role="switch"
          aria-checked={!!localValue}
          onClick={() => handleChange(!localValue)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            localValue ? "bg-primary" : "bg-muted-foreground/30"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
              localValue ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
      )

    case "select":
      return (
        <select
          value={(localValue as string) ?? ""}
          onChange={(e) => handleChange(e.target.value || null)}
          className={cn(baseInput, "pr-8")}
        >
          <option value="">— select —</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )

    case "multi_select": {
      const selected: string[] = Array.isArray(localValue) ? (localValue as string[]) : []
      function toggleOption(v: string) {
        const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]
        handleChange(next.length > 0 ? next : null)
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {(field.options ?? []).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleOption(opt.value)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                selected.includes(opt.value)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )
    }

    case "paragraph":
      return (
        <textarea
          value={(localValue as string) ?? ""}
          onChange={(e) => handleChange(e.target.value || null)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/30 resize-none"
          placeholder={`Enter ${field.name.toLowerCase()}…`}
        />
      )

    case "date":
      return (
        <input
          type="date"
          value={(localValue as string) ?? ""}
          onChange={(e) => handleChange(e.target.value || null)}
          className={baseInput}
        />
      )

    case "number":
      return (
        <input
          type="number"
          value={(localValue as string) ?? ""}
          onChange={(e) => handleChange(e.target.value || null)}
          className={baseInput}
          placeholder="0"
        />
      )

    default:
      // text, url, email, phone
      return (
        <input
          type={field.field_type === "url" ? "url" : field.field_type === "email" ? "email" : "text"}
          value={(localValue as string) ?? ""}
          onChange={(e) => handleChange(e.target.value || null)}
          className={baseInput}
          placeholder={`Enter ${field.name.toLowerCase()}…`}
        />
      )
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CustomFieldValuesEditor({ entityType, entityId, appliesTo }: Props) {
  const [fields, setFields] = useState<CustomField[]>([])
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    const [fieldsResult, valuesResult] = await Promise.all([
      getCustomFields(appliesTo),
      getCustomFieldValues(entityType, entityId),
    ])
    setFields(fieldsResult.fields)
    setValues(valuesResult.values)
    setIsLoading(false)
  }, [entityType, entityId, appliesTo])

  useEffect(() => { load() }, [load])

  async function handleSave(fieldId: string, value: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    await setCustomFieldValue(fieldId, entityType, entityId, value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading custom fields…
      </div>
    )
  }

  if (fields.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Settings2 className="size-3.5" />
        Custom fields
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.id}
            className={cn(
              "space-y-1",
              field.field_type === "paragraph" && "sm:col-span-2",
              field.field_type === "multi_select" && "sm:col-span-2",
            )}
          >
            <label className="flex items-center gap-1 text-xs font-medium text-foreground">
              {field.name}
              {field.is_required && <span className="text-destructive">*</span>}
            </label>
            <FieldInput
              field={field}
              value={values[field.id] ?? null}
              onSave={(v) => handleSave(field.id, v)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

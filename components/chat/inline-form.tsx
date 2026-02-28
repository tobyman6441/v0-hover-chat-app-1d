"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Send } from "lucide-react"

export interface FormField {
  id?: string
  name?: string // Alternative to id
  label: string
  type: "text" | "textarea" | "select" | "email" | "number" | "toggle" | "tel"
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  description?: string // For toggle fields, shows below the label
}

// Helper to get field identifier
function getFieldId(field: FormField): string {
  return field.id || field.name || field.label.toLowerCase().replace(/\s+/g, "_")
}

export interface InlineFormData {
  title: string
  description?: string
  fields: FormField[]
  action?: string // Action identifier for form submission handling
}

interface InlineFormProps {
  form: InlineFormData
  onSubmit: (values: Record<string, string>) => void
  disabled?: boolean
}

export function InlineForm({ form, onSubmit, disabled }: InlineFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check required fields
    const missingRequired = form.fields
      .filter((f) => f.required && !values[getFieldId(f)]?.trim())
      .map((f) => f.label)
    
    if (missingRequired.length > 0) {
      return
    }

    setSubmitted(true)
    onSubmit(values)
  }

  const isValid = form.fields
    .filter((f) => f.required)
    .every((f) => values[getFieldId(f)]?.trim())

  if (submitted) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-muted-foreground">
          Form submitted successfully
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="space-y-1">
        <h3 className="font-medium text-foreground">{form.title}</h3>
        {form.description && (
          <p className="text-sm text-muted-foreground">{form.description}</p>
        )}
      </div>

      <div className="space-y-3">
        {form.fields.map((field) => {
          const fieldId = getFieldId(field)
          return (
          <div key={fieldId} className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-sm">
              {field.label}
              {field.required && !field.label.includes("*") && <span className="ml-1 text-destructive">*</span>}
            </Label>

            {field.type === "toggle" ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">{field.placeholder || field.label}</span>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
                <Switch
                  id={fieldId}
                  checked={values[fieldId] === "true"}
                  onCheckedChange={(checked) => handleChange(fieldId, checked ? "true" : "false")}
                  disabled={disabled}
                />
              </div>
            ) : field.type === "textarea" ? (
              <Textarea
                id={fieldId}
                placeholder={field.placeholder}
                value={values[fieldId] || ""}
                onChange={(e) => handleChange(fieldId, e.target.value)}
                disabled={disabled}
                className="min-h-[80px] resize-none"
              />
            ) : field.type === "select" && field.options ? (
              <Select
                value={values[fieldId] || ""}
                onValueChange={(value) => handleChange(fieldId, value)}
                disabled={disabled}
              >
                <SelectTrigger id={fieldId}>
                  <SelectValue placeholder={field.placeholder || "Select..."} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={fieldId}
                type={field.type === "tel" ? "tel" : field.type}
                placeholder={field.placeholder}
                value={values[fieldId] || ""}
                onChange={(e) => handleChange(fieldId, e.target.value)}
                disabled={disabled}
              />
            )}
          </div>
        )})}
      </div>

      <Button
        type="submit"
        disabled={disabled || !isValid}
        className="w-full"
        size="sm"
      >
        <Send className="mr-2 size-4" />
        Submit
      </Button>
    </form>
  )
}

// Parse form data from AI message text
export function parseFormFromText(text: string): {
  form: InlineFormData | null
  textBefore: string
  textAfter: string
} {
  const formRegex = /\[FORM\]([\s\S]*?)\[\/FORM\]/
  const match = text.match(formRegex)

  if (!match) {
    return { form: null, textBefore: text, textAfter: "" }
  }

  try {
    const formJson = match[1].trim()
    const form = JSON.parse(formJson) as InlineFormData
    
    const parts = text.split(formRegex)
    return {
      form,
      textBefore: parts[0]?.trim() || "",
      textAfter: parts[2]?.trim() || "",
    }
  } catch {
    return { form: null, textBefore: text, textAfter: "" }
  }
}

// Format form values as a readable message
export function formatFormValues(
  form: InlineFormData,
  values: Record<string, string>
): string {
  const lines = form.fields
    .filter((f) => values[getFieldId(f)]?.trim())
    .map((f) => `${f.label.replace(" *", "")}: ${values[getFieldId(f)]}`)

  return `Here are the details:\n${lines.join("\n")}`
}

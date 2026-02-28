"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Send, Loader2 } from "lucide-react"
import { listHoverUsers, type HoverUser } from "@/app/actions/hover"

interface CaptureRequestFormProps {
  onSubmit: (values: Record<string, string>) => void
  disabled?: boolean
}

export function CaptureRequestForm({ onSubmit, disabled }: CaptureRequestFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [users, setUsers] = useState<HoverUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [capturerType, setCapturerType] = useState<"internal" | "external">("external")

  useEffect(() => {
    async function fetchUsers() {
      setLoadingUsers(true)
      const result = await listHoverUsers()
      if (result.success && result.users) {
        setUsers(result.users)
      }
      setLoadingUsers(false)
    }
    fetchUsers()
  }, [])

  // When capturer type changes, update form values accordingly
  useEffect(() => {
    if (capturerType === "internal") {
      // Auto-set to professional for internal users
      setValues(prev => ({ ...prev, signup_type: "pro" }))
    }
  }, [capturerType])

  // When internal user is selected, auto-fill their details
  const handleInternalUserSelect = (userId: string) => {
    const selectedUser = users.find(u => u.id.toString() === userId)
    if (selectedUser) {
      setValues(prev => ({
        ...prev,
        capturing_user_id: userId,
        capturing_user_name: selectedUser.name || `${selectedUser.first_name} ${selectedUser.last_name}`.trim(),
        capturing_user_email: selectedUser.email,
        signup_type: "pro", // Always professional for internal users
      }))
    }
  }

  const handleChange = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check required fields
    if (!values.capturing_user_name?.trim() || 
        !values.capturing_user_email?.trim() || 
        !values.location_line_1?.trim()) {
      return
    }

    setSubmitted(true)
    onSubmit(values)
  }

  const isValid = 
    values.capturing_user_name?.trim() && 
    values.capturing_user_email?.trim() && 
    values.location_line_1?.trim()

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
        <h3 className="font-medium text-foreground">Create Capture Request</h3>
        <p className="text-sm text-muted-foreground">
          This will create a draft job and send an invitation to capture the property.
        </p>
      </div>

      <div className="space-y-3">
        {/* Assign To User */}
        <div className="space-y-1.5">
          <Label htmlFor="assign_to_user_id" className="text-sm">
            Assign Job To
          </Label>
          {loadingUsers ? (
            <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading users...
            </div>
          ) : (
            <Select
              value={values.assign_to_user_id || "default"}
              onValueChange={(value) => handleChange("assign_to_user_id", value === "default" ? "" : value)}
              disabled={disabled}
            >
              <SelectTrigger id="assign_to_user_id">
                <SelectValue placeholder="Default (authenticated user)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (authenticated user)</SelectItem>
                {users.filter(user => user.id).map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Capturer Type Toggle */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            Who will capture? <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={capturerType === "internal" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                setCapturerType("internal")
                // Clear external user fields when switching
                setValues(prev => ({
                  ...prev,
                  capturing_user_name: "",
                  capturing_user_email: "",
                  capturing_user_id: "",
                  signup_type: "pro",
                }))
              }}
              disabled={disabled}
            >
              Internal User
            </Button>
            <Button
              type="button"
              variant={capturerType === "external" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                setCapturerType("external")
                // Clear internal user fields when switching
                setValues(prev => ({
                  ...prev,
                  capturing_user_name: "",
                  capturing_user_email: "",
                  capturing_user_id: "",
                  signup_type: "homeowner",
                }))
              }}
              disabled={disabled}
            >
              External Person
            </Button>
          </div>
        </div>

        {/* Internal User Selection */}
        {capturerType === "internal" && (
          <div className="space-y-1.5">
            <Label htmlFor="capturing_user_id" className="text-sm">
              Select Team Member <span className="text-destructive">*</span>
            </Label>
            {loadingUsers ? (
              <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading users...
              </div>
            ) : (
              <Select
                value={values.capturing_user_id || ""}
                onValueChange={handleInternalUserSelect}
                disabled={disabled}
              >
                <SelectTrigger id="capturing_user_id">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(user => user.id).map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {values.capturing_user_email && (
              <p className="text-xs text-muted-foreground">
                Invitation will be sent to: {values.capturing_user_email}
              </p>
            )}
          </div>
        )}

        {/* External User Fields */}
        {capturerType === "external" && (
          <>
            {/* Capturer Name */}
            <div className="space-y-1.5">
              <Label htmlFor="capturing_user_name" className="text-sm">
                Capturer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="capturing_user_name"
                type="text"
                placeholder="Full name of person who will capture"
                value={values.capturing_user_name || ""}
                onChange={(e) => handleChange("capturing_user_name", e.target.value)}
                disabled={disabled}
              />
            </div>

            {/* Capturer Email and Type in a row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="capturing_user_email" className="text-sm">
                  Capturer Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="capturing_user_email"
                  type="email"
                  placeholder="email@example.com"
                  value={values.capturing_user_email || ""}
                  onChange={(e) => handleChange("capturing_user_email", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup_type" className="text-sm">
                  Capturer Type
                </Label>
                <Select
                  value={values.signup_type || "homeowner"}
                  onValueChange={(value) => handleChange("signup_type", value)}
                  disabled={disabled}
                >
                  <SelectTrigger id="signup_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homeowner">Homeowner</SelectItem>
                    <SelectItem value="pro">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* Capturer Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="capturing_user_phone" className="text-sm">
            Capturer Phone (for SMS)
          </Label>
          <Input
            id="capturing_user_phone"
            type="tel"
            placeholder="Required if you want SMS notification sent"
            value={values.capturing_user_phone || ""}
            onChange={(e) => handleChange("capturing_user_phone", e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Street Address */}
        <div className="space-y-1.5">
          <Label htmlFor="location_line_1" className="text-sm">
            Street Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="location_line_1"
            type="text"
            placeholder="123 Main Street"
            value={values.location_line_1 || ""}
            onChange={(e) => handleChange("location_line_1", e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label htmlFor="location_city" className="text-sm">
            City
          </Label>
          <Input
            id="location_city"
            type="text"
            placeholder="Denver"
            value={values.location_city || ""}
            onChange={(e) => handleChange("location_city", e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* State and ZIP in a row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="location_region" className="text-sm">
              State
            </Label>
            <Input
              id="location_region"
              type="text"
              placeholder="CO"
              value={values.location_region || ""}
              onChange={(e) => handleChange("location_region", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location_postal_code" className="text-sm">
              ZIP Code
            </Label>
            <Input
              id="location_postal_code"
              type="text"
              placeholder="80204"
              value={values.location_postal_code || ""}
              onChange={(e) => handleChange("location_postal_code", e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Job Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm">
            Job Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Defaults to address if not provided"
            value={values.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Deliverable Type */}
        <div className="space-y-1.5">
          <Label htmlFor="deliverable_id" className="text-sm">
            Deliverable Type
          </Label>
          <Select
            value={values.deliverable_id || "3"}
            onValueChange={(value) => handleChange("deliverable_id", value)}
            disabled={disabled}
          >
            <SelectTrigger id="deliverable_id">
              <SelectValue placeholder="Select deliverable type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Complete Exterior (default)</SelectItem>
              <SelectItem value="2">Roof Only</SelectItem>
              <SelectItem value="7">Photos Only</SelectItem>
              <SelectItem value="8">Interior</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        disabled={disabled || !isValid}
        className="w-full"
        size="sm"
      >
        <Send className="mr-2 size-4" />
        Create Capture Request
      </Button>
    </form>
  )
}

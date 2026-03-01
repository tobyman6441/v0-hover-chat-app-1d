"use client"

import { useState } from "react"
import { MessageCircle, Bug, Lightbulb, HelpCircle, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Image from "next/image"
import { submitFeedback, type FeedbackType, type FeedbackUrgency } from "@/app/actions/feedback"

const FEEDBACK_CATEGORIES = [
  {
    id: "bug" as const,
    label: "Bug Report",
    description: "Something isn't working correctly",
    icon: Bug,
  },
  {
    id: "feature" as const,
    label: "Feature Request",
    description: "I'd like to suggest an improvement",
    icon: Lightbulb,
  },
  {
    id: "question" as const,
    label: "Question",
    description: "I need help with something",
    icon: HelpCircle,
  },
  {
    id: "general" as const,
    label: "General Feedback",
    description: "Other comments or suggestions",
    icon: MessageCircle,
  },
]

const URGENCY_OPTIONS = [
  { value: "blocker", label: "Blocker to existing usage" },
  { value: "adoption_blocker", label: "Ok for now, but blocker to full adoption" },
  { value: "improvement", label: "Improvement to experience" },
  { value: "idea", label: "Just a cool idea" },
]

export default function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackType | "">("")
  const [urgency, setUrgency] = useState<FeedbackUrgency>(null)
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!category || !message.trim()) return

    setIsSubmitting(true)
    setError(null)

    // Gather troubleshooting data
    const troubleshootingData = {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
      url: typeof window !== "undefined" ? (window.opener?.location?.href || document.referrer || window.location.origin) : "Unknown",
      screenSize: typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "Unknown",
      viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "Unknown",
      language: typeof navigator !== "undefined" ? navigator.language : "Unknown",
    }

    // Save to database
    const result = await submitFeedback({
      feedbackType: category,
      urgency,
      message: message.trim(),
      url: troubleshootingData.url,
      userAgent: troubleshootingData.userAgent,
      screenSize: troubleshootingData.screenSize,
      viewport: troubleshootingData.viewport,
      language: troubleshootingData.language,
    })

    if (!result.success) {
      setError(result.error || "Failed to submit feedback. Please try again.")
      setIsSubmitting(false)
      return
    }

    // Build email with all data
    const categoryLabel = FEEDBACK_CATEGORIES.find(c => c.id === category)?.label || "General Feedback"
    const urgencyLabel = urgency ? URGENCY_OPTIONS.find(u => u.value === urgency)?.label : "Not specified"
    
    const subject = encodeURIComponent(`[${categoryLabel}] Hover Ninja Feedback`)
    
    const body = encodeURIComponent(
`FEEDBACK TYPE: ${categoryLabel}
URGENCY: ${urgencyLabel}

MESSAGE:
${message.trim()}

---
Troubleshooting Information (please don't delete):
- Timestamp: ${troubleshootingData.timestamp}
- URL: ${troubleshootingData.url}
- Browser: ${troubleshootingData.userAgent}
- Screen Size: ${troubleshootingData.screenSize}
- Viewport: ${troubleshootingData.viewport}
- Language: ${troubleshootingData.language}
`
    )

    setIsSubmitting(false)
    // Open email client with pre-populated data
    window.location.href = `mailto:support@hover.ninja?subject=${subject}&body=${body}`
  }

  const isValid = category && message.trim().length > 0

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Hover Ninja"
              width={48}
              height={48}
              className="rounded-lg"
            />
          </div>
          <CardTitle className="text-xl">Send Feedback</CardTitle>
          <CardDescription>
            Help us improve Hover Ninja by sharing your thoughts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback Type - Required */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                What type of feedback do you have? <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={category}
                onValueChange={(value) => setCategory(value as FeedbackType)}
                className="grid grid-cols-2 gap-3"
              >
                {FEEDBACK_CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <Label
                      key={cat.id}
                      htmlFor={cat.id}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                        category === cat.id
                          ? "border-primary bg-primary/5"
                          : "border-muted"
                      }`}
                    >
                      <RadioGroupItem value={cat.id} id={cat.id} className="sr-only" />
                      <Icon className={`h-5 w-5 ${category === cat.id ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium text-center">{cat.label}</span>
                    </Label>
                  )
                })}
              </RadioGroup>
            </div>

            {/* Urgency - Optional */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Urgency <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Select 
                value={urgency || ""} 
                onValueChange={(v) => setUrgency(v as FeedbackUrgency || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency level..." />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message - Required */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">
                Your message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                placeholder="Tell us what's on your mind..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Continue to Email
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your feedback will be saved and your email client will open with pre-filled details.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

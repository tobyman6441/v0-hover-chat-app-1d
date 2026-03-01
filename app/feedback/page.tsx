"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Send, Bug, Lightbulb, HelpCircle, MessageSquare, Loader2 } from "lucide-react"
import Image from "next/image"

const feedbackTypes = [
  { value: "bug", label: "Bug Report", icon: Bug, description: "Something isn't working" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, description: "I have an idea" },
  { value: "question", label: "Question", icon: HelpCircle, description: "I need help" },
  { value: "general", label: "General Feedback", icon: MessageSquare, description: "Other feedback" },
]

// Loading fallback component
function FeedbackLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>Loading feedback form...</span>
      </div>
    </div>
  )
}

// Main page wrapper with Suspense
export default function FeedbackPage() {
  return (
    <Suspense fallback={<FeedbackLoading />}>
      <FeedbackForm />
    </Suspense>
  )
}

// Actual feedback form that uses useSearchParams
function FeedbackForm() {
  const searchParams = useSearchParams()
  const context = searchParams.get("context") || ""
  const page = searchParams.get("page") || "/"
  
  const [feedbackType, setFeedbackType] = useState("general")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Generate a descriptive subject prefix based on feedback type and page
  const getSubjectPrefix = () => {
    const typeLabel = feedbackTypes.find(t => t.value === feedbackType)?.label || "Feedback"
    const pageName = page === "/" ? "Home" : page.split("/").filter(Boolean).join(" > ")
    return `[${typeLabel}] ${pageName}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Build the full email body with context
    const fullSubject = `${getSubjectPrefix()}${subject ? `: ${subject}` : ""}`
    const fullBody = [
      message,
      "",
      "---",
      "Technical Details (for troubleshooting):",
      context,
      "",
      `Feedback Type: ${feedbackTypes.find(t => t.value === feedbackType)?.label}`,
      email ? `Reply-to: ${email}` : "No email provided",
    ].join("\n")

    // Create mailto link and open it
    const mailtoLink = `mailto:support@hover.ninja?subject=${encodeURIComponent(fullSubject)}&body=${encodeURIComponent(fullBody)}`
    
    // Open the mailto link
    window.location.href = mailtoLink
    
    // Show success state after a brief delay
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 500)
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Thank You!</h2>
            <p className="mb-6 text-muted-foreground">
              Your email client should have opened with your feedback. Please send the email to complete your submission.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.close()}>
                Close Window
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setIsSubmitted(false)
                  setMessage("")
                  setSubject("")
                }}
              >
                Send More Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Image
            src="/images/hover-ninja-logo.png"
            alt="Hover Ninja"
            width={40}
            height={40}
            className="size-10"
          />
          <div>
            <h1 className="text-lg font-semibold">
              Hover Ninja<sup className="ml-0.5 text-[10px] font-medium text-muted-foreground">ALPHA</sup> Feedback
            </h1>
            <p className="text-sm text-muted-foreground">Help us improve your experience</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type */}
          <div className="space-y-3">
            <Label>What type of feedback do you have?</Label>
            <RadioGroup
              value={feedbackType}
              onValueChange={setFeedbackType}
              className="grid grid-cols-2 gap-3"
            >
              {feedbackTypes.map((type) => {
                const Icon = type.icon
                return (
                  <label
                    key={type.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent ${
                      feedbackType === type.value ? "border-primary bg-accent" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value={type.value} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </label>
                )
              })}
            </RadioGroup>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject (optional)</Label>
            <Input
              id="subject"
              placeholder="Brief summary of your feedback"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Your feedback *</Label>
            <Textarea
              id="message"
              placeholder="Please describe your feedback in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Your email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="we@can-reply.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If you{"'"}d like us to follow up with you
            </p>
          </div>

          {/* Context indicator */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Page context:</span> {page || "/"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Technical details will be automatically included to help with troubleshooting.
            </p>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isSubmitting || !message.trim()}>
            {isSubmitting ? (
              <>Preparing email...</>
            ) : (
              <>
                <Send className="mr-2 size-4" />
                Send Feedback
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

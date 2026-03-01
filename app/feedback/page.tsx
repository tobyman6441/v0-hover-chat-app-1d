"use client"

import { useState } from "react"
import { MessageCircle, Bug, Lightbulb, HelpCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

const FEEDBACK_CATEGORIES = [
  {
    id: "bug",
    label: "Bug Report",
    description: "Something isn't working correctly",
    icon: Bug,
  },
  {
    id: "feature",
    label: "Feature Request",
    description: "I'd like to suggest an improvement",
    icon: Lightbulb,
  },
  {
    id: "question",
    label: "Question",
    description: "I need help with something",
    icon: HelpCircle,
  },
  {
    id: "general",
    label: "General Feedback",
    description: "Other comments or suggestions",
    icon: MessageCircle,
  },
]

export default function FeedbackPage() {
  const [category, setCategory] = useState("general")
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Gather troubleshooting data
    const troubleshootingData = {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
      url: typeof window !== "undefined" ? window.location.origin : "Unknown",
      screenSize: typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "Unknown",
      viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "Unknown",
      language: typeof navigator !== "undefined" ? navigator.language : "Unknown",
    }

    const categoryLabel = FEEDBACK_CATEGORIES.find(c => c.id === category)?.label || "General Feedback"
    
    const subject = encodeURIComponent(`[${categoryLabel}] Hover Ninja Feedback`)
    
    const body = encodeURIComponent(
`Category: ${categoryLabel}

Message:
${message}

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

    // Open email client with pre-populated data
    window.location.href = `mailto:support@hover.ninja?subject=${subject}&body=${body}`
  }

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
            <div className="space-y-3">
              <Label className="text-sm font-medium">What type of feedback do you have?</Label>
              <RadioGroup
                value={category}
                onValueChange={setCategory}
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

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">
                Your message
              </Label>
              <Textarea
                id="message"
                placeholder="Tell us what's on your mind..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="resize-none"
                required
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={!message.trim()}>
              <Send className="h-4 w-4" />
              Continue to Email
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This will open your email client with your feedback pre-filled.
              <br />
              We'll also include some technical details to help us troubleshoot.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

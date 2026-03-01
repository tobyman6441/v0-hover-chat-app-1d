"use client"

import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FeedbackButton() {
  return (
    <a
      href="mailto:support@hover.ninja?subject=Hover%20Ninja%20Feedback"
      className="fixed bottom-4 right-4 z-50"
    >
      <Button className="rounded-full shadow-lg gap-2">
        <MessageCircle className="h-4 w-4" />
        Feedback
      </Button>
    </a>
  )
}

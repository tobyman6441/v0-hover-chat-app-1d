"use client"

import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FeedbackButton() {
  const openFeedbackWindow = () => {
    const width = 500
    const height = 650
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    
    window.open(
      "/feedback",
      "feedback",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )
  }

  return (
    <Button
      onClick={openFeedbackWindow}
      className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg gap-2"
    >
      <MessageCircle className="h-4 w-4" />
      Feedback
    </Button>
  )
}

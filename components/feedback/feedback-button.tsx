"use client"

import { MessageCircleQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FeedbackButtonProps {
  variant?: "icon" | "text" | "floating"
  className?: string
  size?: "sm" | "default" | "lg"
}

function getDeviceInfo() {
  if (typeof window === "undefined") return {}
  
  const ua = navigator.userAgent
  let device = "Desktop"
  if (/Mobile|Android|iPhone|iPad/.test(ua)) {
    device = /iPad/.test(ua) ? "Tablet" : "Mobile"
  }
  
  let browser = "Unknown"
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome"
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari"
  else if (ua.includes("Firefox")) browser = "Firefox"
  else if (ua.includes("Edg")) browser = "Edge"
  
  const os = /Mac/.test(ua) ? "macOS" : /Win/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : /Android/.test(ua) ? "Android" : /iOS|iPhone|iPad/.test(ua) ? "iOS" : "Unknown"
  
  return { device, browser, os, screenSize: `${window.innerWidth}x${window.innerHeight}` }
}

function openFeedbackWindow() {
  const { device, browser, os, screenSize } = getDeviceInfo()
  const currentPage = typeof window !== "undefined" ? window.location.pathname : ""
  const timestamp = new Date().toISOString()
  
  // Build context string
  const context = [
    `Page: ${currentPage}`,
    `Device: ${device}`,
    `Browser: ${browser}`,
    `OS: ${os}`,
    `Screen: ${screenSize}`,
    `Time: ${timestamp}`,
  ].join(" | ")
  
  // Open the feedback page in a popup window
  const width = 500
  const height = 600
  const left = (window.innerWidth - width) / 2 + window.screenX
  const top = (window.innerHeight - height) / 2 + window.screenY
  
  window.open(
    `/feedback?context=${encodeURIComponent(context)}&page=${encodeURIComponent(currentPage)}`,
    "FeedbackWindow",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  )
}

export function FeedbackButton({ variant = "icon", className, size = "default" }: FeedbackButtonProps) {
  if (variant === "floating") {
    return (
      <button
        onClick={openFeedbackWindow}
        className={cn(
          "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95",
          "md:bottom-6 md:right-6",
          className
        )}
        aria-label="Send feedback"
      >
        <MessageCircleQuestion className="size-5" />
        <span className="hidden sm:inline">Feedback</span>
      </button>
    )
  }

  if (variant === "text") {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={openFeedbackWindow}
        className={cn("gap-2", className)}
      >
        <MessageCircleQuestion className="size-4" />
        <span>Send Feedback</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={openFeedbackWindow}
      className={cn("size-8", className)}
      aria-label="Send feedback"
    >
      <MessageCircleQuestion className="size-5" />
    </Button>
  )
}

// Export the helper for use in other components
export { openFeedbackWindow }

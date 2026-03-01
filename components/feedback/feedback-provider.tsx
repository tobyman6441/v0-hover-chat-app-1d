"use client"

import { FeedbackButton } from "./feedback-button"

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackButton variant="floating" />
    </>
  )
}

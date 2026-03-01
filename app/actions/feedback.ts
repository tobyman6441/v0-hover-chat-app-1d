"use server"

import { createClient } from "@/lib/supabase/server"

export type FeedbackType = "bug" | "feature" | "question" | "general"
export type FeedbackUrgency = "blocker" | "adoption_blocker" | "improvement" | "idea" | null

interface SubmitFeedbackParams {
  feedbackType: FeedbackType
  urgency: FeedbackUrgency
  message: string
  url: string
  userAgent: string
  screenSize: string
  viewport: string
  language: string
}

export async function submitFeedback(params: SubmitFeedbackParams): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get user's org_id
  const { data: membership } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .single()

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    org_id: membership?.org_id || null,
    feedback_type: params.feedbackType,
    urgency: params.urgency,
    message: params.message,
    url: params.url,
    user_agent: params.userAgent,
    screen_size: params.screenSize,
    viewport: params.viewport,
    language: params.language,
  })

  if (error) {
    console.error("Failed to submit feedback:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

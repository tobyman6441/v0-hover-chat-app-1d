"use server"

import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { gateway } from "@ai-sdk/gateway"

export async function getChats() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated", chats: [] }

  const { data, error } = await supabase.rpc("get_user_chats", {
    p_user_id: user.id,
  })

  if (error) return { error: error.message, chats: [] }
  return { chats: data ?? [] }
}

export async function createChat(orgId: string, title?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  const { data, error } = await supabase.rpc("create_chat", {
    p_org_id: orgId,
    p_user_id: user.id,
    p_title: title || "New Chat",
  })

  if (error) return { error: error.message }
  return { chat: data }
}

export async function getChatMessages(chatId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated", messages: [] }

  const { data, error } = await supabase.rpc("get_chat_messages", {
    p_chat_id: chatId,
    p_user_id: user.id,
  })

  if (error) return { error: error.message, messages: [] }
  return { messages: data ?? [] }
}

export async function addMessage(
  chatId: string,
  role: "user" | "assistant",
  content: string,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  const { data, error } = await supabase.rpc("add_chat_message", {
    p_chat_id: chatId,
    p_user_id: user.id,
    p_role: role,
    p_content: content,
  })

  if (error) return { error: error.message }
  return { message: data }
}

export async function updateChatTitle(chatId: string, title: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.rpc("update_chat_title", {
    p_chat_id: chatId,
    p_user_id: user.id,
    p_title: title,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteChat(chatId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.rpc("delete_user_chat", {
    p_chat_id: chatId,
    p_user_id: user.id,
  })

  if (error) return { error: error.message }
  return { success: true }
}

// Folder management functions
export interface ChatFolder {
  id: string
  name: string
  color: string
  sort_order: number
  chat_count: number
}

export async function getUserFolders(): Promise<ChatFolder[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase.rpc("get_user_folders", { p_user_id: user.id })
  return (data || []) as ChatFolder[]
}

export async function createFolder(name: string, color = "#6b7280") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data, error } = await supabase.rpc("create_folder", {
    p_user_id: user.id,
    p_name: name,
    p_color: color,
  })

  if (error) return { error: error.message }
  return { folderId: data }
}

export async function updateFolder(folderId: string, name: string, color: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.rpc("update_folder", {
    p_user_id: user.id,
    p_folder_id: folderId,
    p_name: name,
    p_color: color,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteFolder(folderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.rpc("delete_folder", {
    p_user_id: user.id,
    p_folder_id: folderId,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function moveChatToFolder(chatId: string, folderId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase.rpc("move_chat_to_folder", {
    p_user_id: user.id,
    p_chat_id: chatId,
    p_folder_id: folderId,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function generateChatTitle(chatId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  // Get the chat to check if it still has the default title
  const { data: chat } = await supabase
    .from("chats")
    .select("title")
    .eq("id", chatId)
    .single()

  // Only generate if title is still "New Chat"
  if (chat?.title && chat.title !== "New Chat") {
    return { title: chat.title }
  }

  // Get recent messages for context
  const { data: messages } = await supabase.rpc("get_chat_messages", {
    p_chat_id: chatId,
    p_user_id: user.id,
  })

  if (!messages || messages.length === 0) {
    return { error: "No messages found" }
  }

  // Take up to first 4 messages for title generation (more context for job info)
  const contextMessages = messages.slice(0, 4)
  const conversation = contextMessages
    .map((m: { role: string; content: string }) => `${m.role}: ${m.content.slice(0, 500)}`)
    .join("\n")

  // Try to extract job name and ID from messages for fallback title
  let jobName = ""
  let jobId = ""
  let actionType = ""
  
  for (const msg of contextMessages) {
    const content = msg.content || ""
    
    // Look for "Selected: Job Name at Address (ID: 12345)" - handle various formats
    const selectedMatch = content.match(/Selected:\s*(.+?)\s+at\s+[^(]+\(ID:\s*(\d+)\)/i)
    if (selectedMatch && !jobName) {
      jobName = selectedMatch[1].trim()
      jobId = selectedMatch[2]
    }
    
    // Also look for job ID pattern anywhere: "(ID: 12345)" or "ID: 12345"
    if (!jobId) {
      const idMatch = content.match(/\(ID:\s*(\d+)\)|ID:\s*(\d+)/i)
      if (idMatch) {
        jobId = idMatch[1] || idMatch[2]
      }
    }
    
    // Look for "measurements for Job Name:" pattern
    const measureMatch = content.match(/measurements for\s+([^:]+):/i)
    if (measureMatch && !jobName) {
      jobName = measureMatch[1].trim()
    }
    
    // Also try "Here are the measurements for Job Name"
    const hereMatch = content.match(/Here are the measurements for\s+([^:]+)/i)
    if (hereMatch && !jobName) {
      jobName = hereMatch[1].trim().replace(/:$/, "")
    }
    
    // Determine action type
    if (content.toLowerCase().includes("measurement")) {
      actionType = "Measurements"
    } else if (content.toLowerCase().includes("create") && content.toLowerCase().includes("job")) {
      actionType = "New Job"
    } else if (content.toLowerCase().includes("capture")) {
      actionType = "Capture Request"
    }
  }
  
  // Build fallback title from extracted info
  let fallbackTitle = ""
  if (jobName) {
    fallbackTitle = jobName
    if (actionType) {
      fallbackTitle += ` - ${actionType}`
    }
    if (jobId) {
      fallbackTitle += ` (${jobId})`
    }
  }

  try {
    const { text } = await generateText({
      model: gateway("openai/gpt-4o-mini"),
      prompt: `Generate a concise, descriptive title (4-8 words) for this conversation. 

IMPORTANT RULES:
1. If a specific property/job name is mentioned, ALWAYS include it in the title
2. Include what action was taken (measurements, job creation, etc.)
3. If a Job ID is available, include it in parentheses at the end

${jobName ? `Extracted job name: ${jobName}` : ""}
${jobId ? `Job ID: ${jobId}` : ""}
${actionType ? `Action type: ${actionType}` : ""}

Examples:
- Conversation about getting measurements for "Shake Shack" (ID: 12345) -> "Shake Shack Measurements (12345)"
- Conversation about creating a job at "123 Main St" -> "New Job: 123 Main St"
- Conversation about roof specs for "Bluth House" (ID: 98765) -> "Bluth House Roof Specs (98765)"
- General question about measurements -> "Measurement Query"

Conversation:
${conversation}

Return ONLY the title, no quotes or extra formatting:`,
      maxTokens: 30,
    })

    const title = text.trim().replace(/^["']|["']$/g, "").slice(0, 80)

    if (title) {
      await supabase.rpc("update_chat_title", {
        p_chat_id: chatId,
        p_user_id: user.id,
        p_title: title,
      })
      return { title }
    }

    return { error: "Failed to generate title" }
  } catch {
    // Use fallback title if AI fails (e.g., AI Gateway not configured)
    if (fallbackTitle) {
      const title = fallbackTitle.slice(0, 80)
      const { error: updateError } = await supabase.rpc("update_chat_title", {
        p_chat_id: chatId,
        p_user_id: user.id,
        p_title: title,
      })
      if (!updateError) {
        return { title }
      }
    }
    
    return { error: "Failed to generate title" }
  }
}

"use server"

import { createClient } from "@/lib/supabase/server"

interface CaptureRequestParams {
  // Required fields
  capturing_user_name: string
  capturing_user_email: string
  location_line_1: string
  // Optional but recommended fields  
  capturing_user_phone?: string
  location_city?: string
  location_region?: string
  location_postal_code?: string
  name?: string
  deliverable_id?: number
  signup_type?: "homeowner" | "pro"
  // User to assign the job to (defaults to authenticated user)
  assign_to_user_id?: number
}

interface CaptureRequestResult {
  success: boolean
  data?: unknown
  error?: string
  errorDetails?: string
}

async function getHoverToken(forceRefresh = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: config } = await supabase.rpc("get_org_llm_config", {
    p_user_id: user.id,
  })

  if (!config?.hover_access_token) {
    return { error: "Hover not connected. Please connect Hover in Settings." }
  }

  // Check if token needs refresh based on age
  const connectedAt = config.hover_connected_at ? new Date(config.hover_connected_at) : null
  const tokenAgeHours = connectedAt ? (Date.now() - connectedAt.getTime()) / (1000 * 60 * 60) : 999
  const needsRefresh = forceRefresh || tokenAgeHours > 1.5

  let accessToken = config.hover_access_token

  // Try to refresh the token if needed and we have a refresh token
  if (needsRefresh && config.hover_refresh_token) {
    try {
      const refreshResponse = await fetch("https://hover.to/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: config.hover_refresh_token,
          client_id: process.env.HOVER_CLIENT_ID || "",
          client_secret: process.env.HOVER_CLIENT_SECRET || "",
        }),
      })

      if (refreshResponse.ok) {
        const tokenData = await refreshResponse.json()
        if (tokenData.access_token) {
          // Update the database with the new tokens
          const { error: updateError } = await supabase
            .from("organizations")
            .update({
              hover_access_token: tokenData.access_token,
              hover_refresh_token: tokenData.refresh_token || config.hover_refresh_token,
              hover_connected_at: new Date().toISOString(),
            })
            .eq("id", config.org_id)
          
          if (!updateError) {
            accessToken = tokenData.access_token
          }
        }
      } else if (forceRefresh) {
        // If force refresh was requested but failed, return an error
        return { error: "Failed to refresh Hover token. Please reconnect Hover in Settings." }
      }
    } catch (err) {
      // If force refresh was requested but failed, return an error
      if (forceRefresh) {
        return { error: `Token refresh failed: ${err}. Please reconnect Hover in Settings.` }
      }
      // Otherwise continue with existing token
    }
  }

  return { accessToken, userId: user.id, orgId: config.org_id, refreshToken: config.hover_refresh_token }
}

// List all users in the Hover organization
export interface HoverUser {
  id: number
  email: string
  first_name: string
  last_name: string
  name: string
  acl_template: string
  aasm_state: string
}

export async function listHoverUsers(): Promise<{ success: boolean; users?: HoverUser[]; error?: string }> {
  const tokenResult = await getHoverToken()
  
  if ("error" in tokenResult) {
    return { success: false, error: tokenResult.error }
  }

  const { accessToken } = tokenResult

  try {
    // Fetch all users (paginate if needed)
    const allUsers: HoverUser[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await fetch(
        `https://hover.to/api/v2/users?page=${page}&per_page=100&state=activated`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        return { success: false, error: `Failed to list users: HTTP ${response.status}` }
      }

      const data = await response.json()
      const results = data.results || []
      
      for (const user of results) {
        allUsers.push({
          id: user.id,
          email: user.email,
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
          acl_template: user.acl_template || "user",
          aasm_state: user.aasm_state || "unknown",
        })
      }

      // Check pagination
      const pagination = data.pagination || {}
      hasMore = page < (pagination.total_pages || 1)
      page++
      
      // Safety limit
      if (page > 10) break
    }

    return { success: true, users: allUsers }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get the current Hover user profile
export async function getHoverUser(): Promise<{ success: boolean; user?: { id: number; email: string; name?: string }; error?: string }> {
  const tokenResult = await getHoverToken()
  
  if ("error" in tokenResult) {
    return { success: false, error: tokenResult.error }
  }

  const { accessToken } = tokenResult

  try {
    const userResponse = await fetch("https://hover.to/api/v2/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })
    
    if (userResponse.ok) {
      const userData = await userResponse.json()
      const user = userData.user || userData
      return { 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email,
          name: user.name || user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()
        } 
      }
    } else {
      return { success: false, error: `Failed to get user: HTTP ${userResponse.status}` }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Job and Model types for measurements
export interface HoverModel {
  id: number
  name: string | null
  state: string
  deliverable: string
  artifacts?: {
    measurements?: {
      full_json?: string
    }
  }
}

export interface HoverJob {
  id: number
  name: string
  reconstruction_state: string
  external_identifier?: string | null
  address: {
    location_line_1: string
    location_line_2?: string | null
    city: string
    region: string
    postal_code: string
    country?: string | null
  }
  customer?: {
    first_name?: string | null
    name?: string | null
    email?: string | null
    phone?: string | null
  }
  models: HoverModel[]
  created_at: string
  updated_at: string
}

// Helper function to fetch jobs with a given token
async function fetchJobsWithToken(accessToken: string): Promise<{
  success: boolean
  jobs?: HoverJob[]
  error?: string
  status?: number
}> {
  try {
    const allJobs: HoverJob[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await fetch(
        `https://hover.to/api/v3/jobs?page=${page}&per=100&sort_by=updated_at&sort_order=DESC&reconstruction_state=completed`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, error: `Failed to list jobs: HTTP ${response.status} - ${errorText}`, status: response.status }
      }

      const data = await response.json()
      const results = data.results || []

      for (const job of results) {
        // Only include jobs that have at least one model with state = "complete"
        const completedModels = (job.models || []).filter(
          (m: HoverModel) => m.state === "complete"
        )

        if (completedModels.length > 0) {
          allJobs.push({
            id: job.id,
            name: job.name || `Job ${job.id}`,
            reconstruction_state: job.reconstruction_state,
            external_identifier: job.external_identifier,
            address: job.address || {},
            customer: job.customer,
            models: completedModels,
            created_at: job.created_at,
            updated_at: job.updated_at,
          })
        }
      }

      // Check pagination
      const pagination = data.pagination || {}
      hasMore = pagination.next_page !== null && pagination.next_page !== undefined
      page++
      
      // Safety limit
      if (page > 20) break
    }

    return { success: true, jobs: allJobs }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// List jobs with measurements available (model state = complete)
export async function listJobsWithMeasurements(): Promise<{ 
  success: boolean
  jobs?: HoverJob[]
  error?: string 
}> {
  const tokenResult = await getHoverToken()
  
  if ("error" in tokenResult) {
    return { success: false, error: tokenResult.error }
  }

  const { accessToken, refreshToken } = tokenResult

  // Try with current token
  let result = await fetchJobsWithToken(accessToken)
  
  // If we get a 401 and have a refresh token, try refreshing
  if (!result.success && result.status === 401) {
    if (refreshToken) {
      const refreshedTokenResult = await getHoverToken(true) // Force refresh
      
      if ("error" in refreshedTokenResult) {
        return { success: false, error: refreshedTokenResult.error }
      }
      
      // Retry with refreshed token
      result = await fetchJobsWithToken(refreshedTokenResult.accessToken)
      
      // If still failing after refresh, give clear message
      if (!result.success && result.status === 401) {
        return { success: false, error: "Hover session expired. Please reconnect Hover in Settings." }
      }
    } else {
      return { success: false, error: "Hover session expired and no refresh token available. Please reconnect Hover in Settings." }
    }
  }

  return result
}

// Helper function to fetch measurements with a given token
async function fetchMeasurementsWithToken(modelId: number, accessToken: string): Promise<{
  success: boolean
  measurements?: Record<string, unknown>
  error?: string
  status?: number
}> {
  try {
    const response = await fetch(
      `https://hover.to/api/v3/models/${modelId}/artifacts/measurements.json?version=full_json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `Failed to get measurements: HTTP ${response.status} - ${errorText}`, status: response.status }
    }

    const measurements = await response.json()
    return { success: true, measurements }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get measurements for a specific model
export async function getMeasurements(modelId: number): Promise<{
  success: boolean
  measurements?: Record<string, unknown>
  error?: string
}> {
  const tokenResult = await getHoverToken()
  
  if ("error" in tokenResult) {
    return { success: false, error: tokenResult.error }
  }

  const { accessToken, refreshToken } = tokenResult

  // Try with current token
  let result = await fetchMeasurementsWithToken(modelId, accessToken)
  
  // If we get a 401, try refreshing
  if (!result.success && result.status === 401) {
    if (refreshToken) {
      const refreshedTokenResult = await getHoverToken(true) // Force refresh
      
      if ("error" in refreshedTokenResult) {
        return { success: false, error: refreshedTokenResult.error }
      }
      
    // Retry with refreshed token
    result = await fetchMeasurementsWithToken(modelId, refreshedTokenResult.accessToken)
      
      // If still failing after refresh, give clear message
      if (!result.success && result.status === 401) {
        return { success: false, error: "Hover session expired. Please reconnect Hover in Settings." }
      }
    } else {
      return { success: false, error: "Hover session expired and no refresh token available. Please reconnect Hover in Settings." }
    }
  }

  return result
}

export async function createCaptureRequest(params: CaptureRequestParams): Promise<CaptureRequestResult> {
  const tokenResult = await getHoverToken()
  
  if ("error" in tokenResult) {
    return { success: false, error: tokenResult.error }
  }

  const { accessToken } = tokenResult

  // Determine the user ID to use for the request
  let currentUserId = params.assign_to_user_id
  
  // If no user was explicitly selected, try to get the current user from Hover
  if (!currentUserId) {
    try {
      const userResponse = await fetch("https://hover.to/api/v2/users/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        // The user data might be nested in a "user" property or at root
        const user = userData.user || userData
        if (user.id) {
          currentUserId = user.id
        }
      }
    } catch {
      // Continue - we'll try list users as fallback
    }
  }
  
  // If still no user ID, try to get the first user from list users API
  if (!currentUserId) {
    try {
      const usersResult = await listHoverUsers()
      if (usersResult.success && usersResult.users && usersResult.users.length > 0) {
        // Use the first user (usually the account owner)
        currentUserId = usersResult.users[0].id
      }
    } catch {
      // Continue
    }
  }

  // current_user_id is REQUIRED when using OAuth
  if (!currentUserId) {
    return { 
      success: false, 
      error: "Could not determine a Hover user ID. Please select a user from the 'Assign Job To' dropdown.",
      errorDetails: "The Hover API requires a current_user_id. Please select a user or try reconnecting Hover in Settings."
    }
  }
  
  const requestBody = {
    current_user_id: currentUserId,
    capture_request: {
      capturing_user_name: params.capturing_user_name,
      capturing_user_email: params.capturing_user_email,
      capturing_user_phone: params.capturing_user_phone || undefined,
      signup_type: params.signup_type || "homeowner",
      job_attributes: {
        name: params.name || `Job at ${params.location_line_1}`,
        location_line_1: params.location_line_1,
        location_city: params.location_city || undefined,
        location_region: params.location_region || undefined,
        location_postal_code: params.location_postal_code || undefined,
        deliverable_id: params.deliverable_id || 3, // Default to Complete
      },
    },
  }

  try {
    const response = await fetch("https://hover.to/api/v2/capture_requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    const responseData = await response.json()

    if (!response.ok) {
      // Extract error message from response
      let errorMessage = "Failed to create capture request"
      let errorDetails = ""
      
      if (responseData.errors) {
        if (Array.isArray(responseData.errors)) {
          errorMessage = responseData.errors.join(", ")
        } else if (typeof responseData.errors === "object") {
          errorDetails = JSON.stringify(responseData.errors, null, 2)
          const errorKeys = Object.keys(responseData.errors)
          errorMessage = errorKeys.map(key => `${key}: ${responseData.errors[key]}`).join(", ")
        }
      } else if (responseData.error) {
        errorMessage = responseData.error
      } else if (responseData.message) {
        errorMessage = responseData.message
      }

      return { 
        success: false, 
        error: errorMessage,
        errorDetails: errorDetails || `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    return { success: true, data: responseData }
  } catch (error) {
    return { 
      success: false, 
      error: "Network error while creating capture request",
      errorDetails: String(error),
    }
  }
}

// ==========================================
// PHOTO RETRIEVAL APIs
// ==========================================

export interface HoverJobPhoto {
  id: number
  url: string
  thumbnail_url?: string
  width?: number
  height?: number
  created_at?: string
}

export interface HoverInspection {
  id: number
  title: string
  state?: string
  created_at?: string
  photos?: HoverJobPhoto[]
}

export interface HoverJobDetails {
  id: number
  name: string
  state: string
  reconstruction_state: string
  address: {
    location_line_1: string
    location_line_2?: string | null
    city: string
    region: string
    postal_code: string
  }
  customer?: {
    name?: string | null
    email?: string | null
    phone?: string | null
  }
  images?: HoverJobPhoto[]
  inspections?: { id: number; title?: string }[]
  created_at: string
  updated_at: string
}

export interface HoverWireframeImage {
  id: number
  url: string
  thumbnail_url?: string
  type?: string
  created_at?: string
}

export interface HoverInstantDesignImage {
  id: number
  url: string
  thumbnail_url?: string
  created_at?: string
}

export interface JobPhotosResult {
  success: boolean
  jobDetails?: HoverJobDetails
  scanPhotos?: HoverJobPhoto[]
  inspections?: HoverInspection[]
  wireframeImages?: HoverWireframeImage[]
  instantDesignImages?: HoverInstantDesignImage[]
  error?: string
}

// List ALL jobs (not filtered by completion state) - for photo browsing
async function fetchAllJobsWithToken(accessToken: string): Promise<{
  success: boolean
  jobs?: HoverJob[]
  error?: string
  status?: number
}> {
  try {
    const allJobs: HoverJob[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      // Don't filter by reconstruction_state - get all jobs
      const response = await fetch(
        `https://hover.to/api/v3/jobs?page=${page}&per=100&sort_by=updated_at&sort_order=DESC`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, error: `Failed to list jobs: HTTP ${response.status} - ${errorText}`, status: response.status }
      }

      const data = await response.json()
      const results = data.results || []

      for (const job of results) {
        allJobs.push({
          id: job.id,
          name: job.name || `Job ${job.id}`,
          reconstruction_state: job.reconstruction_state || "unknown",
          external_identifier: job.external_identifier,
          address: job.address || {},
          customer: job.customer,
          models: job.models || [],
          created_at: job.created_at,
          updated_at: job.updated_at,
        })
      }

      // Check pagination
      const pagination = data.pagination || {}
      hasMore = pagination.next_page !== null && pagination.next_page !== undefined
      page++
      
      // Safety limit
      if (page > 20) break
    }

    return { success: true, jobs: allJobs }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// List all jobs for photo browsing
export async function listAllJobs(): Promise<{ 
  success: boolean
  jobs?: HoverJob[]
  error?: string 
}> {
  const tokenResult = await getHoverToken()
  
  if ("error" in tokenResult) {
    return { success: false, error: tokenResult.error }
  }

  const { accessToken, refreshToken } = tokenResult

  let result = await fetchAllJobsWithToken(accessToken)

  // Handle token expiration
  if (!result.success && result.status === 401) {
    if (refreshToken) {
      const refreshedTokenResult = await getHoverToken(true)
      
      if ("error" in refreshedTokenResult) {
        return { success: false, error: refreshedTokenResult.error }
      }
      
      result = await fetchAllJobsWithToken(refreshedTokenResult.accessToken)
      
      if (!result.success && result.status === 401) {
        return { success: false, error: "Hover session expired. Please reconnect Hover in Settings." }
      }
    } else {
      return { success: false, error: "Hover session expired. Please reconnect Hover in Settings." }
    }
  }

  return result
}

// Get job details including images and wireframes
async function fetchJobDetailsWithToken(jobId: number, accessToken: string): Promise<{
  success: boolean
  jobDetails?: HoverJobDetails
  wireframeImages?: HoverWireframeImage[]
  error?: string
  status?: number
}> {
  try {
    const response = await fetch(
      `https://hover.to/api/v3/jobs/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `Failed to get job details: HTTP ${response.status}`, status: response.status }
    }

    const data = await response.json()
    const job = data.job || data
    
    // Extract images and wireframes from models (they're nested inside each model)
    const allImages: HoverJobPhoto[] = []
    const allWireframes: HoverWireframeImage[] = []
    let wireframeIdCounter = 1
    
    if (job.models && Array.isArray(job.models)) {
      for (const model of job.models) {
        // Extract scan images
        if (model.images && Array.isArray(model.images)) {
          for (const img of model.images) {
            allImages.push({
              id: img.id,
              url: img.url,
              created_at: img.created_at,
            })
          }
        }
        
        // Extract wireframe images from model.artifacts.wireframe_images
        const wireframes = model.artifacts?.wireframe_images
        if (wireframes && typeof wireframes === "object") {
          // Helper to validate URL is a non-empty string that looks like a URL
          const isValidUrl = (url: unknown): url is string => {
            return typeof url === "string" && url.length > 0 && (url.startsWith("http") || url.startsWith("/"))
          }
          
          // Helper to add wireframe if URL is valid
          const addWireframe = (url: unknown, type: string) => {
            if (isValidUrl(url)) {
              allWireframes.push({
                id: wireframeIdCounter++,
                url,
                type,
              })
            }
          }
          
          // Process each wireframe type (front, back, left, right, roof, etc.)
          for (const [key, value] of Object.entries(wireframes)) {
            if (!value) continue
            
            const typeName = key.replace(/_/g, " ")
            
            // Some entries are strings (like footprint), some are objects with url/compass/top
            if (typeof value === "string") {
              addWireframe(value, typeName)
            } else if (typeof value === "object") {
              const wireframe = value as Record<string, unknown>
              
              // Add main wireframe image
              addWireframe(wireframe.url, typeName)
              
              // Add compass view if available (for elevation views)
              addWireframe(wireframe.compass, `${typeName} (compass)`)
              
              // Add top view if available
              addWireframe(wireframe.top, `${typeName} (top)`)
              
              // Add roof-specific views
              addWireframe(wireframe.lengths, `${typeName} (lengths)`)
              addWireframe(wireframe.areas, `${typeName} (areas)`)
              addWireframe(wireframe.pitches, `${typeName} (pitches)`)
            }
          }
        }
      }
    }

    return { 
      success: true, 
      jobDetails: {
        id: job.id,
        name: job.name || `Job ${job.id}`,
        state: job.state || "unknown",
        reconstruction_state: job.reconstruction_state || "unknown",
        address: job.address || {},
        customer: job.customer,
        images: allImages,
        inspections: job.inspections || [],
        created_at: job.created_at,
        updated_at: job.updated_at,
      },
      wireframeImages: allWireframes,
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get inspection details including photos
async function fetchInspectionDetailsWithToken(inspectionId: number, accessToken: string): Promise<{
  success: boolean
  inspection?: HoverInspection
  error?: string
  status?: number
}> {
  try {
    const response = await fetch(
      `https://hover.to/api/v2/inspections/${inspectionId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `Failed to get inspection: HTTP ${response.status}`, status: response.status }
    }

    const data = await response.json()
    const inspection = data.inspection || data
    
    // Extract photos from nested structure: sections > task_groups > tasks > captured_photos
    const allPhotos: HoverJobPhoto[] = []
    if (inspection.sections && Array.isArray(inspection.sections)) {
      for (const section of inspection.sections) {
        if (section.task_groups && Array.isArray(section.task_groups)) {
          for (const taskGroup of section.task_groups) {
            if (taskGroup.tasks && Array.isArray(taskGroup.tasks)) {
              for (const task of taskGroup.tasks) {
                if (task.captured_photos && Array.isArray(task.captured_photos)) {
                  for (const photo of task.captured_photos) {
                    // Use the original URL for best quality
                    const url = photo.urls?.original || photo.urls?.w1440 || photo.urls?.w1152 || photo.url
                    if (url) {
                      allPhotos.push({
                        id: allPhotos.length + 1, // Generate ID since it's not provided
                        url: url,
                        thumbnail_url: photo.urls?.w480,
                      })
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return { 
      success: true, 
      inspection: {
        id: inspection.id,
        title: inspection.title || `Inspection ${inspection.id}`,
        state: inspection.state,
        created_at: inspection.created_at,
        photos: allPhotos,
      }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get wireframe images for a completed job
async function fetchWireframeImagesWithToken(jobId: number, accessToken: string): Promise<{
  success: boolean
  wireframeImages?: HoverWireframeImage[]
  error?: string
  status?: number
}> {
  try {
    const response = await fetch(
      `https://hover.to/api/v2/jobs/${jobId}/wireframe_images`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      // 404 is expected if no wireframes available
      if (response.status === 404) {
        return { success: true, wireframeImages: [] }
      }
      return { success: false, error: `Failed to get wireframe images: HTTP ${response.status}`, status: response.status }
    }

    const data = await response.json()
    
    // Wireframe API returns an object with named keys (wireframe_front, wireframe_back, etc.)
    // NOT an array. Each key has a "url" property and possibly nested views (top, compass, etc.)
    const processedImages: HoverWireframeImage[] = []
    let idCounter = 1
    
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === "object" && "url" in value) {
        const wireframe = value as { url: string; key?: string; top?: { url: string }; compass?: { url: string } }
        
        // Add main wireframe image
        processedImages.push({
          id: idCounter++,
          url: wireframe.url,
          type: key.replace("wireframe_", "").replace(/_/g, " "),
        })
        
        // Add top view if available
        if (wireframe.top?.url) {
          processedImages.push({
            id: idCounter++,
            url: wireframe.top.url,
            type: `${key.replace("wireframe_", "").replace(/_/g, " ")} (top)`,
          })
        }
      }
    }

    return { 
      success: true, 
      wireframeImages: processedImages
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Fetch Instant Design images for a job
async function fetchInstantDesignImagesWithToken(jobId: number, accessToken: string): Promise<{
  success: boolean
  images?: HoverInstantDesignImage[]
  error?: string
}> {
  try {
    // First, get the list of image IDs for this job
    const listResponse = await fetch(
      `https://hover.to/api/v1/instant_design/images?job_id=${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!listResponse.ok) {
      if (listResponse.status === 404) {
        // No instant design images for this job
        return { success: true, images: [] }
      }
      return { success: false, error: `Failed to list instant design images: HTTP ${listResponse.status}` }
    }

    const listData = await listResponse.json()
    
    // The API might return images in different formats
    const imageIds = listData.images || listData.instant_design_images || listData || []

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return { success: true, images: [] }
    }

    // Fetch each image's details to get the actual URL
    const images: HoverInstantDesignImage[] = []
    
    for (const imageRef of imageIds) {
      try {
        const imageId = typeof imageRef === 'object' ? imageRef.id : imageRef
        
        const imageResponse = await fetch(
          `https://hover.to/api/v1/instant_design/images/${imageId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        )

        if (imageResponse.ok) {
          const imageData = await imageResponse.json()
          // The response contains the image URL (could be in different fields)
          const url = imageData.url || imageData.image_url || imageData.download_url || imageData.image?.url
          if (url) {
            images.push({
              id: imageId,
              url,
              thumbnail_url: imageData.thumbnail_url || imageData.image?.thumbnail_url,
              created_at: imageData.created_at,
            })
          }
        }
      } catch {
        // Skip individual image errors
      }
    }

    return { success: true, images }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Get all photos for a job (scan photos, inspection photos, wireframes, instant design)
// Get job details (simpler version without photos)
export async function getJobDetails(jobId: number): Promise<{
  success: boolean
  jobDetails?: HoverJobDetails
  error?: string
}> {
  const tokenResult = await getHoverToken()
  
  if ("error" in tokenResult) {
    return { success: false, error: tokenResult.error }
  }

  const { accessToken } = tokenResult
  const jobResult = await fetchJobDetailsWithToken(jobId, accessToken)
  
  if (!jobResult.success || !jobResult.jobDetails) {
    return { success: false, error: jobResult.error || "Failed to get job details" }
  }

  return { success: true, jobDetails: jobResult.jobDetails }
}

export async function getJobPhotos(jobId: number): Promise<JobPhotosResult> {
  const tokenResult = await getHoverToken()
  
  if ("error" in tokenResult) {
    return { success: false, error: tokenResult.error }
  }

  const { accessToken } = tokenResult

  // Get job details first (this now also extracts wireframe images from models.artifacts.wireframe_images)
  const jobResult = await fetchJobDetailsWithToken(jobId, accessToken)
  if (!jobResult.success || !jobResult.jobDetails) {
    return { success: false, error: jobResult.error || "Failed to get job details" }
  }

  const jobDetails = jobResult.jobDetails
  const scanPhotos = jobDetails.images || []
  
  // Wireframes are now extracted from job details (models.artifacts.wireframe_images)
  const wireframeImages = jobResult.wireframeImages || []

  // Get inspection photos
  const inspections: HoverInspection[] = []
  if (jobDetails.inspections && jobDetails.inspections.length > 0) {
    for (const insp of jobDetails.inspections) {
      const inspResult = await fetchInspectionDetailsWithToken(insp.id, accessToken)
      if (inspResult.success && inspResult.inspection) {
        inspections.push(inspResult.inspection)
      }
    }
  }

  // Get instant design images
  const instantDesignResult = await fetchInstantDesignImagesWithToken(jobId, accessToken)
  const instantDesignImages = instantDesignResult.success ? instantDesignResult.images || [] : []

  return {
    success: true,
    jobDetails,
    scanPhotos,
    inspections,
    wireframeImages,
    instantDesignImages,
  }
}

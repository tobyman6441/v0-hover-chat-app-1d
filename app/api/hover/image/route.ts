import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get("url")

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing image URL" }, { status: 400 })
  }

  try {
    // Get the user's Hover token from Supabase using the same method as hover.ts
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get the Hover token from org_llm_config (same as getHoverToken in hover.ts)
    const { data: configData } = await supabase.rpc("get_org_llm_config", {
      p_user_id: user.id,
    })

    // RPC returns an array of rows, get the first one
    const config = Array.isArray(configData) ? configData[0] : configData

    if (!config?.hover_access_token) {
      return NextResponse.json({ error: "Hover not connected" }, { status: 401 })
    }

    // Fetch the image from Hover with the access token
    const response = await fetch(imageUrl, {
      headers: {
        Authorization: `Bearer ${config.hover_access_token}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      )
    }

    // Get the image data and content type
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get("content-type") || "image/jpeg"

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error("Error proxying image:", error)
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 }
    )
  }
}

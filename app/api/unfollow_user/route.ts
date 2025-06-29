import { NextResponse } from "next/server"
import { buildApiUrl, API_CONFIG } from "@/lib/config"

/**
 * Proxy to POST https://superfan.alterwork.in/api/un_follow
 *
 * Expects JSON body: { "target_username": string }
 * Converts to: { "payload": { "unfollow": string } } for the backend API
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const authHeader = req.headers.get("authorization") ?? ""

    console.log("Unfollow user request:", { body, hasAuth: !!authHeader })

    // Convert payload format for backend API
    const backendPayload = {
      payload: {
        unfollow: body.target_username
      }
    }

    const upstream = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.UN_FOLLOW), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(backendPayload),
    })

    console.log("Upstream response status:", upstream.status)
    console.log("Upstream response headers:", Object.fromEntries(upstream.headers.entries()))

    // Check if response is JSON
    const contentType = upstream.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const textResponse = await upstream.text()
      console.error("Non-JSON response received:", textResponse.substring(0, 200))
      return NextResponse.json(
        { error: "Server returned non-JSON response", details: "Please try again later" },
        { status: 500 }
      )
    }

    const data = await upstream.json()
    console.log("Upstream response data:", data)
    
    return NextResponse.json(data, { status: upstream.status })
  } catch (error) {
    console.error("Error in unfollow_user API route:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

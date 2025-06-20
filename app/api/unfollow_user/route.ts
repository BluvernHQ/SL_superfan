import { NextResponse } from "next/server"

/**
 * Proxy to POST https://superfan.alterwork.in/api/unfollow_user
 *
 * Expects JSON body: { "target_username": string }
 */
export async function POST(req: Request) {
  const body = await req.json()
  const authHeader = req.headers.get("authorization") ?? ""

  const upstream = await fetch("https://superfan.alterwork.in/api/unfollow_user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  })

  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}

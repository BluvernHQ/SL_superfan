import { NextResponse } from "next/server"

/**
 * Proxy to POST https://superfan.alterwork.in/api/follow_user
 *
 * Expects JSON body: { "target_username": string }
 * Forwards the caller’s Authorization header if present so
 * Firebase / JWT auth keeps working.
 */
export async function POST(req: Request) {
  const body = await req.json()
  const authHeader = req.headers.get("authorization") ?? ""

  const upstream = await fetch("https://superfan.alterwork.in/api/follow_user", {
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

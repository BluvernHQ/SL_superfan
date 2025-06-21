"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function VideosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get the video ID from search params or URL
    const videoId = searchParams.get("id") || searchParams.get("video")

    if (videoId) {
      // Redirect to the new viewer page with storage type
      router.replace(`/viewer?type=storage&video=${videoId}`)
    } else {
      // If no video ID, redirect to homepage
      router.replace("/")
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p>Redirecting to video player...</p>
      </div>
    </div>
  )
}

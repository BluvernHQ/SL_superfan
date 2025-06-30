"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Camera, Play, Eye } from "lucide-react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import { VideoCarousel } from "@/components/video-carousel"
import { MobileLayout } from "@/components/mobile-layout"
import { buildApiUrl, buildThumbnailUrl, buildVideoUrl, API_CONFIG } from "@/lib/config"

export function HomePage() {
  const [liveStreams, setLiveStreams] = useState<any[]>([])
  const [isLoadingStreams, setIsLoadingStreams] = useState(true)
  const [hasLoadedStreamsInitially, setHasLoadedStreamsInitially] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  const [recentStreams, setRecentStreams] = useState<any[]>([])
  const [isLoadingRecentStreams, setIsLoadingRecentStreams] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (user) {
      try {
        const { getIdToken } = await import("firebase/auth")
        const authToken = await getIdToken(user)
        headers["Authorization"] = `Bearer ${authToken}`
      } catch (tokenError) {
        console.log("Error getting Firebase token:", tokenError)
      }
    }

    return headers
  }, [user])

  const fetchLiveStreams = useCallback(async () => {
    try {
      setIsLoadingStreams(true)
      const headers = await getAuthHeaders()

      const response = await fetch(buildApiUrl("/streams/live"), {
        method: "GET",
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        const streamsArray = Object.entries(data.live || {}).map(([sessionId, streamData]: [string, any]) => {
          const thumbnailUrl = `/files/thumbnails/${streamData.hookId}.jpg`
          return {
            sessionId,
            ...streamData,
            id: streamData.roomId,
            title: streamData.title || `${streamData.name}'s Live Stream`,
            streamer: streamData.name,
            viewers: streamData.views || 0,
            likes: streamData.likes || 0,
            thumbnail: thumbnailUrl,
          }
        })
        setLiveStreams(streamsArray)
      }
    } catch (error) {
      console.error("Error fetching live streams:", error)
    } finally {
      setIsLoadingStreams(false)
      if (!hasLoadedStreamsInitially) {
        setHasLoadedStreamsInitially(true)
      }
    }
  }, [getAuthHeaders, hasLoadedStreamsInitially])

  const fetchRecentStreams = useCallback(async () => {
    try {
      setIsLoadingRecentStreams(true)
      const response = await fetch("https://superfan.alterwork.in/api/recordings/ranked", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.status === "ok" && Array.isArray(data.videos)) {
          const transformedStreams = data.videos.map((video: any) => ({
            id: video.hookId,
            title: video.title || `Stream ${video.hookId}`,
            streamer: video.display_name,
            thumbnail: buildThumbnailUrl(video.hookId),
            hookId: video.hookId,
          }))
          setRecentStreams(transformedStreams)
        } else {
          console.warn("Unexpected response format for fetch_videos:", data)
          setRecentStreams([])
        }
      } else {
        console.error("Failed to fetch recent streams:", response.status, response.statusText)
        setRecentStreams([])
      }
    } catch (error) {
      console.error("Error fetching recent streams:", error)
      setRecentStreams([])
    } finally {
      setIsLoadingRecentStreams(false)
    }
  }, [])

  const handleStartLive = () => {
    if (user) {
      router.push("/streamer")
        } else {
      router.push("/login?redirect=stream")
    }
  }

  const handlePlayVideo = (video: any) => {
    if (video.hookId) {
      router.push(`/viewer?video=${video.hookId}&type=recording`)
    } else {
      console.log("Playing video (placeholder):", video.title)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string passed to formatDate:", dateString)
        return "Invalid Date"
      }
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    } catch (e) {
      console.error("Error formatting date:", e)
      return "Invalid Date"
    }
  }

  useEffect(() => {
    fetchLiveStreams()
    fetchRecentStreams()
    const interval = setInterval(() => {
      fetchLiveStreams() // Only live streams need periodic updates
    }, 30000)
    return () => clearInterval(interval)
  }, [user, fetchLiveStreams, fetchRecentStreams])

  return (
    <MobileLayout>
      <div className="space-y-12">
        {/* Live Streams Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Live Now</h2>
          <VideoCarousel
            videos={liveStreams}
            isLoading={isLoadingStreams}
            onPlayVideo={handlePlayVideo}
            emptyMessage="No live streams at the moment"
            isLive={true}
          />
        </section>

        {/* Recent Streams Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Recent Streams</h2>
          {isLoadingRecentStreams ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="w-full h-32 bg-muted rounded mb-3"></div>
                    <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentStreams.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentStreams.map((video) => (
                <div
                  key={video.id}
                  className="relative"
                  style={
                    {
                      "--hover-bg": "rgb(249 115 22)", // orange-500
                    } as React.CSSProperties
                  }
                >
                  <div
                    className="absolute inset-0 rounded-md opacity-0 transition-opacity duration-75 z-0"
                    style={{
                      backgroundColor: "var(--hover-bg)",
                      transform: "translate(2px, 2px)",
                    }}
                  ></div>
                  <Card
                    className="relative z-10 cursor-pointer transition-all duration-75 hover:shadow-lg w-full h-full hover:-translate-x-[2px] hover:-translate-y-[2px]"
                    onClick={() => handlePlayVideo(video)}
                    onMouseEnter={(e) => {
                      const bg = e.currentTarget.parentElement?.querySelector("div:first-child") as HTMLElement
                      if (bg) bg.style.opacity = "1"
                    }}
                    onMouseLeave={(e) => {
                      const bg = e.currentTarget.parentElement?.querySelector("div:first-child") as HTMLElement
                      if (bg) bg.style.opacity = "0"
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="relative w-full h-32 bg-black rounded mb-3 flex items-center justify-center overflow-hidden">
                        <img
                          src={video.thumbnail || "/placeholder.svg?height=128&width=280&query=video-thumbnail"}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=128&width=280"
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                          <Play className="h-8 w-8 text-white" />
                        </div>
                      </div>
                      <h3 className="font-semibold mb-1 line-clamp-2 text-sm">{video.title}</h3>
                      {video.streamer && <p className="text-xs text-muted-foreground">{video.streamer}</p>}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent streams</p>
          )}
        </section>
      </div>
    </MobileLayout>
  )
}

export default HomePage

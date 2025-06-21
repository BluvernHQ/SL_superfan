"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Eye, Play } from "lucide-react"

interface Video {
  id: string
  title: string
  streamer?: string
  views: number
  date?: string
  thumbnail: string
  hookId?: string // For live streams
  UID?: string // For live streams
}

interface VideoCarouselProps {
  title: string
  videos: Video[]
  onPlayVideo: (video: Video) => void
  emptyMessage?: string
  isLoading?: boolean
  isLive?: boolean // To differentiate between live and recorded videos
}

export function VideoCarousel({
  title,
  videos,
  onPlayVideo,
  emptyMessage = "No videos found.",
  isLoading = false,
  isLive = false,
}: VideoCarouselProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      {isLoading ? (
        <div className="flex space-x-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="min-w-[280px] max-w-[280px] animate-pulse">
              <CardContent className="p-4">
                <div className="w-full h-40 bg-muted rounded mb-3"></div>
                <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : videos.length > 0 ? (
        <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
          <div className="flex w-max space-x-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="relative min-w-[280px] max-w-[280px]"
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
                  onClick={() => onPlayVideo(video)}
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
                    <div className="relative w-full h-40 bg-black rounded mb-3 flex items-center justify-center overflow-hidden">
                      <img
                        src={video.thumbnail || "/placeholder.svg?height=160&width=280&query=video-thumbnail"}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=160&width=280"
                        }}
                      />
                      {!isLive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                          <Play className="h-10 w-10 text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold mb-1 line-clamp-2">{video.title}</h3>
                    {video.streamer && <p className="text-sm text-muted-foreground mb-2">{video.streamer}</p>}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatNumber(video.views)}
                      </span>
                      {video.date && <span>{video.date}</span>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <p className="text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  )
}

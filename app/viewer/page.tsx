"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Eye, Heart, Calendar, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { MobileLayout } from "@/components/mobile-layout"

interface VideoData {
  id: string
  title: string
  description?: string
  views: number
  likes: number
  startDate: string
  endDate: string
  streamer?: string
  chatEnabled: boolean
  duration?: number
}

export default function ViewerPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null)

  const videoType = searchParams.get("type")
  const videoId = searchParams.get("video")

  useEffect(() => {
    if (!videoId) {
      setError("No video ID provided")
      setIsLoading(false)
      return
    }

    // Fetch video data
    fetchVideoData(videoId)
  }, [videoId])

  const fetchVideoData = async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch video details from the new API endpoint
      const response = await fetch(`https://superfan.alterwork.in/api/get_rec_det/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.status === "ok" && data.video) {
          const video = data.video
          const startDate = new Date(video.start)
          const endDate = new Date(video.end)
          const durationMs = endDate.getTime() - startDate.getTime()
          const durationMinutes = Math.floor(durationMs / (1000 * 60))

          setVideoData({
            id: video.hookId,
            title: video.title || `Stream ${video.hookId}`,
            description: video.description,
            views: video.maxviews || 0,
            likes: video.likes || 0,
            startDate: video.start,
            endDate: video.end,
            streamer: video.name,
            chatEnabled: video.chatEnabled,
            duration: durationMinutes,
          })
        } else {
          setError("Video not found")
        }
      } else {
        setError("Failed to load video details")
      }
    } catch (error) {
      console.error("Error fetching video data:", error)
      setError("Failed to load video")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown Date"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch (e) {
      return "Unknown Date"
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const handleBack = () => {
    router.back()
  }

  const handlePlayPause = () => {
    const video = document.getElementById("video-player") as HTMLVideoElement
    if (video) {
      if (isPlaying) {
        video.pause()
      } else {
        video.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleMuteToggle = () => {
    const video = document.getElementById("video-player") as HTMLVideoElement
    if (video) {
      video.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleFullscreen = () => {
    const video = document.getElementById("video-player") as HTMLVideoElement
    if (video) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        video.requestFullscreen()
      }
    }
  }

  const handleRestart = () => {
    const video = document.getElementById("video-player") as HTMLVideoElement
    if (video) {
      video.currentTime = 0
      setCurrentTime(0)
    }
  }

  const handleTimeUpdate = () => {
    const video = document.getElementById("video-player") as HTMLVideoElement
    if (video) {
      setCurrentTime(video.currentTime)
      setDuration(video.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = document.getElementById("video-player") as HTMLVideoElement
    if (video) {
      const time = parseFloat(e.target.value)
      video.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVideoClick = () => {
    handlePlayPause()
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeout) {
      clearTimeout(controlsTimeout)
    }
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
    setControlsTimeout(timeout)
  }

  const handleVideoLoad = () => {
    const video = document.getElementById("video-player") as HTMLVideoElement
    if (video) {
      setDuration(video.duration)
    }
  }

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading video...</p>
          </div>
        </div>
      </MobileLayout>
    )
  }

  if (error) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={handleBack}>Go Back</Button>
          </div>
        </div>
      </MobileLayout>
    )
  }

  if (!videoData) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-500 mb-4">Video not found</p>
            <Button onClick={handleBack}>Go Back</Button>
          </div>
        </div>
      </MobileLayout>
    )
  }

  const videoUrl = `https://superfan.alterwork.in/files/videos/${videoId}.webm`

  return (
    <MobileLayout>
      <div className="min-h-screen bg-black">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm z-10 relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <h1 className="text-white font-semibold truncate max-w-md">
            {videoData.title}
          </h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Video Player Container */}
        <div className="relative w-full bg-black">
          {/* Responsive Video Player */}
          <div 
            className="relative w-full bg-black"
            style={{
              aspectRatio: '16/9',
              minHeight: '200px',
              maxHeight: 'calc(100vh - 200px)'
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              if (isPlaying) {
                setShowControls(false)
              }
            }}
          >
            <video
              id="video-player"
              src={videoUrl}
              className="w-full h-full object-contain bg-black"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleVideoLoad}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={(e) => {
                console.error("Video error:", e)
                setError("Failed to load video")
              }}
              onClick={handleVideoClick}
              controls={false}
              preload="metadata"
              playsInline
            />

            {/* Video Controls Overlay */}
            <div 
              className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
                showControls ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Center Play/Pause Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={handlePlayPause}
                  className="bg-white/20 hover:bg-white/30 text-white border-0 w-16 h-16 rounded-full backdrop-blur-sm"
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" />
                  )}
                </Button>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {/* Progress Bar */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #f97316 0%, #f97316 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) 100%)`
                    }}
                  />
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePlayPause}
                      className="text-white hover:bg-white/20"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMuteToggle}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRestart}
                      className="text-white hover:bg-white/20"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFullscreen}
                      className="text-white hover:bg-white/20"
                    >
                      <Maximize className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Info */}
        <div className="p-4 bg-background">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">{videoData.title}</CardTitle>
                  {videoData.streamer && (
                    <div className="flex items-center gap-2 text-muted-foreground mb-3">
                      <User className="h-4 w-4" />
                      <span>@{videoData.streamer}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {videoData.chatEnabled && (
                    <Badge variant="secondary" className="text-xs">
                      Chat Enabled
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats Row */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{formatNumber(videoData.views)} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  <span>{formatNumber(videoData.likes)} likes</span>
                </div>
                {videoData.duration && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDuration(videoData.duration)}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {videoData.description && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {videoData.description}
                  </p>
                </div>
              )}

              {/* Date */}
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Streamed on {formatDate(videoData.startDate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #f97316;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #f97316;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </MobileLayout>
  )
}
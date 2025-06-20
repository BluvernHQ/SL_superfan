"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { VideoCarousel } from "./video-carousel"
import { Button } from "@/components/ui/button"
import { VideoPlayerModal } from "@/components/video-player-modal" // Import VideoPlayerModal

interface Video {
  id: string
  title: string // ← keep real title
  streamer?: string
  views: number
  date?: string
  thumbnail: string
  hookId?: string
  UID?: string
  description?: string
  videoUrl?: string // NEW – used only in the modal
}

interface ProfileTabsProps {
  username: string
  isOwnProfile: boolean
  pastRecordings: Video[]
  isLoadingRecordings: boolean
  onPlayRecording: (video: Video) => void // Still passed, but now triggers modal
  profileData: any // Full profile data
  onEditProfile?: () => void
  onEditPanels?: () => void
  // Removed currentPlayingVideo and setCurrentPlayingVideo props from here
}

export function ProfileTabs({
  username,
  isOwnProfile,
  pastRecordings,
  isLoadingRecordings,
  onPlayRecording: parentOnPlayRecording, // Renamed to avoid conflict with local handler
  profileData,
  onEditProfile,
  onEditPanels,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("home")
  const [currentPlayingVideo, setCurrentPlayingVideo] = useState<Video | null>(null) // State for VideoPlayerModal

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const handlePlayRecording = (recording: Video) => {
    // Use hookId if available, otherwise fall back to id
    const sourceId = recording.hookId || recording.id

    setCurrentPlayingVideo({
      ...recording,
      videoUrl: `https://superfan.alterwork.in/files/videos/${sourceId}.mp4`,
    })

    // optional callback for analytics, etc.
    parentOnPlayRecording(recording)
  }

  // Removed mainVideoHomeTab logic as it's no longer displayed

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex justify-center mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-1">
          <TabsTrigger value="home">Home</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="home">
        <div className="space-y-6">
          {/* Removed Main Stage Video Player for Home Tab */}

          {/* Recent Broadcasts Shelf */}
          <VideoCarousel
            title="Recent Broadcasts"
            videos={pastRecordings.slice(0, 5)} // <- no field swapping
            onPlayVideo={handlePlayRecording}
            emptyMessage="No recent broadcasts."
            isLoading={isLoadingRecordings}
          />

          {/* Removed Popular Uploads Shelf */}

          {isOwnProfile && (
            <div className="text-right">
              <Button variant="outline" onClick={onEditPanels}>
                Edit Panels
              </Button>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Removed TabsContent for Videos and About */}

      {/* Video Player Modal */}
      {currentPlayingVideo && (
        <VideoPlayerModal
          open={!!currentPlayingVideo}
          onOpenChange={() => setCurrentPlayingVideo(null)}
          videoUrl={currentPlayingVideo.videoUrl || ""}
          videoTitle={currentPlayingVideo.title || ""}
        />
      )}
    </Tabs>
  )
}

"use client"

import type React from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, AlertCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface VideoPlayerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoUrl: string
  videoTitle: string
}

export function VideoPlayerModal({ open, onOpenChange, videoUrl, videoTitle }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasVideoError, setHasVideoError] = useState(false)

  // Pause video and reset error state when modal closes
  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setHasVideoError(false)
    } else if (open) {
      setHasVideoError(false)
    }
  }, [open])

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("Video playback error:", e.currentTarget.error)
    setHasVideoError(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden" hideCloseButton={true}>
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg font-semibold line-clamp-1">{videoTitle}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
          {videoUrl && !hasVideoError ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              onError={handleVideoError}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground p-4 text-center">
              <AlertCircle className="h-12 w-12 mb-4 text-red-500" />
              <p className="text-lg font-medium mb-2">Video Playback Error</p>
              <p className="text-sm">
                The video could not be loaded, either due to a format issue or a problem with the server.
              </p>
              <p className="text-xs mt-2">
                Please ensure the video file (.mp4) is correctly encoded and accessible from the server.
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </DialogContent>
    </Dialog>
  )
}

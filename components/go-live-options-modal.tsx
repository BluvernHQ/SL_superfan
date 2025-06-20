"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, Upload } from "lucide-react"

interface GoLiveOptionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGoLive: () => void
  onUploadVideo: () => void
}

export function GoLiveOptionsModal({ open, onOpenChange, onGoLive, onUploadVideo }: GoLiveOptionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Content</DialogTitle>
          <DialogDescription>Choose how you want to share your content with your audience.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button
            className="w-full h-20 text-lg flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
            onClick={() => {
              onGoLive()
              onOpenChange(false)
            }}
          >
            <Camera className="h-6 w-6" />
            Go Live
          </Button>
          <Button
            variant="outline"
            className="w-full h-20 text-lg flex flex-col items-center justify-center gap-2 border-dashed border-2"
            onClick={() => {
              onUploadVideo()
              onOpenChange(false)
            }}
          >
            <Upload className="h-6 w-6" />
            Upload Video
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

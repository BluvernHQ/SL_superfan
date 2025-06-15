"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check, Share2, Twitter, Facebook, MessageCircle } from "lucide-react"

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  streamUrl: string
  streamTitle: string
}

export function ShareModal({ open, onOpenChange, streamUrl, streamTitle }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(streamUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy URL:", error)
    }
  }

  const handleShareTwitter = () => {
    const text = `Check out my live stream: ${streamTitle}`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(streamUrl)}`
    window.open(url, "_blank")
  }

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(streamUrl)}`
    window.open(url, "_blank")
  }

  const handleShareWhatsApp = () => {
    const text = `Check out my live stream: ${streamTitle} ${streamUrl}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Stream
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stream URL */}
          <div className="space-y-2">
            <Label htmlFor="stream-url">Stream URL</Label>
            <div className="flex gap-2">
              <Input id="stream-url" value={streamUrl} readOnly className="flex-1" />
              <Button variant="outline" size="icon" onClick={handleCopyUrl} className="flex-shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {copied && <p className="text-xs text-green-600">URL copied to clipboard!</p>}
          </div>

          {/* Social Media Sharing */}
          <div className="space-y-3">
            <Label>Share on Social Media</Label>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" onClick={handleShareTwitter} className="justify-start gap-3">
                <Twitter className="h-4 w-4 text-blue-500" />
                Share on Twitter
              </Button>

              <Button variant="outline" onClick={handleShareFacebook} className="justify-start gap-3">
                <Facebook className="h-4 w-4 text-blue-600" />
                Share on Facebook
              </Button>

              <Button variant="outline" onClick={handleShareWhatsApp} className="justify-start gap-3">
                <MessageCircle className="h-4 w-4 text-green-600" />
                Share on WhatsApp
              </Button>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

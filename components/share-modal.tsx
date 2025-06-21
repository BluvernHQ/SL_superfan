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
  isLoadingUrl?: boolean // New prop for loading state of the URL
}

export function ShareModal({ open, onOpenChange, streamUrl, streamTitle, isLoadingUrl = false }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = async () => {
    if (isLoadingUrl || !streamUrl) return // Prevent copying if URL is not ready
    try {
      await navigator.clipboard.writeText(streamUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy URL:", error)
    }
  }

  const handleShareTwitter = () => {
    if (isLoadingUrl || !streamUrl) return
    const text = `Check out my live stream: ${streamTitle}`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(streamUrl)}`
    window.open(url, "_blank")
  }

  const handleShareFacebook = () => {
    if (isLoadingUrl || !streamUrl) return
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(streamUrl)}`
    window.open(url, "_blank")
  }

  const handleShareWhatsApp = () => {
    if (isLoadingUrl || !streamUrl) return
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
              <div className="relative flex-1">
                <Input
                  id="stream-url"
                  value={isLoadingUrl ? "Generating stream URL..." : streamUrl}
                  readOnly
                  disabled={isLoadingUrl}
                  className="flex-1 pr-10" // Add padding for spinner
                />
                {isLoadingUrl && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                disabled={isLoadingUrl || !streamUrl}
                className="flex-shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {copied && <p className="text-xs text-green-600">URL copied to clipboard!</p>}
            {!streamUrl &&
              !isLoadingUrl &&
              open && ( // Show message if URL is empty and not loading (shouldn't happen if logic is correct)
                <p className="text-xs text-red-500">Stream URL not available.</p>
              )}
          </div>

          {/* Social Media Sharing */}
          <div className="space-y-3">
            <Label>Share on Social Media</Label>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                onClick={handleShareTwitter}
                disabled={isLoadingUrl || !streamUrl}
                className="justify-start gap-3"
              >
                <Twitter className="h-4 w-4 text-blue-500" />
                Share on Twitter
              </Button>

              <Button
                variant="outline"
                onClick={handleShareFacebook}
                disabled={isLoadingUrl || !streamUrl}
                className="justify-start gap-3"
              >
                <Facebook className="h-4 w-4 text-blue-600" />
                Share on Facebook
              </Button>

              <Button
                variant="outline"
                onClick={handleShareWhatsApp}
                disabled={isLoadingUrl || !streamUrl}
                className="justify-start gap-3"
              >
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

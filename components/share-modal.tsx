"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check, MessageCircle, Facebook, Twitter } from "lucide-react"

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  streamUrl: string
  streamTitle: string
}

export function ShareModal({ open, onOpenChange, streamUrl, streamTitle }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(streamUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Check out my live stream: ${streamTitle} ${streamUrl}`)
    window.open(`https://wa.me/?text=${text}`, "_blank")
  }

  const handleFacebookShare = () => {
    const url = encodeURIComponent(streamUrl)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank")
  }

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`Check out my live stream: ${streamTitle}`)
    const url = encodeURIComponent(streamUrl)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Your Stream</DialogTitle>
          <DialogDescription>Share your live stream with your audience across different platforms.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Copy Link */}
          <div className="space-y-2">
            <Label htmlFor="stream-url">Stream URL</Label>
            <div className="flex gap-2">
              <Input id="stream-url" value={streamUrl} readOnly className="flex-1" />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="hover:bg-orange-50 dark:hover:bg-orange-950"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {copied && <p className="text-sm text-green-600">Link copied to clipboard!</p>}
          </div>

          {/* Social Media Sharing */}
          <div className="space-y-3">
            <Label>Share on Social Media</Label>
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={handleWhatsAppShare}
                variant="outline"
                className="flex items-center justify-start gap-3 h-12 hover:bg-green-50 dark:hover:bg-green-950 border-green-200 dark:border-green-800"
              >
                <MessageCircle className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">WhatsApp</div>
                  <div className="text-xs text-muted-foreground">Share with your contacts</div>
                </div>
              </Button>

              <Button
                onClick={handleFacebookShare}
                variant="outline"
                className="flex items-center justify-start gap-3 h-12 hover:bg-blue-50 dark:hover:bg-blue-950 border-blue-200 dark:border-blue-800"
              >
                <Facebook className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Facebook</div>
                  <div className="text-xs text-muted-foreground">Share on your timeline</div>
                </div>
              </Button>

              <Button
                onClick={handleTwitterShare}
                variant="outline"
                className="flex items-center justify-start gap-3 h-12 hover:bg-slate-50 dark:hover:bg-slate-950 border-slate-200 dark:border-slate-800"
              >
                <Twitter className="h-5 w-5 text-slate-600" />
                <div className="text-left">
                  <div className="font-medium">X (Twitter)</div>
                  <div className="text-xs text-muted-foreground">Tweet to your followers</div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

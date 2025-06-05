"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Copy, Check } from "lucide-react"
import { format } from "date-fns"

interface StreamSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StreamSettingsModal({ open, onOpenChange }: StreamSettingsModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [scheduleDate, setScheduleDate] = useState<Date>()
  const [enableChat, setEnableChat] = useState(true)
  const [isScheduled, setIsScheduled] = useState(false)
  const [copied, setCopied] = useState(false)

  const streamUrl = "https://streamapp.com/live/user123"

  const handleCopyLink = () => {
    navigator.clipboard.writeText(streamUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartLive = () => {
    // Redirect to streamer page
    window.location.href = "/streamer"
  }

  const handleSave = () => {
    // Save settings logic here
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Stream Settings</DialogTitle>
          <DialogDescription>Configure your stream settings before going live.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stream Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Stream Title</Label>
            <Input
              id="title"
              placeholder="Enter your stream title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you'll be streaming..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gaming">Gaming</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="art">Art</SelectItem>
                <SelectItem value="cooking">Cooking</SelectItem>
                <SelectItem value="tech">Technology</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Stream */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch id="schedule" checked={isScheduled} onCheckedChange={setIsScheduled} />
              <Label htmlFor="schedule">Schedule Stream</Label>
            </div>

            {isScheduled && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} initialFocus />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Enable Chat */}
          <div className="flex items-center space-x-2">
            <Switch id="chat" checked={enableChat} onCheckedChange={setEnableChat} />
            <Label htmlFor="chat">Enable Chat</Label>
          </div>

          {/* Share Link */}
          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex space-x-2">
              <Input value={streamUrl} readOnly />
              <Button variant="outline" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isScheduled && (
            <Button
              onClick={handleStartLive}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Start Instant Live
            </Button>
          )}
          <Button variant="outline" onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

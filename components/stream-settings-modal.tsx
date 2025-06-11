"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface StreamSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StreamSettingsModal({ open, onOpenChange }: StreamSettingsModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [enableChat, setEnableChat] = useState(true)
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({})

  // Parse tags from comma-separated input
  const tags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

  const validateForm = () => {
    const newErrors: { title?: string; description?: string } = {}

    if (!title.trim()) {
      newErrors.title = "Stream title is required"
    }

    if (!description.trim()) {
      newErrors.description = "Stream description is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStartLive = () => {
    if (validateForm()) {
      // Store stream settings in localStorage or pass to streamer page
      const streamSettings = {
        title: title.trim(),
        description: description.trim(),
        tags: tags,
        enableChat,
      }
      localStorage.setItem("streamSettings", JSON.stringify(streamSettings))

      // Redirect to streamer page
      window.location.href = "/streamer"
    }
  }

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove)
    setTagsInput(newTags.join(", "))
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
            <Label htmlFor="title">
              Stream Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter your stream title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (errors.title) {
                  setErrors((prev) => ({ ...prev, title: undefined }))
                }
              }}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe what you'll be streaming..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (errors.description) {
                  setErrors((prev) => ({ ...prev, description: undefined }))
                }
              }}
              rows={3}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="gaming, music, art, cooking (separate with commas)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas. Press Enter or continue typing to create tags.
            </p>

            {/* Display parsed tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Enable Chat */}
          <div className="flex items-center space-x-2">
            <Switch id="chat" checked={enableChat} onCheckedChange={setEnableChat} />
            <Label htmlFor="chat">Enable Chat</Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleStartLive}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
          >
            Start Live Stream
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

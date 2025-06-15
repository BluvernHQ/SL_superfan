"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"

interface StreamSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: () => void
}

export function StreamSettingsModal({ open, onOpenChange, onSave }: StreamSettingsModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [enableChat, setEnableChat] = useState(true)

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("streamSettings")
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setTitle(settings.title || "")
        setDescription(settings.description || "")
        setTags(settings.tags || [])
        setEnableChat(settings.enableChat ?? true)
      } catch (error) {
        console.error("Error loading stream settings:", error)
      }
    }
  }, [open])

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSave = () => {
    if (!title.trim()) {
      alert("Please enter a stream title")
      return
    }

    const settings = {
      title: title.trim(),
      description: description.trim(),
      tags,
      enableChat,
    }

    localStorage.setItem("streamSettings", JSON.stringify(settings))
    onOpenChange(false)

    // Call the onSave callback if provided
    if (onSave) {
      onSave()
    }

    // Reload the page to apply new settings
    window.location.reload()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>Stream Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="stream-title">Stream Title *</Label>
            <Input
              id="stream-title"
              placeholder="Enter your stream title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">{title.length}/100 characters</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="stream-description">Description</Label>
            <Textarea
              id="stream-description"
              placeholder="Describe what you'll be streaming..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (Optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                maxLength={20}
                disabled={tags.length >= 5}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddTag}
                disabled={!newTag.trim() || tags.includes(newTag.trim()) || tags.length >= 5}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">Add up to 5 tags to help viewers find your stream</p>
          </div>

          {/* Chat Settings */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-chat">Enable Chat</Label>
              <p className="text-sm text-muted-foreground">Allow viewers to chat during your stream</p>
            </div>
            <Switch id="enable-chat" checked={enableChat} onCheckedChange={setEnableChat} />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
            >
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

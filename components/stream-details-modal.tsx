"use client"

import React from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"

interface StreamDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // These props are now for initial values or controlled inputs within the modal
  initialTitle: string
  initialDescription: string
  initialTags: string[]
  initialEnableChat: boolean
  // This callback now passes the collected details
  onConfirmDetails: (details: {
    title: string
    description: string
    tags: string[]
    enableChat: boolean
  }) => void
  isLoading: boolean
  firebaseUid: string | null
}

export function StreamDetailsModal({
  open,
  onOpenChange,
  initialTitle,
  initialDescription,
  initialTags,
  initialEnableChat,
  onConfirmDetails,
  isLoading,
  firebaseUid,
}: StreamDetailsModalProps) {
  // Internal states for the modal's form fields
  const [title, setTitle] = React.useState(initialTitle)
  const [description, setDescription] = React.useState(initialDescription)
  const [tags, setTags] = React.useState(initialTags)
  const [newTag, setNewTag] = React.useState("")
  const [enableChat, setEnableChat] = React.useState(initialEnableChat)

  // Update internal states when initial props change (e.g., for "Continue with Old")
  React.useEffect(() => {
    setTitle(initialTitle)
    setDescription(initialDescription)
    setTags(initialTags)
    setEnableChat(initialEnableChat)
  }, [initialTitle, initialDescription, initialTags, initialEnableChat])

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleStartStreamClick = () => {
    onConfirmDetails({ title, description, tags, enableChat })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" hideCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Stream Details</DialogTitle>
          <DialogDescription>
            Fill in the details for your live stream. This information will be visible to your viewers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="stream-title">
              Stream Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="stream-title"
              placeholder="Enter your stream title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required // Make title required
            />
            <p className="text-xs text-muted-foreground">{title.length}/100 characters</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="stream-description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="stream-description"
              placeholder="Describe what you'll be streaming..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              required // Make description required
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
        </div>
        <DialogFooter>
          <Button
            onClick={handleStartStreamClick}
            disabled={!firebaseUid || isLoading || !title.trim() || !description.trim()} // Updated disabled condition
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Starting Stream...
              </>
            ) : (
              "Start Stream"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, X, Upload } from "lucide-react"
import { auth } from "@/lib/firebase"
import { getIdToken } from "firebase/auth"

interface UserProfileData {
  UID: string
  display_name: string
  email: string
  sessions: number
  followers: number
  following: number
  status: string
  blacklist: string[]
  created_at: string
  bio?: string
}

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profileData: UserProfileData | null
  onSave: (updatedData: Partial<UserProfileData>) => void
  initialAboutData: any | null
}

export function EditProfileModal({ isOpen, onClose, profileData, onSave, initialAboutData }: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    email: "",
    category: "gaming",
    language: "english",
    twitter: "",
    youtube: "",
    instagram: "",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update form data when modal opens or initialAboutData changes
  useEffect(() => {
    if (isOpen && initialAboutData) {
      console.log("Loading form data from about endpoint:", initialAboutData)
      setFormData({
        name: initialAboutData.name || "",
        bio: initialAboutData.bio || "",
        email: initialAboutData.email || "",
        category: initialAboutData.channel_category || "gaming",
        language: initialAboutData.stream_Language || "english",
        twitter: initialAboutData.twitter_link || "",
        youtube: initialAboutData.youtube_link || "",
        instagram: initialAboutData.instagram_link || "",
      })

      // Reset file selection when modal opens
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setError(null)
    }
  }, [isOpen, initialAboutData])

  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {
      Accept: "application/json",
    }

    if (auth.currentUser) {
      try {
        const authToken = await getIdToken(auth.currentUser)
        headers["Authorization"] = `Bearer ${authToken}`
      } catch (tokenError) {
        console.log(`Error getting Firebase token: ${tokenError}`)
      }
    }

    return headers
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== "image/png") {
      // Changed from startsWith("image/") to exact "image/png"
      setError("Please select a PNG image file") // Updated error message
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview URL
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCameraClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    if (!auth.currentUser) {
      setError("You must be logged in to edit your profile")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()

      // Create FormData to handle file upload
      const formDataToSend = new FormData()

      // Add the payload as a JSON string
      const payload = {
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        email: formData.email.trim(),
        channel_category: formData.category,
        stream_Language: formData.language,
        twitter_link: formData.twitter.trim(),
        youtube_link: formData.youtube.trim(),
        instagram_link: formData.instagram.trim(),
      }

      formDataToSend.append("payload", JSON.stringify({ payload }))

      // Add the profile picture if selected
      if (selectedFile) {
        formDataToSend.append("profile_picture", selectedFile)
      }

      const response = await fetch("https://superfan.alterwork.in/api/edit_profile", {
        method: "POST",
        headers: {
          // Don't set Content-Type header - let the browser set it for FormData
          Authorization: headers["Authorization"] || "",
        },
        body: formDataToSend,
      })

      if (response.ok) {
        const responseData = await response.json()
        console.log("Profile updated successfully:", responseData)

        // Update the local profile data
        const updatedData = {
          display_name: formData.name.trim(),
          bio: formData.bio.trim(),
          email: formData.email.trim(),
        }

        onSave(updatedData)
        onClose()

        // Reset file selection
        setSelectedFile(null)
        setPreviewUrl(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }

        // Show success message
        alert("Profile updated successfully!")
      } else {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }))

        console.error("Failed to update profile:", response.status, errorData)
        setError(errorData.message || errorData.reason || "Failed to update profile. Please try again.")
      }
    } catch (error: any) {
      console.error("Error updating profile:", error)
      setError(error.message || "Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to original values from about data
    if (initialAboutData) {
      setFormData({
        name: initialAboutData.name || "",
        bio: initialAboutData.bio || "",
        email: initialAboutData.email || "",
        category: initialAboutData.channel_category || "gaming",
        language: initialAboutData.stream_Language || "english",
        twitter: initialAboutData.twitter_link || "",
        youtube: initialAboutData.youtube_link || "",
        instagram: initialAboutData.instagram_link || "",
      })
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setError(null)
    onClose()
  }

  const getCurrentProfilePicture = () => {
    if (previewUrl) return previewUrl
    return `https://superfan.alterwork.in/files/profilepic/${profileData?.display_name}.png`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-[#252731] border-[#1f2128]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold text-white">Edit Profile</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Profile Picture Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage
                    src={getCurrentProfilePicture() || "/placeholder.svg"}
                    alt={profileData?.display_name}
                    onError={(e) => {
                      if (!previewUrl) {
                        e.currentTarget.src = "/placeholder.svg?height=80&width=80"
                      }
                    }}
                  />
                  <AvatarFallback className="text-2xl bg-[#1f2128] text-white">
                    {profileData?.display_name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-orange-500 hover:bg-orange-600 border-2 border-[#252731]"
                  onClick={handleCameraClick}
                  type="button"
                >
                  <Camera className="h-4 w-4 text-white" />
                </Button>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white">Profile Picture</h3>
                <p className="text-sm text-gray-400">
                  {selectedFile
                    ? `Selected: ${selectedFile.name}`
                    : "Click the camera icon to upload a new profile picture"}
                </p>
                {selectedFile && (
                  <p className="text-xs text-gray-500 mt-1">Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                )}
              </div>
            </div>

            {/* File Input */}
            <input ref={fileInputRef} type="file" accept="image/png" onChange={handleFileSelect} className="hidden" />

            {/* File Upload Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCameraClick}
                className="border-[#1f2128] text-gray-300 hover:text-white hover:bg-[#1f2128]"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Image
              </Button>
              {selectedFile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Remove
                </Button>
              )}
            </div>

            {/* Image Requirements */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Supported format: PNG</p> {/* Updated text */}
              <p>• Maximum file size: 5MB</p>
              <p>• Recommended: Square image (1:1 aspect ratio)</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter your name"
              className="bg-[#1f2128] border-[#161616] text-white placeholder:text-gray-500 focus:border-orange-500"
              maxLength={30}
            />
            <p className="text-xs text-gray-400">{formData.name.length}/30 characters</p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-white">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Tell people about yourself..."
              className="bg-[#1f2128] border-[#161616] text-white placeholder:text-gray-500 focus:border-orange-500 min-h-[100px] resize-none"
              maxLength={200}
            />
            <p className="text-xs text-gray-400">{formData.bio.length}/200 characters</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter your email"
              className="bg-[#1f2128] border-[#161616] text-white placeholder:text-gray-500 focus:border-orange-500"
            />
          </div>

          {/* Channel Settings */}
          <div className="space-y-4">
            <h3 className="font-medium text-white border-b border-[#1f2128] pb-2">Channel Settings</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Channel Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  className="w-full p-2 bg-[#1f2128] border border-[#161616] rounded-md text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="gaming">Gaming</option>
                  <option value="music">Music</option>
                  <option value="art">Art & Creative</option>
                  <option value="tech">Technology</option>
                  <option value="education">Education</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Stream Language</Label>
                <select
                  value={formData.language}
                  onChange={(e) => handleInputChange("language", e.target.value)}
                  className="w-full p-2 bg-[#1f2128] border border-[#161616] rounded-md text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="english">English</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                  <option value="japanese">Japanese</option>
                  <option value="korean">Korean</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="font-medium text-white border-b border-[#1f2128] pb-2">Social Links</h3>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-white">Twitter/X</Label>
                <Input
                  value={formData.twitter}
                  onChange={(e) => handleInputChange("twitter", e.target.value)}
                  placeholder="https://twitter.com/yourusername"
                  className="bg-[#1f2128] border-[#161616] text-white placeholder:text-gray-500 focus:border-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">YouTube</Label>
                <Input
                  value={formData.youtube}
                  onChange={(e) => handleInputChange("youtube", e.target.value)}
                  placeholder="https://youtube.com/@yourusername"
                  className="bg-[#1f2128] border-[#161616] text-white placeholder:text-gray-500 focus:border-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Instagram</Label>
                <Input
                  value={formData.instagram}
                  onChange={(e) => handleInputChange("instagram", e.target.value)}
                  placeholder="https://instagram.com/yourusername"
                  className="bg-[#1f2128] border-[#161616] text-white placeholder:text-gray-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#1f2128]">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="border-[#1f2128] text-gray-300 hover:text-white hover:bg-[#1f2128]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

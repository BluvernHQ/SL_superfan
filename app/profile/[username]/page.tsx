"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, Users, Eye, UserMinus } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, getIdToken } from "firebase/auth"
import { useRouter } from "next/navigation"
import { VideoPlayerModal } from "@/components/video-player-modal" // Import the new modal

export default function ProfilePage({ params }: { params: { username: string } }) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [blacklistedUsers, setBlacklistedUsers] = useState<string[]>([])
  const [pastRecordings, setPastRecordings] = useState<any[]>([])
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(true)
  const router = useRouter()

  // State for video player modal
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [currentVideoUrl, setCurrentVideoUrl] = useState("")
  const [currentVideoTitle, setCurrentVideoTitle] = useState("")

  // Mock profile data (will be partially replaced by API calls)
  const profileUser = {
    username: params.username,
    followers: 2400, // This might also come from a user profile API later
    following: 156, // This might also come from a user profile API later
    isLive: false, // This should come from /get_live endpoint
    currentStream: null, // This should come from /get_live endpoint
  }

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    if (auth.currentUser) {
      try {
        const authToken = await getIdToken(auth.currentUser)
        headers["Authorization"] = `Bearer ${authToken}`
        console.log("Firebase auth token added to request headers")
      } catch (tokenError) {
        console.log(`Error getting Firebase token: ${tokenError}`)
      }
    }

    return headers
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      if (user?.displayName === params.username) {
        setIsOwnProfile(true)
      }
    })
    return () => unsubscribe()
  }, [params.username])

  const fetchPastRecordings = async () => {
    setIsLoadingRecordings(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/get_rec", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            username: params.username,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Raw past recordings data from /get_rec:", data) // Debug log

        if (Array.isArray(data.user)) {
          const transformedRecordings = data.user.map((rec: any) => ({
            id: rec.roomId, // Use roomId as unique ID
            title: rec.room_description || `Recording from ${rec.start ? rec.start.split("T")[0] : "Unknown Date"}`, // Use room_description if available, fallback to formatted date
            views: rec.views || 0,
            date: formatDate(rec.start), // Format start time as date
            thumbnail: `https://superfan.alterwork.in/files/thumbnails/${rec.roomId}.jpg`,
          }))
          console.log("Transformed recordings for UI:", transformedRecordings) // Debug log
          setPastRecordings(transformedRecordings)
        } else {
          console.warn("Unexpected response format for /get_rec:", data)
          setPastRecordings([])
        }
      } else {
        console.error("Failed to fetch past recordings:", response.status, response.statusText)
        setPastRecordings([])
      }
    } catch (error) {
      console.error("Error fetching past recordings:", error)
      setPastRecordings([])
    } finally {
      setIsLoadingRecordings(false)
    }
  }

  useEffect(() => {
    if (params.username) {
      fetchPastRecordings()
    }
  }, [params.username, currentUser]) // Re-fetch if username or auth status changes

  const handleBlacklistUser = (username: string) => {
    setBlacklistedUsers((prev) => [...prev, username])
  }

  const handleUnblacklistUser = (username: string) => {
    setBlacklistedUsers((prev) => prev.filter((u) => u !== username))
  }

  const handlePlayRecording = (recording: any) => {
    setCurrentVideoUrl(`https://superfan.alterwork.in/files/videos/${recording.id}.webm`)
    setCurrentVideoTitle(recording.title)
    setShowVideoModal(true)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        // Check for invalid date
        console.warn("Invalid date string passed to formatDate:", dateString)
        return "Invalid Date"
      }
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    } catch (e) {
      console.error("Error formatting date:", e)
      return "Invalid Date"
    }
  }

  console.log("ProfilePage rendering. isLoadingRecordings:", isLoadingRecordings)
  console.log("ProfilePage rendering. pastRecordings.length:", pastRecordings.length)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Profile Header */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src="/placeholder.svg" alt={profileUser.username} />
                  <AvatarFallback className="text-2xl">{profileUser.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold">@{profileUser.username}</h1>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <span>
                      <strong>{formatNumber(profileUser.followers)}</strong> followers
                    </span>
                    {isOwnProfile && (
                      <span>
                        <strong>{formatNumber(profileUser.following)}</strong> following
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isOwnProfile && (
                    <>
                      <Button
                        variant={isFollowing ? "secondary" : "default"}
                        onClick={() => setIsFollowing(!isFollowing)}
                        className={!isFollowing ? "bg-gradient-to-r from-orange-600 to-orange-500" : ""}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleBlacklistUser(profileUser.username)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Live Stream (Placeholder - will need API integration) */}
          {profileUser.isLive && (
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Badge variant="destructive" className="animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                    LIVE NOW
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-base mb-2 line-clamp-2">{profileUser.currentStream?.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Users className="w-4 h-4" />
                      {formatNumber(profileUser.currentStream?.viewers || 0)} watching
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() => window.open(`/viewer?roomId=${profileUser.currentStream?.roomId}`, "_blank")}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Watch Live
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Past Recordings Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Past Recordings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRecordings ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="animate-pulse max-w-sm">
                    <CardContent className="p-4">
                      <div className="w-full h-40 bg-muted rounded mb-3"></div>
                      <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="h-3 bg-muted rounded w-1/4"></div>
                        <div className="h-3 bg-muted rounded w-1/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pastRecordings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pastRecordings.map((recording) => {
                  console.log("Attempting to render recording:", recording.id, recording.title) // Debug log inside map
                  return (
                    <Card
                      key={recording.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow max-w-sm"
                      onClick={() => handlePlayRecording(recording)} // Add onClick handler
                    >
                      <CardContent className="p-4">
                        <div className="w-full h-40 bg-black rounded mb-3 flex items-center justify-center overflow-hidden">
                          <img
                            src={recording.thumbnail || "/placeholder.svg?height=160&width=256&query=video-thumbnail"}
                            alt={recording.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=160&width=256"
                            }}
                          />
                        </div>
                        <h4 className="font-semibold mb-2 line-clamp-2">{recording.title}</h4>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {formatNumber(recording.views)}
                          </span>
                          <span>{recording.date}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No past recordings found for this user.</p>
            )}
          </CardContent>
        </Card>

        {/* Blacklisted Users (Only for own profile) */}
        {isOwnProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Blacklisted Users</CardTitle>
            </CardHeader>
            <CardContent>
              {blacklistedUsers.length > 0 ? (
                <div className="space-y-2">
                  {blacklistedUsers.map((username) => (
                    <div key={username} className="flex items-center justify-between p-2 border rounded">
                      <span>@{username}</span>
                      <Button size="sm" variant="outline" onClick={() => handleUnblacklistUser(username)}>
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No blacklisted users</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Video Player Modal */}
      <VideoPlayerModal
        open={showVideoModal}
        onOpenChange={setShowVideoModal}
        videoUrl={currentVideoUrl}
        videoTitle={currentVideoTitle}
      />
    </div>
  )
}

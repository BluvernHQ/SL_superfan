"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, Users, Eye } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, getIdToken } from "firebase/auth"
import { useRouter } from "next/navigation"
import { VideoPlayerModal } from "@/components/video-player-modal" // Import the new modal

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
}

export default function ProfilePage({ params }: { params: { username: string } }) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [blacklistedUsers, setBlacklistedUsers] = useState<string[]>([])
  const [isLoadingBlocklist, setIsLoadingBlocklist] = useState(false)
  const [pastRecordings, setPastRecordings] = useState<any[]>([])
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(true)
  const router = useRouter()
  const [isFollowingAction, setIsFollowingAction] = useState(false)
  const [profileData, setProfileData] = useState<UserProfileData | null>(null) // New state for user profile data
  const [isLoadingProfile, setIsLoadingProfile] = useState(true) // New loading state for profile data
  const [isBlocked, setIsBlocked] = useState(false)
  const [isBlockingAction, setIsBlockingAction] = useState(false)

  // State for video player modal
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [currentVideoUrl, setCurrentVideoUrl] = useState("")
  const [currentVideoTitle, setCurrentVideoTitle] = useState("")

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json", // Fixed: Removed the backslash here
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

  const fetchUserDetails = async () => {
    setIsLoadingProfile(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/get_user", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            username: params.username,
          },
        }),
      })

      if (response.ok) {
        const data: UserProfileData = await response.json()
        console.log("User details from /get_user:", data["user"])
        setProfileData(data["user"])
        // Update isOwnProfile based on fetched UID and current user's UID
        if (currentUser && currentUser.uid === data.UID) {
          setIsOwnProfile(true)
        } else {
          setIsOwnProfile(false)
        }
      } else {
        console.error("Failed to fetch user details:", response.status, response.statusText)
        setProfileData(null)
      }
    } catch (error) {
      console.error("Error fetching user details:", error)
      setProfileData(null)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  useEffect(() => {
    if (params.username) {
      fetchUserDetails()
      fetchPastRecordings()
    }
  }, [params.username, currentUser])

  // Add a separate useEffect for blocklist that depends on currentUser (not just isOwnProfile)
  useEffect(() => {
    if (currentUser) {
      fetchBlocklist()
    }
  }, [currentUser, params.username])

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
            title: rec.description || `Recording from ${rec.start ? rec.start.split("T")[0] : "Unknown Date"}`, // Use room_description if available, fallback to formatted date
            views: rec.maxviews || 0,
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

  const fetchBlocklist = async () => {
    if (!currentUser) return

    setIsLoadingBlocklist(true)
    try {
      const headers = await getAuthHeaders()

      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch("https://superfan.alterwork.in/api/fetch_blocklist", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            username: currentUser.displayName,
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        console.log("Blocklist data:", data)

        // Handle the correct API response format: {'blocklist': [{'blocklist': 'username'}, ...]}
        if (data.blocklist && Array.isArray(data.blocklist)) {
          const usernames = data.blocklist.map((item: any) => item.blocklist || item)
          setBlacklistedUsers(usernames)
        } else {
          console.warn("Unexpected blocklist response format:", data)
          setBlacklistedUsers([])
        }
      } else {
        console.error("Failed to fetch blocklist:", response.status, response.statusText)
        // Don't show error to user, just use empty list
        setBlacklistedUsers([])
      }
    } catch (error: any) {
      console.error("Error fetching blocklist:", error)

      if (error.name === "AbortError") {
        console.log("Blocklist fetch request timed out")
      } else if (error.message === "Failed to fetch") {
        console.log("Network error fetching blocklist - using empty list")
      }

      // Gracefully handle error by using empty list
      setBlacklistedUsers([])
    } finally {
      setIsLoadingBlocklist(false)
    }
  }

  const handleBlacklistUser = async (username: string) => {
    if (!currentUser) return

    try {
      const headers = await getAuthHeaders()

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch("https://superfan.alterwork.in/api/add_blocklist", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            blocklist_by: currentUser.displayName,
            blocklist: username,
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        setBlacklistedUsers((prev) => [...prev, username])
        console.log(`Successfully blocked ${username}`)
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        console.error(`Failed to block user: ${response.status} - ${errorData.message || errorData.reason}`)
        alert(`Failed to block user: ${errorData.message || "Please try again."}`)
      }
    } catch (error: any) {
      console.error(`Error blocking user: ${error.message}`)
      if (error.name !== "AbortError") {
        alert(`Error blocking user: ${error.message}`)
      }
    }
  }

  const handleUnblacklistUser = async (username: string) => {
    if (!currentUser) return

    try {
      const headers = await getAuthHeaders()

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch("https://superfan.alterwork.in/api/remove_blocklist", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            blocklist_by: currentUser.displayName,
            blocklist: username,
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        setBlacklistedUsers((prev) => prev.filter((u) => u !== username))
        console.log(`Successfully unblocked ${username}`)
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        console.error(`Failed to unblock user: ${response.status} - ${errorData.message || errorData.reason}`)
        alert(`Failed to unblock user: ${errorData.message || "Please try again."}`)
      }
    } catch (error: any) {
      console.error(`Error unblocking user: ${error.message}`)
      if (error.name !== "AbortError") {
        alert(`Error unblocking user: ${error.message}`)
      }
    }
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

  const handleFollow = async () => {
    if (!currentUser) {
      router.push("/login?redirect=/profile/" + params.username)
      return
    }
    if (isFollowing || isFollowingAction || isOwnProfile) {
      return
    }
    setIsFollowingAction(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/create_follower", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            follow: params.username,
          },
        }),
      })

      if (response.ok) {
        setIsFollowing(true)
        // Optionally, update followers count if API returns it
        console.log(`Successfully followed ${params.username}.`)
        // Optimistically update followers count
        setProfileData((prev) => (prev ? { ...prev, followers: prev.followers + 1 } : null))
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        console.error(`Failed to follow: ${response.status} - ${errorData.message || errorData.reason}`)
        alert(`Failed to follow user: ${errorData.message || "Please try again."}`)
      }
    } catch (error: any) {
      console.error(`Error following user: ${error.message}`)
      alert(`Error following user: ${error.message}`)
    } finally {
      setIsFollowingAction(false)
    }
  }

  const handleUnfollow = async () => {
    if (!currentUser) {
      router.push("/login?redirect=/profile/" + params.username)
      return
    }
    if (!isFollowing || isFollowingAction || isOwnProfile) {
      return
    }
    setIsFollowingAction(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/un_follow", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            unfollow: params.username,
          },
        }),
      })

      if (response.ok) {
        setIsFollowing(false)
        // Optionally, update followers count if API returns it
        console.log(`Successfully unfollowed ${params.username}.`)
        // Optimistically update followers count
        setProfileData((prev) => (prev ? { ...prev, followers: Math.max(0, prev.followers - 1) } : null))
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        console.error(`Failed to unfollow: ${response.status} - ${errorData.message || errorData.reason}`)
        alert(`Failed to unfollow user: ${errorData.message || "Please try again."}`)
      }
    } catch (error: any) {
      console.error(`Error unfollowing user: ${error.message}`)
      alert(`Error unfollowing user: ${error.message}`)
    } finally {
      setIsFollowingAction(false)
    }
  }

  const checkIfFollowing = async () => {
    if (!currentUser || isOwnProfile) {
      setIsFollowing(false)
      return
    }
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/did_follow", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            did_follow: params.username,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsFollowing(data.followed)
      } else {
        console.error("Failed to check follow status:", response.status, response.statusText)
        setIsFollowing(false)
      }
    } catch (error) {
      console.error("Error checking follow status:", error)
      setIsFollowing(false)
    }
  }

  const checkIfBlocked = async () => {
    if (!currentUser || isOwnProfile) {
      setIsBlocked(false)
      return
    }
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/is_blocklist", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            blocklist: params.username,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsBlocked(data.blocked || false)
      } else {
        console.error("Failed to check block status:", response.status, response.statusText)
        setIsBlocked(false)
      }
    } catch (error) {
      console.error("Error checking block status:", error)
      setIsBlocked(false)
    }
  }

  useEffect(() => {
    if (params.username && currentUser) {
      checkIfFollowing()
      checkIfBlocked()
    }
  }, [params.username, currentUser, isOwnProfile])

  const handleBlockUser = async () => {
    if (!currentUser || isOwnProfile) return

    setIsBlockingAction(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/add_blocklist", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            blocklist_by: currentUser.displayName,
            blocklist: params.username,
          },
        }),
      })

      if (response.ok) {
        setIsBlocked(true)
        console.log(`Successfully blocked ${params.username}`)
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        console.error(`Failed to block user: ${response.status} - ${errorData.message || errorData.reason}`)
        alert(`Failed to block user: ${errorData.message || "Please try again."}`)
      }
    } catch (error: any) {
      console.error(`Error blocking user: ${error.message}`)
      alert(`Error blocking user: ${error.message}`)
    } finally {
      setIsBlockingAction(false)
    }
  }

  const handleUnblockUser = async () => {
    if (!currentUser || isOwnProfile) return

    setIsBlockingAction(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/remove_blocklist", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            blocklist_by: currentUser.displayName,
            blocklist: params.username,
          },
        }),
      })

      if (response.ok) {
        setIsBlocked(false)
        console.log(`Successfully unblocked ${params.username}`)
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        console.error(`Failed to unblock user: ${response.status} - ${errorData.message || errorData.reason}`)
        alert(`Failed to unblock user: ${errorData.message || "Please try again."}`)
      }
    } catch (error: any) {
      console.error(`Error unblocking user: ${error.message}`)
      alert(`Error unblocking user: ${error.message}`)
    } finally {
      setIsBlockingAction(false)
    }
  }

  useEffect(() => {
    // Reset states when navigating to a different profile
    setProfileData(null)
    setIsLoadingProfile(true)
    setPastRecordings([])
    setIsLoadingRecordings(true)
    setBlacklistedUsers([])
    setIsLoadingBlocklist(false)
    setIsFollowing(false)
    setIsBlocked(false)
    setIsOwnProfile(false)
  }, [params.username])

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
              {isLoadingProfile ? (
                <div className="flex items-center gap-6 animate-pulse">
                  <div className="w-24 h-24 rounded-full bg-muted"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-8 bg-muted rounded w-3/4"></div>
                    <div className="flex gap-6">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ) : profileData ? (
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage
                      src={`https://superfan.alterwork.in/files/profilepic/${profileData?.display_name || params.username}.png`}
                      alt={profileData?.display_name || params.username}
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=96&width=96"
                      }}
                    />
                    <AvatarFallback className="text-2xl">
                      {profileData?.display_name?.charAt(0)?.toUpperCase() || params.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-3xl font-bold">@{profileData?.display_name || params.username}</h1>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <span>
                        <strong>{formatNumber(profileData?.followers || 0)}</strong> followers
                      </span>
                      <span>
                        <strong>{formatNumber(profileData?.following || 0)}</strong> following
                      </span>
                      <span>
                        <strong>{formatNumber(profileData?.sessions || 0)}</strong> sessions
                      </span>
                    </div>
                  </div>
                  {!isOwnProfile && currentUser && currentUser.displayName !== params.username && (
                    <div className="flex gap-2">
                      <Button
                        variant={isFollowing ? "secondary" : "default"}
                        onClick={isFollowing ? handleUnfollow : handleFollow}
                        disabled={isFollowingAction || !currentUser}
                        className={!isFollowing ? "bg-gradient-to-r from-orange-600 to-orange-500" : ""}
                      >
                        {isFollowingAction
                          ? isFollowing
                            ? "Unfollowing..."
                            : "Following..."
                          : isFollowing
                            ? "Following"
                            : "Follow"}
                      </Button>
                      <Button
                        variant={isBlocked ? "outline" : "destructive"}
                        onClick={isBlocked ? handleUnblockUser : handleBlockUser}
                        disabled={isBlockingAction || !currentUser}
                      >
                        {isBlockingAction
                          ? isBlocked
                            ? "Unblocking..."
                            : "Blocking..."
                          : isBlocked
                            ? "Unblock"
                            : "Block"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>User profile not found.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Live Stream (Placeholder - will need API integration) */}
          {profileData?.status === "live" && (
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
                    <h3 className="font-semibold text-base mb-2 line-clamp-2">{profileData.display_name}'s Stream</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Users className="w-4 h-4" />
                      {/* Assuming currentStream details would come from a separate API call or be part of profileData */}
                      {formatNumber(0)} watching {/* Placeholder for live viewers */}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() => window.open(`/viewer?roomId=${profileData.UID}`, "_blank")} // Assuming UID can be used as roomId for live stream
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

        {/* Blacklisted Users (For any logged-in user) */}
        {currentUser && (
          <Card>
            <CardHeader>
              <CardTitle>Blacklisted Users</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBlocklist ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-8 bg-muted rounded w-16"></div>
                    </div>
                  ))}
                </div>
              ) : blacklistedUsers.length > 0 ? (
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

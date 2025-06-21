"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, getIdToken } from "firebase/auth"
import { useRouter } from "next/navigation"
import { ProfileTabs } from "@/components/profile-tabs"

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
  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isBlocked, setIsBlocked] = useState(false)
  const [isBlockingAction, setIsBlockingAction] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [followersList, setFollowersList] = useState<string[]>([])
  const [followingList, setFollowingList] = useState<string[]>([])
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false)
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false)

  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
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

  // Check if this is own profile based on current user and profile data
  const checkIsOwnProfile = (user: any, profileData: UserProfileData | null) => {
    if (!user || !profileData) return false

    console.log("Checking ownership:")
    console.log("- User displayName:", user.displayName)
    console.log("- User UID:", user.uid)
    console.log("- Profile username:", params.username)
    console.log("- Profile UID:", profileData.UID)

    // Check both displayName and UID
    const isOwnerByName = user.displayName === params.username
    const isOwnerByUID = user.uid === profileData.UID

    console.log("- Owner by name:", isOwnerByName)
    console.log("- Owner by UID:", isOwnerByUID)

    return isOwnerByName || isOwnerByUID
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user?.displayName)
      setCurrentUser(user)
      setAuthLoaded(true)
    })
    return () => unsubscribe()
  }, [])

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
        const data = await response.json()
        console.log("Fetched user data:", data)
        const userData = data["user"] || data
        setProfileData(userData)

        // Check ownership after we have both user and profile data
        const isOwner = checkIsOwnProfile(currentUser, userData)
        setIsOwnProfile(isOwner)
        console.log("Setting isOwnProfile to:", isOwner)
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

  // Fetch user details when auth is loaded and we have the username
  useEffect(() => {
    if (authLoaded && params.username) {
      fetchUserDetails()
      fetchPastRecordings()
    }
  }, [authLoaded, params.username])

  // Re-check ownership when currentUser or profileData changes
  useEffect(() => {
    if (currentUser && profileData) {
      const isOwner = checkIsOwnProfile(currentUser, profileData)
      setIsOwnProfile(isOwner)
      console.log("Re-checking ownership, setting isOwnProfile to:", isOwner)
    }
  }, [currentUser, profileData, params.username])

  useEffect(() => {
    if (currentUser && isOwnProfile) {
      fetchBlocklist()
    } else if (currentUser && !isOwnProfile) {
      setBlacklistedUsers([])
    }
  }, [currentUser, isOwnProfile, params.username])

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
        if (Array.isArray(data.user)) {
          const transformedRecordings = data.user.map((rec: any) => ({
            id: rec.hookId,
            title: rec.title || `Recording from ${rec.start ? rec.start.split("T")[0] : "Unknown Date"}`,
            views: rec.maxviews || 0,
            date: formatDate(rec.start),
            timestamp: rec.start, // Keep original timestamp for sorting
            thumbnail: `https://superfan.alterwork.in/files/thumbnails/${rec.hookId}.jpg`,
          }))

          // Sort by timestamp (latest first) - handle both valid dates and invalid/null dates
          transformedRecordings.sort((a: any, b: any) => {
            const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0
            const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0

            // If both dates are invalid, maintain original order
            if (dateA === 0 && dateB === 0) return 0
            // If one date is invalid, put it at the end
            if (dateA === 0) return 1
            if (dateB === 0) return -1
            // Sort valid dates in descending order (latest first)
            return dateB - dateA
          })

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
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

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
        console.log("Blocklist response:", data)
        if (data.blocklist && Array.isArray(data.blocklist)) {
          const usernames = data.blocklist.map((item: any) => item.blocklist || item)
          setBlacklistedUsers(usernames)
          console.log("Set blacklisted users:", usernames)
        } else {
          console.warn("Unexpected blocklist response format:", data)
          setBlacklistedUsers([])
        }
      } else {
        console.error("Failed to fetch blocklist:", response.status, response.statusText)
        setBlacklistedUsers([])
      }
    } catch (error: any) {
      console.error("Error fetching blocklist:", error)
      if (error.name === "AbortError") {
        console.log("Blocklist fetch request timed out")
      } else if (error.message === "Failed to fetch") {
        console.log("Network error fetching blocklist - using empty list")
      }
      setBlacklistedUsers([])
    } finally {
      setIsLoadingBlocklist(false)
    }
  }

  const fetchFollowers = async () => {
    setIsLoadingFollowers(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/fetch_followers", {
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
        console.log("Followers response:", data)
        if (data.followers && Array.isArray(data.followers)) {
          const usernames = data.followers.map((item: any) => item.followed_by)
          setFollowersList(usernames)
          console.log("Set followers list:", usernames)
        } else {
          console.warn("Unexpected followers response format:", data)
          setFollowersList([])
        }
      } else {
        console.error("Failed to fetch followers:", response.status, response.statusText)
        setFollowersList([])
      }
    } catch (error: any) {
      console.error("Error fetching followers:", error)
      setFollowersList([])
    } finally {
      setIsLoadingFollowers(false)
    }
  }

  const fetchFollowing = async () => {
    setIsLoadingFollowing(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/fetch_following", {
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
        console.log("Following response:", data)
        if (data.following && Array.isArray(data.following)) {
          const usernames = data.following.map((item: any) => item.follow)
          setFollowingList(usernames)
          console.log("Set following list:", usernames)
        } else {
          console.warn("Unexpected following response format:", data)
          setFollowingList([])
        }
      } else {
        console.error("Failed to fetch following:", response.status, response.statusText)
        setFollowingList([])
      }
    } catch (error: any) {
      console.error("Error fetching following:", error)
      setFollowingList([])
    } finally {
      setIsLoadingFollowing(false)
    }
  }

  const handleBlockUser = async (username: string) => {
    if (!currentUser) return

    setIsBlockingAction(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/add_blocklist", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            blocklist_by: currentUser.displayName,
            blocklist: username,
          },
        }),
      })

      if (response.ok) {
        setIsBlocked(true)
        setBlacklistedUsers((prev) => [...prev, username])
        console.log(`Successfully blocked ${username}`)
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

  const handleUnblockUser = async (username: string) => {
    if (!currentUser) return

    setIsBlockingAction(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/remove_blocklist", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            blocklist_by: currentUser.displayName,
            blocklist: username,
          },
        }),
      })

      if (response.ok) {
        setIsBlocked(false)
        setBlacklistedUsers((prev) => prev.filter((u) => u !== username))
        console.log(`Successfully unblocked ${username}`)
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
    console.log("Playing recording (placeholder):", recording.title)
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

  useEffect(() => {
    setProfileData(null)
    setIsLoadingProfile(true)
    setPastRecordings([])
    setIsLoadingRecordings(true)
    setBlacklistedUsers([])
    setIsLoadingBlocklist(false)
    setIsFollowing(false)
    setIsBlocked(false)
    setIsOwnProfile(false)
    setFollowersList([])
    setFollowingList([])
    setIsLoadingFollowers(false)
    setIsLoadingFollowing(false)
  }, [params.username])

  const handleEditProfile = () => {
    alert("Edit Profile functionality coming soon!")
  }

  const handleEditPanels = () => {
    alert("Edit Panels functionality coming soon!")
  }

  console.log("Final render state:")
  console.log("- isOwnProfile:", isOwnProfile)
  console.log("- currentUser:", currentUser?.displayName)
  console.log("- params.username:", params.username)
  console.log("- authLoaded:", authLoaded)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-6">
        {/* Channel Header */}
        <div className="relative w-full h-48 md:h-64 rounded-lg mb-6 overflow-hidden">
          {/* Blurred profile picture as banner image */}
          <img
            src={`https://superfan.alterwork.in/files/profilepic/${profileData?.display_name || params.username}.png`}
            alt="Channel Banner"
            className="w-full h-full object-cover blur-lg scale-110" // Apply blur and slight scale for effect
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg?height=256&width=1200"
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-30"></div> {/* Overlay for better contrast */}
          {isOwnProfile && (
            <Button variant="secondary" size="sm" className="absolute top-4 right-4" onClick={handleEditProfile}>
              <Settings className="h-4 w-4 mr-2" />
              Edit Channel
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6 -mt-16 px-4">
          <Avatar className="w-32 h-32 border-4 border-background shadow-md">
            <AvatarImage
              src={`https://superfan.alterwork.in/files/profilepic/${profileData?.display_name || params.username}.png`}
              alt={profileData?.display_name || params.username}
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=128&width=128"
              }}
            />
            <AvatarFallback className="text-4xl">
              {profileData?.display_name?.charAt(0)?.toUpperCase() || params.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">@{profileData?.display_name || params.username}</h1>
                {profileData?.status === "live" && (
                  <Badge variant="destructive" className="animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                    LIVE
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span>
                  <strong>{formatNumber(profileData?.followers || 0)}</strong> followers
                </span>
                <span>
                  <strong>{formatNumber(profileData?.following || 0)}</strong> following
                </span>
                <span>
                  <strong>{formatNumber(profileData?.sessions || 0)}</strong> Live sessions
                </span>
              </div>
            </div>
            {!isOwnProfile && currentUser && currentUser.displayName !== params.username && (
              <div className="flex gap-2 mt-4 md:mt-0">
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
                  onClick={() => (isBlocked ? handleUnblockUser(params.username) : handleBlockUser(params.username))}
                  disabled={isBlockingAction || !currentUser}
                >
                  {isBlockingAction ? (isBlocked ? "Unblocking..." : "Blocking...") : isBlocked ? "Unblock" : "Block"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Tabs */}
        {isLoadingProfile ? (
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-muted rounded w-full max-w-md mx-auto"></div>
            <div className="h-64 bg-muted rounded w-full"></div>
            <div className="h-48 bg-muted rounded w-full"></div>
          </div>
        ) : profileData ? (
          <ProfileTabs
            username={params.username}
            isOwnProfile={isOwnProfile}
            pastRecordings={pastRecordings}
            isLoadingRecordings={isLoadingRecordings}
            onPlayRecording={handlePlayRecording}
            profileData={profileData}
            onEditProfile={handleEditProfile}
            onEditPanels={handleEditPanels}
            blacklistedUsers={blacklistedUsers}
            isLoadingBlocklist={isLoadingBlocklist}
            handleUnblacklistUser={handleUnblacklistUser}
            followersList={followersList}
            followingList={followingList}
            isLoadingFollowers={isLoadingFollowers}
            isLoadingFollowing={isLoadingFollowing}
            fetchFollowers={fetchFollowers}
            fetchFollowing={fetchFollowing}
          />
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>User profile not found.</p>
          </div>
        )}
      </div>
    </div>
  )
}

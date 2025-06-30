"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, Play, Twitter, Youtube, Instagram, X } from "lucide-react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, getIdToken } from "firebase/auth"
import { useRouter } from "next/navigation"
import { ProfileTabs } from "@/components/profile-tabs"
import { EditProfileModal } from "@/components/edit-profile-modal"
import { MobileLayout } from "@/components/mobile-layout"
import { useUserStore } from "@/lib/user-store"
import { FollowersModal } from "@/components/followers-modal"
import { FollowingModal } from "@/components/following-modal"

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [aboutData, setAboutData] = useState<any>(null)
  const [isLoadingAbout, setIsLoadingAbout] = useState(true)
  const [activeTab, setActiveTab] = useState("home")
  const [unfollowingUsers, setUnfollowingUsers] = useState<Set<string>>(new Set())
  const [selectedVideo, setSelectedVideo] = useState<any>(null)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false)
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false)

  // Use the singleton user store
  const { updateFollowStatus } = useUserStore()

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
      const response = await fetch(`https://superfan.alterwork.in/api/users/${params.username}`, {
        method: "GET",
        headers
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

  const fetchAboutDetails = async () => {
    setIsLoadingAbout(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`https://superfan.alterwork.in/api/users/${params.username}/about`, {
        method: "GET",
        headers
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Fetched about data:", data)
        setAboutData(data.about)
      } else {
        console.error("Failed to fetch about details:", response.status, response.statusText)
        setAboutData(null)
      }
    } catch (error) {
      console.error("Error fetching about details:", error)
      setAboutData(null)
    } finally {
      setIsLoadingAbout(false)
    }
  }

  const fetchPastRecordings = async () => {
    setIsLoadingRecordings(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`https://superfan.alterwork.in/api/recordings/${params.username}`, {
        method: "GET",
        headers
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

      const response = await fetch(`https://superfan.alterwork.in/api/blocks`, {
        method: "GET",
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
    // For mobile, show in modal; for desktop, open in new tab
    if (window.innerWidth < 768) {
      setSelectedVideo(recording)
      setIsVideoModalOpen(true)
    } else {
      const sourceId = recording.hookId || recording.id
      window.open(`/viewer?type=storage&video=${sourceId}`, "_blank")
    }
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

  const handleUnfollow = async (usernameToUnfollow: string) => {
    setUnfollowingUsers((prev) => new Set(prev).add(usernameToUnfollow))

    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/un_follow", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            unfollow: usernameToUnfollow,
          },
        }),
      })

      if (response.ok) {
        // Refresh the following list
        await fetchFollowing()
        console.log(`Successfully unfollowed ${usernameToUnfollow}`)
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        console.error(`Failed to unfollow: ${response.status} - ${errorData.message || errorData.reason}`)
        alert(`Failed to unfollow user: ${errorData.message || "Please try again."}`)
      }
    } catch (error: any) {
      console.error(`Error unfollowing user: ${error.message}`)
      alert(`Error unfollowing user: ${error.message}`)
    } finally {
      setUnfollowingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(usernameToUnfollow)
        return newSet
      })
    }
  }

  const handleUnfollowProfile = async () => {
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
      const response = await fetch(`https://superfan.alterwork.in/api//users/${params.username}/follow/status`, {
        method: "GET",
        headers,
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
      const response = await fetch(`https://superfan.alterwork.in/api/blocks/${params.username}/status`, {
        method: "GET",
        headers
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
    setAboutData(null)
    setIsLoadingAbout(true)
  }, [params.username])

  const handleEditProfile = () => {
    setIsEditModalOpen(true)
  }

  const handleSaveProfile = (updatedData: Partial<UserProfileData>) => {
    // For now, just update the local state
    // Later we can add API call here
    setProfileData((prev) => (prev ? { ...prev, ...updatedData } : null))
    console.log("Profile updated:", updatedData)
  }

  console.log("Final render state:")
  console.log("- isOwnProfile:", isOwnProfile)
  console.log("- currentUser:", currentUser?.displayName)
  console.log("- params.username:", params.username)
  console.log("- authLoaded:", authLoaded)

  // Fetch user details when auth is loaded and we have the username
  useEffect(() => {
    if (authLoaded && params.username) {
      fetchUserDetails()
      fetchPastRecordings()
      fetchAboutDetails()
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

  const handleUserClick = (clickedUsername: string) => {
    router.push(`/profile/${clickedUsername}`)
  }

  return (
    <MobileLayout>
      {/* Desktop Layout */}
      <div className="hidden md:block">
        {/* Channel Header */}
        <div className="relative w-full h-48 lg:h-64 rounded-lg mb-4 sm:mb-6 overflow-hidden">
          {/* Blurred profile picture as banner image */}
          <img
            src={`https://superfan.alterwork.in/files/profilepic/${profileData?.display_name || params.username}.png`}
            alt="Channel Banner"
            className="w-full h-full object-cover blur-lg scale-110"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg?height=256&width=1200"
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          {isOwnProfile && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 h-9 px-3 text-sm"
              onClick={handleEditProfile}
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Channel
            </Button>
          )}
        </div>

        <div className="flex flex-row items-start items-center gap-6 mb-6 -mt-16 px-4">
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
          <div className="flex-1 flex flex-row items-center justify-between gap-4 w-full">
            <div className="flex-1">
              <div className="flex flex-row items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">@{profileData?.display_name || params.username}</h1>
                {profileData?.status === "live" && (
                  <Badge variant="destructive" className="animate-pulse w-fit">
                    <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                    LIVE
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span
                  className="cursor-pointer"
                  onClick={() => {
                    if (profileData?.followers !== undefined) {
                      setIsFollowersModalOpen(true)
                      fetchFollowers()
                    }
                  }}
                >
                  <strong>{formatNumber(profileData?.followers || 0)}</strong> followers
                </span>
                <span
                  className="cursor-pointer"
                  onClick={() => {
                    if (profileData?.following !== undefined) {
                      setIsFollowingModalOpen(true)
                      fetchFollowing()
                    }
                  }}
                >
                  <strong>{formatNumber(profileData?.following || 0)}</strong> following
                </span>
                <span>
                  <strong>{formatNumber(pastRecordings.length)}</strong> Live sessions
                </span>
              </div>
            </div>
            {!isOwnProfile && currentUser && currentUser.displayName !== params.username && (
              <div className="flex flex-row gap-2">
                <Button
                  variant={isFollowing ? "secondary" : "default"}
                  onClick={isFollowing ? handleUnfollowProfile : handleFollow}
                  disabled={isFollowingAction || !currentUser}
                  className={`${!isFollowing ? "bg-gradient-to-r from-orange-600 to-orange-500" : ""} h-9`}
                  size="sm"
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
                  className="h-9"
                  size="sm"
                >
                  {isBlockingAction ? (isBlocked ? "Unblocking..." : "Blocking...") : isBlocked ? "Unblock" : "Block"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Profile Tabs */}
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
            blacklistedUsers={blacklistedUsers}
            isLoadingBlocklist={isLoadingBlocklist}
            handleUnblacklistUser={handleUnblacklistUser}
            aboutData={aboutData}
            isLoadingAbout={isLoadingAbout}
            fetchAboutDetails={fetchAboutDetails}
          />
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-base">User profile not found.</p>
          </div>
        )}
      </div>

      {/* Mobile Instagram-like Layout */}
      <div className="md:hidden">
        {/* Mobile Profile Header */}
        <div className="px-4 py-4 relative">
          {" "}
          {/* Added relative for absolute positioning of button */}
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 h-8 w-8 text-muted-foreground"
              onClick={handleEditProfile}
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Edit Profile</span>
            </Button>
          )}
          {/* Profile Info Row */}
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar */}
            <Avatar className="w-16 h-16 border-2 border-background shadow-sm">
              {" "}
              {/* Reduced size */}
              <AvatarImage
                src={`https://superfan.alterwork.in/files/profilepic/${profileData?.display_name || params.username}.png`}
                alt={profileData?.display_name || params.username}
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=64&width=64" // Updated placeholder size
                }}
              />
              <AvatarFallback className="text-xl">
                {" "}
                {/* Adjusted fallback text size */}
                {profileData?.display_name?.charAt(0)?.toUpperCase() || params.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Profile Stats and Buttons */}
            <div className="flex-1 flex flex-col min-w-0">
              {" "}
              {/* Added min-w-0 to prevent overflow */}
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-xl font-semibold truncate">@{profileData?.display_name || params.username}</h1>{" "}
                {/* Added truncate */}
                {profileData?.status === "live" && (
                  <Badge variant="destructive" className="animate-pulse text-xs flex-shrink-0">
                    {" "}
                    {/* Added flex-shrink-0 */}
                    <div className="w-1.5 h-1.5 bg-white rounded-full mr-1"></div>
                    LIVE
                  </Badge>
                )}
              </div>
              {/* Stats Row */}
              <div className="flex gap-4 mb-3">
                {" "}
                {/* Reduced gap */}
                <div className="text-center">
                  <div className="font-semibold text-lg">{formatNumber(pastRecordings.length)}</div>
                  <div className="text-xs text-muted-foreground">sessions</div>
                </div>
                <div
                  className="text-center cursor-pointer"
                  onClick={() => {
                    if (profileData?.followers !== undefined) {
                      setIsFollowersModalOpen(true)
                      fetchFollowers()
                    }
                  }}
                >
                  <div className="font-semibold text-lg">{formatNumber(profileData?.followers || 0)}</div>
                  <div className="text-xs text-muted-foreground">followers</div>
                </div>
                <div
                  className="text-center cursor-pointer"
                  onClick={() => {
                    if (profileData?.following !== undefined) {
                      setIsFollowingModalOpen(true)
                      fetchFollowing()
                    }
                  }}
                >
                  <div className="font-semibold text-lg">{formatNumber(profileData?.following || 0)}</div>
                  <div className="text-xs text-muted-foreground">following</div>
                </div>
              </div>
              {/* Action Buttons Row */}
              <div className="flex gap-2 w-full">
                {!isOwnProfile && currentUser && currentUser.displayName !== params.username ? (
                  <>
                    <Button
                      variant={isFollowing ? "secondary" : "default"}
                      onClick={isFollowing ? handleUnfollowProfile : handleFollow}
                      disabled={isFollowingAction || !currentUser}
                      className={`${!isFollowing ? "bg-gradient-to-r from-orange-600 to-orange-500" : ""} flex-1 h-8 text-sm`}
                      size="sm"
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
                      onClick={() =>
                        isBlocked ? handleUnblockUser(params.username) : handleBlockUser(params.username)
                      }
                      disabled={isBlockingAction || !currentUser}
                      className="flex-1 h-8 text-sm"
                      size="sm"
                    >
                      {isBlockingAction
                        ? isBlocked
                          ? "Unblocking..."
                          : "Blocking..."
                        : isBlocked
                          ? "Unblock"
                          : "Block"}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          {/* About Section - Mobile (No direct content here, it's in the tab) */}
        </div>

        {/* Mobile Tabs */}
        <div className="border-t border-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "home" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              Broadcasts
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "about" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              About
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab("blocklist")}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "blocklist" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                }`}
              >
                Blocked
              </button>
            )}
          </div>
        </div>

        {/* Mobile Content */}
        <div className="px-4 py-4">
          {activeTab === "home" && (
            <div>
              {isLoadingRecordings ? (
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="aspect-square bg-muted animate-pulse rounded"></div>
                  ))}
                </div>
              ) : pastRecordings.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {pastRecordings.map((video) => (
                    <div
                      key={video.id}
                      className="aspect-square cursor-pointer relative group"
                      onClick={() => handlePlayRecording(video)}
                    >
                      <img
                        src={video.thumbnail || "/placeholder.svg"}
                        alt={video.title}
                        className="w-full h-full object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=120&width=120&text=No Thumbnail"
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                        <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No recent broadcasts.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "about" && (
            <div>
              {!auth.currentUser ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">Login to see user's details</p>
                </div>
              ) : isLoadingAbout ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                </div>
              ) : aboutData ? (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Name</h3>
                    <p>{aboutData.name || "-"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Bio</h3>
                    <p>{aboutData.bio || "-"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Email</h3>
                    <p>{aboutData.email || "-"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Channel Category</h3>
                    <p>{aboutData.channel_category || "-"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Stream Language</h3>
                    <p>{aboutData.stream_Language || "-"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Social Links</h3>
                    <div className="flex flex-wrap gap-3">
                      {aboutData.twitter_link ? (
                        <a
                          href={aboutData.twitter_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                          title="Twitter"
                        >
                          <Twitter className="w-4 h-4" />
                        </a>
                      ) : null}
                      {aboutData.youtube_link ? (
                        <a
                          href={aboutData.youtube_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                          title="YouTube"
                        >
                          <Youtube className="w-4 h-4" />
                        </a>
                      ) : null}
                      {aboutData.instagram_link ? (
                        <a
                          href={aboutData.instagram_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full transition-colors"
                          title="Instagram"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      ) : null}
                      {!aboutData.twitter_link && !aboutData.youtube_link && !aboutData.instagram_link && (
                        <span className="text-sm text-muted-foreground">No social links</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">Failed to load about information.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "blocklist" && isOwnProfile && (
            <div>
              {isLoadingBlocklist ? (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center animate-pulse">
                      <div className="w-16 h-16 bg-muted rounded-full mb-2"></div>
                      <div className="h-3 bg-muted rounded w-full mb-2"></div>
                      <div className="h-6 bg-muted rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : blacklistedUsers.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {blacklistedUsers.map((blockedUsername) => (
                    <div key={blockedUsername} className="flex flex-col items-center">
                      <Avatar className="h-16 w-16 mb-2">
                        <AvatarImage
                          src={`https://superfan.alterwork.in/files/profilepic/${blockedUsername}.png`}
                          alt={blockedUsername}
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=64&width=64"
                          }}
                        />
                        <AvatarFallback className="text-sm">{blockedUsername.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-center truncate w-full mb-2">@{blockedUsername}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-6 bg-transparent"
                        onClick={() => handleUnblacklistUser(blockedUsername)}
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No blocked users</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profileData={profileData}
        onSave={handleSaveProfile}
        initialAboutData={aboutData}
      />

      {/* Mobile Video Modal */}
      {isVideoModalOpen && selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center md:hidden">
          <div className="w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50">
              <h3 className="text-white font-semibold truncate">{selectedVideo.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVideoModalOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Video Player */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-lg">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <img
                    src={selectedVideo.thumbnail || "/placeholder.svg"}
                    alt={selectedVideo.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg?height=400&width=600&text=Video"
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      size="lg"
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                      onClick={() => {
                        const sourceId = selectedVideo.hookId || selectedVideo.id
                        window.open(`/viewer?type=storage&video=${sourceId}`, "_blank")
                      }}
                    >
                      <Play className="h-8 w-8 ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Video Info */}
                <div className="mt-4 text-white">
                  <h4 className="font-semibold text-lg mb-2">{selectedVideo.title}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-300">
                    <span>{formatNumber(selectedVideo.views)} views</span>
                    <span>{selectedVideo.date}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal */}
      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        followersList={followersList}
        isLoadingFollowers={isLoadingFollowers}
        fetchFollowers={fetchFollowers}
        onUserClick={handleUserClick}
      />

      {/* Following Modal */}
      <FollowingModal
        isOpen={isFollowingModalOpen}
        onClose={() => setIsFollowingModalOpen(false)}
        followingList={followingList}
        isLoadingFollowing={isLoadingFollowing}
        fetchFollowing={fetchFollowing}
        onUserClick={handleUserClick}
        onUnfollow={handleUnfollow}
        unfollowingUsers={unfollowingUsers}
      />
    </MobileLayout>
  )
}

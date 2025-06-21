"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { VideoCarousel } from "./video-carousel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { getIdToken } from "firebase/auth"

interface Video {
  id: string
  title: string
  streamer?: string
  views: number
  date?: string
  thumbnail: string
  hookId?: string
  UID?: string
  description?: string
  videoUrl?: string
}

interface ProfileTabsProps {
  username: string
  isOwnProfile: boolean
  pastRecordings: Video[]
  isLoadingRecordings: boolean
  onPlayRecording: (video: Video) => void
  profileData: any
  onEditProfile?: () => void
  onEditPanels?: () => void
  blacklistedUsers: string[]
  isLoadingBlocklist: boolean
  handleUnblacklistUser: (username: string) => Promise<void>
  followersList: string[]
  followingList: string[]
  isLoadingFollowers: boolean
  isLoadingFollowing: boolean
  fetchFollowers: () => Promise<void>
  fetchFollowing: () => Promise<void>
}

export function ProfileTabs({
  username,
  isOwnProfile,
  pastRecordings,
  isLoadingRecordings,
  onPlayRecording: parentOnPlayRecording,
  profileData,
  onEditProfile,
  onEditPanels,
  blacklistedUsers,
  isLoadingBlocklist,
  handleUnblacklistUser,
  followersList,
  followingList,
  isLoadingFollowers,
  isLoadingFollowing,
  fetchFollowers,
  fetchFollowing,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("home")
  const [unfollowingUsers, setUnfollowingUsers] = useState<Set<string>>(new Set())
  const router = useRouter()

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const handlePlayRecording = (recording: Video) => {
    const sourceId = recording.hookId || recording.id
    window.open(`/viewer?type=storage&video=${sourceId}`, "_blank")
    parentOnPlayRecording(recording)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)

    // Fetch data when switching to followers/following tabs
    if (value === "followers" && followersList.length === 0 && !isLoadingFollowers) {
      fetchFollowers()
    } else if (value === "following" && followingList.length === 0 && !isLoadingFollowing) {
      fetchFollowing()
    }
  }

  const handleUserClick = (clickedUsername: string) => {
    router.push(`/profile/${clickedUsername}`)
  }

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

  const getTabCount = () => {
    if (isOwnProfile) {
      return 4 // home, followers, following, blocklist
    } else {
      return 1 // only home
    }
  }

  console.log("ProfileTabs - isOwnProfile:", isOwnProfile)

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="flex justify-center mb-6">
        <TabsList className={`grid w-full max-w-2xl grid-cols-${getTabCount()}`}>
          <TabsTrigger value="home">Home</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="followers">Followers</TabsTrigger>}
          {isOwnProfile && <TabsTrigger value="following">Following</TabsTrigger>}
          {isOwnProfile && <TabsTrigger value="blocklist">Blocklist</TabsTrigger>}
        </TabsList>
      </div>

      <TabsContent value="home">
        <div className="space-y-6">
          {/* Recent Broadcasts Shelf */}
          <VideoCarousel
            title="Recent Broadcasts"
            videos={pastRecordings.slice(0, 5)}
            onPlayVideo={handlePlayRecording}
            emptyMessage="No recent broadcasts."
            isLoading={isLoadingRecordings}
          />

          {isOwnProfile && (
            <div className="text-right">
              <Button variant="outline" onClick={onEditPanels}>
                Edit Panels
              </Button>
            </div>
          )}
        </div>
      </TabsContent>

      {isOwnProfile && (
        <TabsContent value="followers">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Followers ({formatNumber(profileData?.followers || 0)})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingFollowers ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center p-3 border rounded-lg animate-pulse">
                      <div className="w-16 h-16 bg-muted rounded-full mb-2"></div>
                      <div className="h-3 bg-muted rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : followersList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {followersList.map((followerUsername) => (
                    <div
                      key={followerUsername}
                      className="flex flex-col items-center p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleUserClick(followerUsername)}
                    >
                      <Avatar className="h-16 w-16 mb-2">
                        <AvatarImage
                          src={`https://superfan.alterwork.in/files/profilepic/${followerUsername}.png`}
                          alt={followerUsername}
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=64&width=64"
                          }}
                        />
                        <AvatarFallback className="text-lg">{followerUsername.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-center truncate w-full">@{followerUsername}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No followers yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {isOwnProfile && (
        <TabsContent value="following">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Following ({formatNumber(profileData?.following || 0)})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingFollowing ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center p-3 border rounded-lg animate-pulse">
                      <div className="w-16 h-16 bg-muted rounded-full mb-2"></div>
                      <div className="h-3 bg-muted rounded w-full mb-2"></div>
                      <div className="h-6 bg-muted rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : followingList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {followingList.map((followingUsername) => (
                    <div
                      key={followingUsername}
                      className="flex flex-col items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar
                        className="h-16 w-16 mb-2 cursor-pointer"
                        onClick={() => handleUserClick(followingUsername)}
                      >
                        <AvatarImage
                          src={`https://superfan.alterwork.in/files/profilepic/${followingUsername}.png`}
                          alt={followingUsername}
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=64&width=64"
                          }}
                        />
                        <AvatarFallback className="text-lg">{followingUsername.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span
                        className="text-sm font-medium text-center truncate w-full mb-2 cursor-pointer"
                        onClick={() => handleUserClick(followingUsername)}
                      >
                        @{followingUsername}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => handleUnfollow(followingUsername)}
                        disabled={unfollowingUsers.has(followingUsername)}
                      >
                        {unfollowingUsers.has(followingUsername) ? "Unfollowing..." : "Unfollow"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Not following anyone yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {isOwnProfile && (
        <TabsContent value="blocklist">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Blacklisted Users</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBlocklist ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center p-3 border rounded-lg animate-pulse">
                      <div className="w-16 h-16 bg-muted rounded-full mb-2"></div>
                      <div className="h-3 bg-muted rounded w-full mb-2"></div>
                      <div className="h-6 bg-muted rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : blacklistedUsers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {blacklistedUsers.map((blockedUsername) => (
                    <div key={blockedUsername} className="flex flex-col items-center p-3 border rounded-lg">
                      <Avatar className="h-16 w-16 mb-2">
                        <AvatarImage
                          src={`https://superfan.alterwork.in/files/profilepic/${blockedUsername}.png`}
                          alt={blockedUsername}
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=64&width=64"
                          }}
                        />
                        <AvatarFallback className="text-lg">{blockedUsername.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-center truncate w-full mb-2">@{blockedUsername}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => handleUnblacklistUser(blockedUsername)}
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No blacklisted users</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  )
}

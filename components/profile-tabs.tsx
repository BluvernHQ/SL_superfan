"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
// Removed VideoCarousel import as it will be replaced
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
  onEditPanels?: () => void // This prop will no longer be used but kept for interface consistency if other parts rely on it
  blacklistedUsers: string[]
  isLoadingBlocklist: boolean
  handleUnblacklistUser: (username: string) => Promise<void>
  followersList: string[]
  followingList: string[]
  isLoadingFollowers: boolean
  isLoadingFollowing: boolean
  fetchFollowers: () => Promise<void>
  fetchFollowing: () => Promise<void>
  aboutData: any
  isLoadingAbout: boolean
  fetchAboutDetails: () => Promise<void>
}

export function ProfileTabs({
  username,
  isOwnProfile,
  pastRecordings,
  isLoadingRecordings,
  onPlayRecording: parentOnPlayRecording,
  profileData,
  onEditProfile,
  onEditPanels, // This prop is no longer used
  blacklistedUsers,
  isLoadingBlocklist,
  handleUnblacklistUser,
  followersList,
  followingList,
  isLoadingFollowers,
  isLoadingFollowing,
  fetchFollowers,
  fetchFollowing,
  aboutData,
  isLoadingAbout,
  fetchAboutDetails,
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
    } else if (value === "about" && !aboutData && !isLoadingAbout && auth.currentUser) {
      // Only fetch if logged in
      fetchAboutDetails()
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

  console.log("ProfileTabs - isOwnProfile:", isOwnProfile)

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="flex justify-center mb-6">
        {/* Fixed horizontal layout using flex instead of dynamic grid */}
        <TabsList className="flex w-auto gap-1 p-1">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="followers">Followers</TabsTrigger>}
          {isOwnProfile && <TabsTrigger value="following">Following</TabsTrigger>}
          {isOwnProfile && <TabsTrigger value="blocklist">Blocklist</TabsTrigger>}
        </TabsList>
      </div>

      <TabsContent value="home">
        <div className="space-y-6">
          {/* Recent Broadcasts Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Broadcasts</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRecordings ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="animate-pulse space-y-2">
                      <div className="w-full h-32 bg-muted rounded-md"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : pastRecordings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pastRecordings.map((video) => (
                    <Card
                      key={video.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handlePlayRecording(video)}
                    >
                      <CardContent className="p-0">
                        <img
                          src={video.thumbnail || "/placeholder.svg"}
                          alt={video.title}
                          width={300}
                          height={168}
                          className="w-full h-auto rounded-t-lg object-cover aspect-video"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=168&width=300&text=No Thumbnail"
                          }}
                        />
                        <div className="p-3">
                          <h3 className="font-semibold text-sm truncate">{video.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(video.views)} views • {video.date}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No recent broadcasts.</p>
              )}
            </CardContent>
          </Card>

          {/* Removed Edit Panels button */}
        </div>
      </TabsContent>

      <TabsContent value="about">
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            {!auth.currentUser ? (
              <p className="text-muted-foreground text-center py-8">Login to see user's details</p>
            ) : isLoadingAbout ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </div>
            ) : aboutData ? (
              <div className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-foreground">Name</h3>
                  <p>{aboutData.name || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Bio</h3>
                  <p>{aboutData.bio || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Email</h3>
                  <p>{aboutData.email || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Channel Category</h3>
                  <p>{aboutData.channel_category || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Stream Language</h3>
                  <p>{aboutData.stream_Language || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Social Links</h3>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {aboutData.twitter_link ? (
                      <a
                        href={aboutData.twitter_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Twitter
                      </a>
                    ) : (
                      <span>-</span>
                    )}
                    {aboutData.youtube_link ? (
                      <a
                        href={aboutData.youtube_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-500 hover:underline"
                      >
                        YouTube
                      </a>
                    ) : (
                      <span>-</span>
                    )}
                    {aboutData.instagram_link ? (
                      <a
                        href={aboutData.instagram_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-500 hover:underline"
                      >
                        Instagram
                      </a>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Failed to load about information.</p>
            )}
          </CardContent>
        </Card>
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

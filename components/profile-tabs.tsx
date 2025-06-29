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
import { Twitter, Youtube, Instagram } from "lucide-react"

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
      {/* Mobile-optimized tab navigation */}
      <div className="flex justify-center mb-4 sm:mb-6">
        <TabsList className="flex w-full max-w-md gap-1 p-1 h-12 sm:h-10">
          <TabsTrigger value="home" className="flex-1 text-xs sm:text-sm h-10">Home</TabsTrigger>
          <TabsTrigger value="about" className="flex-1 text-xs sm:text-sm h-10">About</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="followers" className="flex-1 text-xs sm:text-sm h-10">Followers</TabsTrigger>}
          {isOwnProfile && <TabsTrigger value="following" className="flex-1 text-xs sm:text-sm h-10">Following</TabsTrigger>}
          {isOwnProfile && <TabsTrigger value="blocklist" className="flex-1 text-xs sm:text-sm h-10">Blocklist</TabsTrigger>}
        </TabsList>
      </div>

      <TabsContent value="home" className="mt-0">
        <div className="space-y-4 sm:space-y-6">
          {/* Recent Broadcasts Grid - Mobile optimized */}
          <Card className="border-0 shadow-none sm:border sm:shadow">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Recent Broadcasts</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-0">
              {isLoadingRecordings ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="animate-pulse space-y-2">
                      <div className="w-full h-24 sm:h-32 bg-muted rounded-md"></div>
                      <div className="h-3 sm:h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-2 sm:h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : pastRecordings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {pastRecordings.map((video) => (
                    <Card
                      key={video.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-0 shadow-none sm:border sm:shadow"
                      onClick={() => handlePlayRecording(video)}
                    >
                      <CardContent className="p-0">
                        <img
                          src={video.thumbnail || "/placeholder.svg"}
                          alt={video.title}
                          width={300}
                          height={168}
                          className="w-full h-24 sm:h-32 rounded-t-lg object-cover aspect-video"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=168&width=300&text=No Thumbnail"
                          }}
                        />
                        <div className="p-2 sm:p-3">
                          <h3 className="font-semibold text-xs sm:text-sm truncate mb-1">{video.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(video.views)} views • {video.date}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-muted-foreground text-sm sm:text-base">No recent broadcasts.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="about" className="mt-0">
        <Card className="mt-0 sm:mt-6 border-0 shadow-none sm:border sm:shadow">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">About</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-0">
            {!auth.currentUser ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-muted-foreground text-sm sm:text-base">Login to see user's details</p>
              </div>
            ) : isLoadingAbout ? (
              <div className="space-y-3 sm:space-y-4 animate-pulse">
                <div className="h-3 sm:h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 sm:h-4 bg-muted rounded w-full"></div>
                <div className="h-3 sm:h-4 bg-muted rounded w-1/2"></div>
                <div className="h-3 sm:h-4 bg-muted rounded w-2/3"></div>
                <div className="h-3 sm:h-4 bg-muted rounded w-full"></div>
              </div>
            ) : aboutData ? (
              <div className="space-y-4 sm:space-y-6 text-sm sm:text-base text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">Name</h3>
                  <p className="text-sm sm:text-base">{aboutData.name || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">Bio</h3>
                  <p className="text-sm sm:text-base">{aboutData.bio || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">Email</h3>
                  <p className="text-sm sm:text-base">{aboutData.email || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">Channel Category</h3>
                  <p className="text-sm sm:text-base">{aboutData.channel_category || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">Stream Language</h3>
                  <p className="text-sm sm:text-base">{aboutData.stream_Language || "-"}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base mb-2">Social Links</h3>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    {aboutData.twitter_link ? (
                      <a
                        href={aboutData.twitter_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                        title="Twitter"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                    ) : null}
                    {aboutData.youtube_link ? (
                      <a
                        href={aboutData.youtube_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                        title="YouTube"
                      >
                        <Youtube className="w-5 h-5" />
                      </a>
                    ) : null}
                    {aboutData.instagram_link ? (
                      <a
                        href={aboutData.instagram_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full transition-colors"
                        title="Instagram"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    ) : null}
                    {!aboutData.twitter_link && !aboutData.youtube_link && !aboutData.instagram_link && (
                      <span className="text-sm sm:text-base text-muted-foreground">No social links</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <p className="text-muted-foreground text-sm sm:text-base">Failed to load about information.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {isOwnProfile && (
        <TabsContent value="followers" className="mt-0">
          <Card className="mt-0 sm:mt-6 border-0 shadow-none sm:border sm:shadow">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Followers ({formatNumber(profileData?.followers || 0)})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-0">
              {isLoadingFollowers ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center p-2 sm:p-3 border rounded-lg animate-pulse">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full mb-2"></div>
                      <div className="h-2 sm:h-3 bg-muted rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : followersList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {followersList.map((followerUsername) => (
                    <div
                      key={followerUsername}
                      className="flex flex-col items-center p-2 sm:p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleUserClick(followerUsername)}
                    >
                      <Avatar className="h-12 w-12 sm:h-16 sm:w-16 mb-2">
                        <AvatarImage
                          src={`https://superfan.alterwork.in/files/profilepic/${followerUsername}.png`}
                          alt={followerUsername}
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=64&width=64"
                          }}
                        />
                        <AvatarFallback className="text-sm sm:text-lg">{followerUsername.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs sm:text-sm font-medium text-center truncate w-full">@{followerUsername}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-muted-foreground text-sm sm:text-base">No followers yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {isOwnProfile && (
        <TabsContent value="following" className="mt-0">
          <Card className="mt-0 sm:mt-6 border-0 shadow-none sm:border sm:shadow">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Following ({formatNumber(profileData?.following || 0)})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-0">
              {isLoadingFollowing ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center p-2 sm:p-3 border rounded-lg animate-pulse">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full mb-2"></div>
                      <div className="h-2 sm:h-3 bg-muted rounded w-full mb-2"></div>
                      <div className="h-6 bg-muted rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : followingList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {followingList.map((followingUsername) => (
                    <div
                      key={followingUsername}
                      className="flex flex-col items-center p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar
                        className="h-12 w-12 sm:h-16 sm:w-16 mb-2 cursor-pointer"
                        onClick={() => handleUserClick(followingUsername)}
                      >
                        <AvatarImage
                          src={`https://superfan.alterwork.in/files/profilepic/${followingUsername}.png`}
                          alt={followingUsername}
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=64&width=64"
                          }}
                        />
                        <AvatarFallback className="text-sm sm:text-lg">{followingUsername.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span
                        className="text-xs sm:text-sm font-medium text-center truncate w-full mb-2 cursor-pointer"
                        onClick={() => handleUserClick(followingUsername)}
                      >
                        @{followingUsername}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-7 sm:h-8"
                        onClick={() => handleUnfollow(followingUsername)}
                        disabled={unfollowingUsers.has(followingUsername)}
                      >
                        {unfollowingUsers.has(followingUsername) ? "Unfollowing..." : "Unfollow"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-muted-foreground text-sm sm:text-base">Not following anyone yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {isOwnProfile && (
        <TabsContent value="blocklist" className="mt-0">
          <Card className="mt-0 sm:mt-6 border-0 shadow-none sm:border sm:shadow">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Blacklisted Users</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-0">
              {isLoadingBlocklist ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center p-2 sm:p-3 border rounded-lg animate-pulse">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full mb-2"></div>
                      <div className="h-2 sm:h-3 bg-muted rounded w-full mb-2"></div>
                      <div className="h-6 bg-muted rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : blacklistedUsers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                  {blacklistedUsers.map((blockedUsername) => (
                    <div key={blockedUsername} className="flex flex-col items-center p-2 sm:p-3 border rounded-lg">
                      <Avatar className="h-12 w-12 sm:h-16 sm:w-16 mb-2">
                        <AvatarImage
                          src={`https://superfan.alterwork.in/files/profilepic/${blockedUsername}.png`}
                          alt={blockedUsername}
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=64&width=64"
                          }}
                        />
                        <AvatarFallback className="text-sm sm:text-lg">{blockedUsername.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs sm:text-sm font-medium text-center truncate w-full mb-2">@{blockedUsername}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-7 sm:h-8"
                        onClick={() => handleUnblacklistUser(blockedUsername)}
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-muted-foreground text-sm sm:text-base">No blocked users</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  )
}

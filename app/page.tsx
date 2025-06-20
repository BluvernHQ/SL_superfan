"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Camera } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import { VideoCarousel } from "@/components/video-carousel"
import { UserCarousel } from "@/components/user-carousel"

export default function HomePage() {
  const [liveStreams, setLiveStreams] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [isLoadingStreams, setIsLoadingStreams] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  const [pastRecordings, setPastRecordings] = useState<any[]>([])
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (user) {
      try {
        const { getIdToken } = await import("firebase/auth")
        const authToken = await getIdToken(user)
        headers["Authorization"] = `Bearer ${authToken}`
      } catch (tokenError) {
        console.log("Error getting Firebase token:", tokenError)
      }
    }

    return headers
  }, [user])

  const fetchLiveStreams = useCallback(async () => {
    try {
      setIsLoadingStreams(true)
      const headers = await getAuthHeaders()

      const response = await fetch("https://superfan.alterwork.in/api/get_live", {
        method: "GET",
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        const streamsArray = Object.entries(data.live || {}).map(([sessionId, streamData]: [string, any]) => {
          const thumbnailUrl = `/files/thumbnails/${streamData.hookId}.jpg`
          return {
            sessionId,
            ...streamData,
            id: streamData.roomId,
            title: streamData.title || `${streamData.name}'s Live Stream`,
            streamer: streamData.name,
            viewers: streamData.views || 0,
            likes: streamData.likes || 0,
            thumbnail: thumbnailUrl,
          }
        })
        setLiveStreams(streamsArray)
      }
    } catch (error) {
      console.error("Error fetching live streams:", error)
    } finally {
      setIsLoadingStreams(false)
    }
  }, [getAuthHeaders])

  const fetchAllUsers = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/fetch_users", {
        method: "GET",
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        let usersArray = []

        if (Array.isArray(data)) {
          usersArray = data
        } else if (data.users && Array.isArray(data.users)) {
          usersArray = data.users
        } else if (data.data && Array.isArray(data.data)) {
          usersArray = data.data
        } else {
          console.error("Unexpected API response structure:", data)
          setAllUsers([])
          return
        }

        // Filter out the current user first
        const filteredUsers = usersArray.filter((userData) => {
          if (!user) return true
          const currentUserDisplayName = user.displayName
          const currentUserUID = user.uid
          return userData.username !== currentUserDisplayName && userData.id !== currentUserUID
        })

        // Transform users without checking follow status
        const transformedUsers = filteredUsers.map((userData: any) => ({
          id: userData.UID || userData.username,
          username: userData.display_name || userData.username,
          display_name: userData.display_name,
          isLive: userData.status !== "notlive",
          totalSessions: userData.sessions || 0,
          followers: userData.followers || 0,
          isFollowing: false, // Default to false since we're not checking follow status
        }))

        setAllUsers(transformedUsers)
      } else {
        console.error("Failed to fetch users:", response.status, response.statusText)
        setAllUsers([])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      setAllUsers([])
    }
  }, [user, getAuthHeaders])

  const fetchPastRecordings = useCallback(async () => {
    setIsLoadingRecordings(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/get_rec", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            username: "all",
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data.user)) {
          const transformedRecordings = data.user.map((rec: any) => ({
            id: rec.hookId,
            title: rec.description || `Recording from ${rec.start ? rec.start.split("T")[0] : "Unknown Date"}`,
            views: rec.maxviews || 0,
            date: formatDate(rec.start),
            thumbnail: `https://superfan.alterwork.in/files/thumbnails/${rec.hookId}.jpg`,
            streamer: rec.name,
          }))
          transformedRecordings.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          setPastRecordings(transformedRecordings)
        } else {
          console.warn("Unexpected response format for /get_rec (homepage):", data)
          setPastRecordings([])
        }
      } else {
        console.error("Failed to fetch past recordings (homepage):", response.status, response.statusText)
        setPastRecordings([])
      }
    } catch (error) {
      console.error("Error fetching past recordings (homepage):", error)
      setPastRecordings([])
    } finally {
      setIsLoadingRecordings(false)
    }
  }, [getAuthHeaders])

  // handleFollowToggle is no longer called from homepage user cards, but kept for UserCarousel
  const handleFollowToggle = useCallback(
    async (targetUsername: string, currentIsFollowing: boolean) => {
      if (!user) {
        router.push("/login") // Redirect to login if not authenticated
        return
      }

      const endpoint = currentIsFollowing ? "/api/unfollow_user" : "/api/follow_user"
      const method = "POST"
      const headers = await getAuthHeaders()

      try {
        const response = await fetch(endpoint, {
          method,
          headers,
          body: JSON.stringify({ target_username: targetUsername }),
        })

        if (response.ok) {
          setAllUsers((prevUsers) =>
            prevUsers.map((u) =>
              u.username === targetUsername
                ? {
                    ...u,
                    isFollowing: !currentIsFollowing,
                    followers: currentIsFollowing ? u.followers - 1 : u.followers + 1,
                  }
                : u,
            ),
          )
        } else {
          console.error(`Failed to ${endpoint}:`, response.statusText)
        }
      } catch (error) {
        console.error(`Error during ${endpoint}:`, error)
      }
    },
    [user, getAuthHeaders, router],
  )

  useEffect(() => {
    fetchLiveStreams()
    fetchAllUsers()
    fetchPastRecordings()
    const interval = setInterval(() => {
      fetchLiveStreams()
      fetchAllUsers()
    }, 30000)
    return () => clearInterval(interval)
  }, [user, fetchLiveStreams, fetchAllUsers, fetchPastRecordings])

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

  const handlePlayRecording = (recording: any) => {
    window.open(`https://superfan.alterwork.in/files/videos/${recording.id}.webm`, "_blank")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Left Sidebar - All Users (Desktop View) */}
          <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] lg:overflow-y-auto pr-4 bg-[var(--sidebar-background)] border-r border-border hidden lg:block">
            <h2 className="text-2xl font-bold mb-4 px-4">All Users</h2>
            <div className="space-y-3 px-3">
              {" "}
              {/* Adjusted space-y and px for smaller cards */}
              {allUsers.length > 0 ? (
                allUsers.map((user) => (
                  <Card
                    key={user.id}
                    onClick={() => router.push(`/profile/${user.username}`)}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-2">
                      {" "}
                      {/* Reduced padding */}
                      <div className="flex items-center gap-2 mb-1">
                        {" "}
                        {/* Adjusted gap and mb */}
                        <div className="relative">
                          <Avatar className="h-9 w-9">
                            {" "}
                            {/* Reduced avatar size */}
                            <AvatarImage
                              src={`https://superfan.alterwork.in/files/profilepic/${user.username}.png`}
                              alt={user.username}
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg?height=36&width=36"
                              }}
                            />
                            <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {user.isLive && (
                            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-1 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">@{user.username}</h3> {/* Adjusted text size */}
                        </div>
                        {user.isLive && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                            {" "}
                            {/* Adjusted padding for badge */}
                            <div className="w-1 h-1 bg-white rounded-full mr-1"></div> {/* Adjusted live dot size */}
                            LIVE
                          </Badge>
                        )}
                      </div>
                      <div className="text-center text-xs">
                        {" "}
                        {/* Adjusted text size */}
                        <div className="font-bold text-orange-600">{formatNumber(user.followers)}</div>
                        <div className="text-xs text-muted-foreground">Followers</div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No users found.</p>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="lg:pl-4">
            {/* Live Now Section */}
            <h2 className="text-2xl font-bold mb-4">Live Now</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {isLoadingStreams ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <div className="w-full h-48 bg-muted rounded-t-lg"></div>
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))
              ) : liveStreams.length > 0 ? (
                liveStreams.map((stream) => (
                  <Card key={stream.sessionId} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img
                        src={stream.thumbnail || "/placeholder.svg"}
                        alt={stream.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                        onError={(e) => {
                          const fullUrl = `https://superfan.alterwork.in/files/thumbnails/${stream.hookId}.jpg`
                          if (e.currentTarget.src !== fullUrl) {
                            e.currentTarget.src = fullUrl
                          } else {
                            e.currentTarget.src = "/placeholder.svg?height=192&width=320"
                          }
                        }}
                      />
                      <Badge variant="destructive" className="absolute top-2 left-2 text-xs">
                        <div className="w-1.5 h-1.5 bg-white rounded-full mr-1"></div>
                        LIVE
                      </Badge>
                      <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {stream.viewers}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-1">{stream.title}</h3>
                      <p className="text-sm text-muted-foreground">{stream.streamer}</p>
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => window.open(`/viewer?roomId=${stream.UID}&hookId=${stream.hookId}`, "_blank")}
                      >
                        Watch Stream
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground mb-4">No live streams right now.</p>
                  {user && (
                    <Button
                      onClick={() => router.push("/streamer")}
                      className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Go Live Now!
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Latest Videos Section */}
            <VideoCarousel
              title="Latest Videos"
              videos={pastRecordings}
              onPlayVideo={handlePlayRecording}
              emptyMessage="No recent video uploads."
              isLoading={isLoadingRecordings}
            />

            {/* All Users Carousel (Mobile/All Views) */}
            <UserCarousel
              title="Discover Users"
              users={allUsers}
              isLoading={allUsers.length === 0 && !user}
              currentLoggedInUser={user?.displayName || user?.uid}
            />
          </section>
        </div>
      </main>
    </div>
  )
}

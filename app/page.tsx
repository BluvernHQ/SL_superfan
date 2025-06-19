"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const [liveStreams, setLiveStreams] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [isLoadingStreams, setIsLoadingStreams] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  const fetchLiveStreams = async () => {
    try {
      setIsLoadingStreams(true)
      const headers = await getAuthHeaders()

      const response = await fetch("https://superfan.alterwork.in/api/get_live", {
        method: "GET",
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Live streams data:", data) // Debug log

        const streamsArray = Object.entries(data.live || {}).map(([sessionId, streamData]: [string, any]) => {
          const thumbnailUrl = `/files/thumbnails/${streamData.hookId}.jpg`
          console.log("Generated thumbnail URL:", thumbnailUrl) // Debug log

          return {
            sessionId,
            ...streamData,
            id: streamData.roomId,
            title: streamData.title || `${streamData.name}'s Live Stream`, // Use title from API, fallback to name
            streamer: streamData.name,
            viewers: streamData.views || 0, // Use views from API instead of random number
            likes: streamData.likes || 0, // Also include likes from API
            thumbnail: thumbnailUrl,
          }
        })

        console.log("Processed streams array:", streamsArray) // Debug log
        setLiveStreams(streamsArray)
      }
    } catch (error) {
      console.error("Error fetching live streams:", error)
    } finally {
      setIsLoadingStreams(false)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const headers = await getAuthHeaders()

      const response = await fetch("https://superfan.alterwork.in/api/fetch_users", {
        method: "GET",
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        console.log("API Response:", data) // Debug log to see the actual structure

        let usersArray = []

        // Handle different possible response structures
        if (Array.isArray(data)) {
          // Direct array response
          usersArray = data
        } else if (data.users && Array.isArray(data.users)) {
          // Response wrapped in a users property
          usersArray = data.users
        } else if (data.data && Array.isArray(data.data)) {
          // Response wrapped in a data property
          usersArray = data.data
        } else {
          console.error("Unexpected API response structure:", data)
          setAllUsers([])
          return
        }

        // Transform the API response to match our component structure
        const transformedUsers = usersArray.map((userData: any, index: number) => ({
          id: userData.UID || index + 1, // Use UID as ID if available
          username: userData.display_name || userData.username || `User${index + 1}`,
          isLive: userData.status !== "notlive",
          totalSessions: userData.sessions || 0,
          followers: userData.followers || 0,
        }))

        // Filter out the current user from the list
        const filteredUsers = transformedUsers.filter((userData) => {
          if (!user) return true // Show all users if not authenticated

          // Filter by display name or UID
          const currentUserDisplayName = user.displayName
          const currentUserUID = user.uid

          return userData.username !== currentUserDisplayName && userData.id !== currentUserUID
        })

        setAllUsers(filteredUsers)
      } else {
        console.error("Failed to fetch users:", response.status, response.statusText)
        // Fallback to empty array if API fails
        setAllUsers([])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      // Fallback to empty array if API fails
      setAllUsers([])
    }
  }

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
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
  }

  useEffect(() => {
    fetchLiveStreams()
    fetchAllUsers()
    const interval = setInterval(() => {
      fetchLiveStreams()
      fetchAllUsers()
    }, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [user])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Left Sidebar - All Users */}
          <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] lg:overflow-y-auto pr-4 bg-[var(--sidebar-background)] border-r border-border">
            <h2 className="text-2xl font-bold mb-4 px-4">All Users</h2> {/* Added px-4 for consistent padding */}
            <div className="space-y-4 px-4">
              {" "}
              {/* Added px-4 for consistent padding */}
              {allUsers.length > 0 ? (
                allUsers.map((user) => (
                  <Card
                    key={user.id}
                    // Make the entire card clickable to navigate to the profile
                    onClick={() => router.push(`/profile/${user.username}`)}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    {/* Reduce padding from p-4 to p-3 for a more compact card */}
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {" "}
                        {/* Adjusted gap-3 to gap-2 */}
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            {" "}
                            {/* Reduced avatar size from h-12 w-12 to h-10 w-10 */}
                            <AvatarImage
                              src={`https://superfan.alterwork.in/files/profilepic/${user.username}.png`}
                              alt={user.username}
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg?height=40&width=40"
                              }}
                            />
                            <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {user.isLive && (
                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-1 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-base">@{user.username}</h3> {/* Adjusted text size */}
                        </div>
                        {user.isLive && (
                          <Badge variant="destructive" className="text-xs px-2 py-0.5">
                            {" "}
                            {/* Adjusted padding for badge */}
                            <div className="w-1.5 h-1.5 bg-white rounded-full mr-1"></div>
                            LIVE
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-sm">
                        {" "}
                        {/* Adjusted gap-4 to gap-2 and added text-sm */}
                        <div>
                          <div className="font-bold text-orange-600">{user.totalSessions}</div>
                          <div className="text-xs text-muted-foreground">Sessions</div>
                        </div>
                        <div>
                          <div className="font-bold text-orange-600">{formatNumber(user.followers)}</div>
                          <div className="text-xs text-muted-foreground">Followers</div>
                        </div>
                      </div>
                      {/* Removed the explicit "View Profile" button as the whole card is now clickable */}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No users found.</p>
              )}
            </div>
          </aside>

          {/* Main Content Area - Live Streams */}
          <section className="lg:pl-4">
            {" "}
            {/* Added lg:pl-4 to create space for the sticky sidebar */}
            <h2 className="text-2xl font-bold mb-4">Live Now</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        onLoad={(e) => {
                          console.log("Thumbnail loaded successfully:", e.currentTarget.src)
                        }}
                        onError={(e) => {
                          console.error("Thumbnail failed to load:", e.currentTarget.src)
                          // Try the full URL first
                          const fullUrl = `https://superfan.alterwork.in/files/thumbnails/${stream.hookId}.jpg`
                          if (e.currentTarget.src !== fullUrl) {
                            console.log("Trying full URL:", fullUrl)
                            e.currentTarget.src = fullUrl
                          } else {
                            // If full URL also fails, use placeholder
                            console.log("Full URL also failed, using placeholder")
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
                  <p className="text-muted-foreground">No live streams right now</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

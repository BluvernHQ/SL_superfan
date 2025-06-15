"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, Users } from "lucide-react"
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
      const response = await fetch("https://superfan.alterwork.in/api/get_live", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        const streamsArray = Object.entries(data.live || {}).map(([sessionId, streamData]: [string, any]) => ({
          sessionId,
          ...streamData,
          id: streamData.roomId,
          title: `${streamData.name}'s Live Stream`,
          streamer: streamData.name,
          viewers: Math.floor(Math.random() * 2000) + 100,
        }))
        setLiveStreams(streamsArray)
      }
    } catch (error) {
      console.error("Error fetching live streams:", error)
    } finally {
      setIsLoadingStreams(false)
    }
  }

  // Mock users data - replace with actual API call
  const mockUsers = [
    {
      id: 1,
      username: "GamerPro123",
      isLive: true,
      totalSessions: 45,
      followers: 2400,
    },
    {
      id: 2,
      username: "MusicMaster",
      isLive: false,
      totalSessions: 32,
      followers: 1800,
    },
    {
      id: 3,
      username: "ArtCreator",
      isLive: true,
      totalSessions: 28,
      followers: 950,
    },
  ]

  useEffect(() => {
    fetchLiveStreams()
    setAllUsers(mockUsers)
    const interval = setInterval(fetchLiveStreams, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleStartLive = () => {
    if (user) {
      router.push("/streamer")
    } else {
      router.push("/login?redirect=stream")
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        {/* Start Live Section */}
        <section className="text-center py-8 mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
            Stream Your Passion
          </h1>
          <Button
            size="lg"
            onClick={handleStartLive}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Live Stream
          </Button>
        </section>

        {/* Current Live Streams */}
        <section className="mb-8">
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
                    <div className="w-full h-48 bg-black rounded-t-lg flex items-center justify-center">
                      <Play className="w-12 h-12 text-white opacity-50" />
                    </div>
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
                      onClick={() => window.open(`/viewer?roomId=${stream.roomId}`, "_blank")}
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

        {/* All Users */}
        <section>
          <h2 className="text-2xl font-bold mb-4">All Users</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUsers.map((user) => (
              <Card key={user.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src="/placeholder.svg" alt={user.username} />
                        <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {user.isLive && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">@{user.username}</h3>
                    </div>
                    {user.isLive && (
                      <Badge variant="destructive" className="text-xs">
                        LIVE
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="font-bold text-orange-600">{user.totalSessions}</div>
                      <div className="text-xs text-muted-foreground">Sessions</div>
                    </div>
                    <div>
                      <div className="font-bold text-orange-600">{formatNumber(user.followers)}</div>
                      <div className="text-xs text-muted-foreground">Followers</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() => router.push(`/profile/${user.username}`)}
                  >
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

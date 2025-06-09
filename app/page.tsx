"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Users } from "lucide-react"
import { StreamSettingsModal } from "@/components/stream-settings-modal"
import { Navigation } from "@/components/navigation"

export default function LandingPage() {
  const [showStreamModal, setShowStreamModal] = useState(false)
  const [liveStreams, setLiveStreams] = useState<any[]>([])
  const [isLoadingStreams, setIsLoadingStreams] = useState(true)

  const categories = ["Gaming", "Music", "Art", "Cooking", "Tech", "Sports"]

  const fetchLiveStreams = async () => {
    try {
      setIsLoadingStreams(true)
      const response = await fetch("https://superfan.alterwork.in/get_live", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Convert the streams object to an array
        const streamsArray = Object.entries(data.live || {}).map(([sessionId, streamData]: [string, any]) => ({
          sessionId,
          ...streamData,
          id: streamData.roomId,
          title: `${streamData.name}'s Live Stream`,
          streamer: streamData.name,
          viewers: Math.floor(Math.random() * 2000) + 100, // Mock viewer count
          category: "Live",
          thumbnail: "/placeholder.svg?height=180&width=320",
        }))
        setLiveStreams(streamsArray)
      }
    } catch (error) {
      console.error("Error fetching live streams:", error)
    } finally {
      setIsLoadingStreams(false)
    }
  }

  useEffect(() => {
    fetchLiveStreams()

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchLiveStreams, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navigation onGoLive={() => setShowStreamModal(true)} />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-12 mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
            Stream Your Passion
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with your audience in real-time. Share your creativity, skills, and passion with the world.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
            onClick={() => setShowStreamModal(true)}
          >
            <Play className="mr-2 h-5 w-5" />
            Start Streaming Now
          </Button>
        </section>

        {/* Categories */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Browse Categories</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="px-4 py-2 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {category}
              </Badge>
            ))}
          </div>
        </section>

        {/* Featured Streams */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Live Now</h2>
            <div className="flex items-center text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
              Live
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoadingStreams ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <div className="w-full h-48 bg-muted rounded-t-lg"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))
            ) : liveStreams.length > 0 ? (
              liveStreams.map((stream) => (
                <Card key={stream.sessionId} className="group cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={stream.thumbnail || "/placeholder.svg"}
                      alt={stream.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge variant="destructive" className="text-xs">
                        <div className="w-1.5 h-1.5 bg-white rounded-full mr-1"></div>
                        LIVE
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {stream.viewers.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-t-lg">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/90 hover:bg-white text-black"
                        onClick={() => window.open(`/viewer?roomId=${stream.roomId}`, "_blank")}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Watch
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-2">
                      {stream.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">{stream.streamer}</p>
                    <Badge variant="outline" className="text-xs">
                      {stream.category}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Live Streams</h3>
                <p className="text-muted-foreground">No one is streaming right now. Check back later!</p>
              </div>
            )}
          </div>
        </section>

        {/* Stats Section */}
        <section className="mt-16 py-12 bg-muted/50 rounded-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-8">Join Our Growing Community</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-orange-600 mb-2">10K+</div>
                <div className="text-muted-foreground">Active Streamers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-500 mb-2">500K+</div>
                <div className="text-muted-foreground">Monthly Viewers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-400 mb-2">1M+</div>
                <div className="text-muted-foreground">Hours Streamed</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <StreamSettingsModal open={showStreamModal} onOpenChange={setShowStreamModal} />
    </div>
  )
}

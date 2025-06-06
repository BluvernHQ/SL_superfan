"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, Share, Users, Eye, Play } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { LiveChat } from "@/components/live-chat"

export default function ViewerPage() {
  const [isFollowing, setIsFollowing] = useState(false)
  const [likes, setLikes] = useState(156)
  const [hasLiked, setHasLiked] = useState(false)

  const otherStreams = [
    {
      id: 1,
      title: "Cooking Masterclass",
      streamer: "ChefMaster",
      viewers: 567,
      category: "Cooking",
      thumbnail: "/placeholder.svg?height=120&width=160",
    },
    {
      id: 2,
      title: "Music Production",
      streamer: "BeatMaker",
      viewers: 890,
      category: "Music",
      thumbnail: "/placeholder.svg?height=120&width=160",
    },
    {
      id: 3,
      title: "Art Workshop",
      streamer: "ArtistLife",
      viewers: 345,
      category: "Art",
      thumbnail: "/placeholder.svg?height=120&width=160",
    },
    {
      id: 4,
      title: "Tech Talk",
      streamer: "TechGuru",
      viewers: 234,
      category: "Technology",
      thumbnail: "/placeholder.svg?height=120&width=160",
    },
    {
      id: 5,
      title: "Fitness Session",
      streamer: "FitCoach",
      viewers: 123,
      category: "Fitness",
      thumbnail: "/placeholder.svg?height=120&width=160",
    },
  ]

  const handleLike = () => {
    if (!hasLiked) {
      setLikes((prev) => prev + 1)
      setHasLiked(true)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-3 flex flex-col gap-2">
            {/* Video Section */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardContent className="p-0">
                <div className="relative bg-black rounded-t-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <img
                    src="/placeholder.svg?height=400&width=700"
                    alt="Live stream"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge variant="destructive" className="text-sm">
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                      LIVE
                    </Badge>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="text-sm bg-black/70 text-white">
                      <Users className="w-3 h-3 mr-1" />
                      1,234 viewers
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
                    Epic Gaming Session - Boss Fight!
                  </div>
                </div>

                {/* Channel Details */}
                <div className="p-6 bg-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h1 className="text-xl font-bold mb-3">Epic Gaming Session - Boss Fight!</h1>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          1,234 watching
                        </span>
                        <span>Started 2 hours ago</span>
                        <Badge
                          variant="outline"
                          className="border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
                        >
                          Gaming
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <img
                          src="/placeholder.svg?height=40&width=40"
                          alt="GamerPro123"
                          className="w-10 h-10 rounded-full border-2 border-orange-300 dark:border-orange-700"
                        />
                        <div>
                          <div className="font-medium">GamerPro123</div>
                          <div className="text-sm text-muted-foreground">2.4K followers</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={hasLiked ? "default" : "outline"}
                        size="sm"
                        onClick={handleLike}
                        disabled={hasLiked}
                        className={
                          hasLiked
                            ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                            : "hover:bg-orange-50 dark:hover:bg-orange-950"
                        }
                      >
                        <Heart className={`w-4 h-4 mr-1 ${hasLiked ? "fill-current" : ""}`} />
                        {likes}
                      </Button>
                      <Button variant="outline" size="sm" className="hover:bg-orange-50 dark:hover:bg-orange-950">
                        <Share className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                      <Button
                        variant={isFollowing ? "secondary" : "default"}
                        onClick={() => setIsFollowing(!isFollowing)}
                        className={
                          !isFollowing
                            ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                            : ""
                        }
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat Section */}
            <Card className="h-80 border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Live Chat</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-full">
                <LiveChat />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Other Streams */}
          <div className="space-y-4">
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Other Live Streams</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {otherStreams.map((stream) => (
                  <div key={stream.id} className="group cursor-pointer">
                    <div className="relative mb-2">
                      <img
                        src={stream.thumbnail || "/placeholder.svg"}
                        alt={stream.title}
                        className="w-full h-24 object-cover rounded-lg group-hover:opacity-80 transition-opacity border border-orange-200 dark:border-orange-800"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge variant="destructive" className="text-xs">
                          <div className="w-1 h-1 bg-white rounded-full mr-1"></div>
                          LIVE
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs bg-black/70 text-white">
                          {stream.viewers}
                        </Badge>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="secondary" className="bg-orange-600 hover:bg-orange-700 text-white">
                          <Play className="w-4 h-4 mr-1" />
                          Watch
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {stream.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">{stream.streamer}</p>
                      <Badge
                        variant="outline"
                        className="text-xs mt-1 border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
                      >
                        {stream.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recommended Categories */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Browse Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["Gaming", "Music", "Art", "Cooking", "Tech", "Sports"].map((category) => (
                    <Button
                      key={category}
                      variant="ghost"
                      className="w-full justify-start text-sm hover:bg-orange-50 dark:hover:bg-orange-950 hover:text-orange-600 dark:hover:text-orange-400"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

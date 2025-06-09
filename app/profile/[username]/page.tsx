"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, Users, Eye, Calendar, MapPin, LinkIcon, Bell, BellOff, Share, MoreHorizontal, Clock } from "lucide-react"
import { Navigation } from "@/components/navigation"
import Link from "next/link"

export default function ProfilePage({ params }: { params: { username: string } }) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false)

  // Mock user data
  const user = {
    username: "GamerPro123",
    displayName: "Alex Gaming",
    avatar: "/images/streamer-avatar.png",
    banner: "/images/profile-banner.png",
    bio: "Professional gamer and content creator. Streaming daily at 8 PM EST. Join the community for epic gaming sessions!",
    followers: 24500,
    following: 156,
    totalViews: 1200000,
    joinDate: "March 2022",
    location: "Los Angeles, CA",
    website: "https://alexgaming.com",
    isLive: true,
    currentViewers: 1234,
    verified: true,
  }

  // Mock live stream data
  const liveStream = {
    title: "Epic Boss Battle - Final Fantasy XVI",
    category: "Gaming",
    viewers: 1234,
    duration: "2h 34m",
    thumbnail: "/images/gaming-stream-1.png",
  }

  // Mock recorded videos
  const recordedVideos = [
    {
      id: 1,
      title: "Epic Boss Battle Stream - Final Fantasy XVI",
      thumbnail: "/images/gaming-stream-1.png",
      duration: "2:15:42",
      views: 45600,
      streamDate: "2 days ago",
      category: "Gaming",
    },
    {
      id: 2,
      title: "Elden Ring Combat Tutorial Stream",
      thumbnail: "/images/gaming-stream-2.png",
      duration: "1:23:15",
      views: 78900,
      streamDate: "1 week ago",
      category: "Tutorial",
    },
    {
      id: 3,
      title: "Speedrun World Record Attempt Stream",
      thumbnail: "/images/gaming-stream-3.png",
      duration: "3:45:30",
      views: 123400,
      streamDate: "2 weeks ago",
      category: "Speedrun",
    },
    {
      id: 4,
      title: "Subscriber Q&A Gaming Stream",
      thumbnail: "/images/gaming-stream-4.png",
      duration: "2:45:20",
      views: 34200,
      streamDate: "3 weeks ago",
      category: "Q&A",
    },
    {
      id: 5,
      title: "New Game First Impressions Stream",
      thumbnail: "/images/gaming-stream-5.png",
      duration: "1:32:18",
      views: 56700,
      streamDate: "1 month ago",
      category: "Review",
    },
    {
      id: 6,
      title: "Community Game Night Stream",
      thumbnail: "/images/gaming-stream-6.png",
      duration: "2:28:45",
      views: 41300,
      streamDate: "1 month ago",
      category: "Community",
    },
  ]

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="relative mb-8">
          {/* Banner */}
          <div className="relative h-48 md:h-64 rounded-lg overflow-hidden bg-gradient-to-r from-orange-600 to-orange-400">
            <img
              src={user.banner || "/placeholder.svg?height=256&width=1200&query=gaming banner"}
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          {/* Profile Info */}
          <div className="relative -mt-16 px-6">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              {/* Avatar */}
              <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.displayName} />
                <AvatarFallback className="text-2xl">{user.displayName.charAt(0)}</AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">{user.displayName}</h1>
                  {user.verified && (
                    <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                      ✓ Verified
                    </Badge>
                  )}
                  {user.isLive && (
                    <Badge variant="destructive" className="animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                      LIVE
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">@{user.username}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {formatNumber(user.followers)} followers
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {formatNumber(user.totalViews)} total views
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {user.joinDate}
                  </span>
                  {user.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {user.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsNotificationsEnabled(!isNotificationsEnabled)}
                  className="hover:bg-orange-50 dark:hover:bg-orange-950"
                >
                  {isNotificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="icon" className="hover:bg-orange-50 dark:hover:bg-orange-950">
                  <Share className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="hover:bg-orange-50 dark:hover:bg-orange-950">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="mt-6 max-w-3xl">
                <p className="text-foreground">{user.bio}</p>
                {user.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    <LinkIcon className="w-4 h-4" />
                    {user.website.replace("https://", "")}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Stream Section */}
        {user.isLive && (
          <Card className="mb-8 border-red-200 dark:border-red-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="destructive" className="animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                    LIVE NOW
                  </Badge>
                  <span>Currently Streaming</span>
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {formatNumber(liveStream.viewers)} watching
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <div className="relative rounded-lg overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
                    <img
                      src={liveStream.thumbnail || "/placeholder.svg"}
                      alt={liveStream.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white" asChild>
                        <Link href="/viewer">
                          <Play className="w-6 h-6 mr-2" />
                          Watch Live
                        </Link>
                      </Button>
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge variant="destructive">
                        <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                        LIVE
                      </Badge>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <Badge variant="secondary" className="bg-black/70 text-white">
                        <Clock className="w-3 h-3 mr-1" />
                        {liveStream.duration}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{liveStream.title}</h3>
                    <Badge
                      variant="outline"
                      className="border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
                    >
                      {liveStream.category}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {formatNumber(liveStream.viewers)} current viewers
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Streaming for {liveStream.duration}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="videos">Past Streams</TabsTrigger>
            <TabsTrigger value="live">Live History</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Past Live Streams</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Sort by
                </Button>
                <Button variant="outline" size="sm">
                  Filter
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recordedVideos.map((video) => (
                <Card key={video.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={video.thumbnail || "/placeholder.svg?height=180&width=320&query=gaming video"}
                      alt={video.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="secondary" className="text-xs bg-black/70 text-white">
                        {video.duration}
                      </Badge>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-t-lg">
                      <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black">
                        <Play className="w-4 h-4 mr-1" />
                        Watch
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatNumber(video.views)}
                        </span>
                        <span>{video.streamDate}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
                      >
                        {video.category}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Live Tab */}
          <TabsContent value="live" className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Live Stream Archive</h3>
              <p className="text-muted-foreground">All past live streams are shown in the Past Streams tab.</p>
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Channel Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{user.bio}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Location</h4>
                    <p className="text-sm text-muted-foreground">{user.location}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Joined</h4>
                    <p className="text-sm text-muted-foreground">{user.joinDate}</p>
                  </div>
                  {user.website && (
                    <div>
                      <h4 className="font-medium mb-1">Website</h4>
                      <a
                        href={user.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
                      >
                        {user.website.replace("https://", "")}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{formatNumber(user.followers)}</div>
                      <div className="text-sm text-muted-foreground">Followers</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{formatNumber(user.totalViews)}</div>
                      <div className="text-sm text-muted-foreground">Total Views</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{recordedVideos.length}</div>
                      <div className="text-sm text-muted-foreground">Videos</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{user.following}</div>
                      <div className="text-sm text-muted-foreground">Following</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

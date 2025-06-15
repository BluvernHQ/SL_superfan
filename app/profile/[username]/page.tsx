"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, Users, Eye, UserMinus } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

export default function ProfilePage({ params }: { params: { username: string } }) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [blacklistedUsers, setBlacklistedUsers] = useState<string[]>([])

  // Mock profile data
  const profileUser = {
    username: params.username,
    displayName: "Alex Gaming",
    followers: 2400,
    following: 156,
    isLive: true,
    currentStream: {
      title: "Epic Gaming Session",
      viewers: 1234,
      roomId: "12345",
    },
    recordings: [
      {
        id: 1,
        title: "Epic Boss Battle Stream",
        views: 45600,
        date: "2 days ago",
      },
      {
        id: 2,
        title: "Tutorial Stream",
        views: 78900,
        date: "1 week ago",
      },
    ],
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      if (user?.displayName === params.username) {
        setIsOwnProfile(true)
      }
    })
    return () => unsubscribe()
  }, [params.username])

  const handleBlacklistUser = (username: string) => {
    setBlacklistedUsers((prev) => [...prev, username])
  }

  const handleUnblacklistUser = (username: string) => {
    setBlacklistedUsers((prev) => prev.filter((u) => u !== username))
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Profile Header */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src="/placeholder.svg" alt={profileUser.displayName} />
                  <AvatarFallback className="text-2xl">{profileUser.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold">{profileUser.displayName}</h1>
                  </div>
                  <p className="text-muted-foreground mb-4">@{profileUser.username}</p>
                  <div className="flex gap-6 text-sm">
                    <span>
                      <strong>{formatNumber(profileUser.followers)}</strong> followers
                    </span>
                    {isOwnProfile && (
                      <span>
                        <strong>{formatNumber(profileUser.following)}</strong> following
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isOwnProfile && (
                    <>
                      <Button
                        variant={isFollowing ? "secondary" : "default"}
                        onClick={() => setIsFollowing(!isFollowing)}
                        className={!isFollowing ? "bg-gradient-to-r from-orange-600 to-orange-500" : ""}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleBlacklistUser(profileUser.username)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Live Stream */}
          {profileUser.isLive && (
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Badge variant="destructive" className="animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                    LIVE NOW
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-base mb-2 line-clamp-2">{profileUser.currentStream.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Users className="w-4 h-4" />
                      {formatNumber(profileUser.currentStream.viewers)} watching
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() => window.open(`/viewer?roomId=${profileUser.currentStream.roomId}`, "_blank")}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Watch Live
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Past Recordings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Past Recordings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {profileUser.recordings.map((recording) => (
                <Card key={recording.id} className="cursor-pointer hover:shadow-lg transition-shadow max-w-sm">
                  <CardContent className="p-4">
                    <div className="w-full h-40 bg-black rounded mb-3 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white opacity-50" />
                    </div>
                    <h4 className="font-semibold mb-2">{recording.title}</h4>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatNumber(recording.views)}
                      </span>
                      <span>{recording.date}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Blacklisted Users (Only for own profile) */}
        {isOwnProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Blacklisted Users</CardTitle>
            </CardHeader>
            <CardContent>
              {blacklistedUsers.length > 0 ? (
                <div className="space-y-2">
                  {blacklistedUsers.map((username) => (
                    <div key={username} className="flex items-center justify-between p-2 border rounded">
                      <span>@{username}</span>
                      <Button size="sm" variant="outline" onClick={() => handleUnblacklistUser(username)}>
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No blacklisted users</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

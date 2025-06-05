"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Wifi, Activity, Settings, Mic, MicOff, Video, VideoOff } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { LiveChat } from "@/components/live-chat"
import { ViewerChart } from "@/components/viewer-chart"

export default function StreamerPage() {
  const [isLive, setIsLive] = useState(true)
  const [viewers, setViewers] = useState(1234)
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [internetStrength, setInternetStrength] = useState(85)
  const [bitrate, setBitrate] = useState(2500)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setViewers((prev) => prev + Math.floor(Math.random() * 10) - 5)
      setInternetStrength((prev) => Math.max(60, Math.min(100, prev + Math.floor(Math.random() * 10) - 5)))
      setBitrate((prev) => Math.max(1000, Math.min(5000, prev + Math.floor(Math.random() * 200) - 100)))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Video Section */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={isLive ? "destructive" : "secondary"}>{isLive ? "LIVE" : "OFFLINE"}</Badge>
                    <span className="text-sm text-muted-foreground">Streaming for 2h 34m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={micEnabled ? "default" : "destructive"}
                      size="sm"
                      onClick={() => setMicEnabled(!micEnabled)}
                    >
                      {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant={videoEnabled ? "default" : "destructive"}
                      size="sm"
                      onClick={() => setVideoEnabled(!videoEnabled)}
                    >
                      {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  {videoEnabled ? (
                    <img
                      src="/placeholder.svg?height=400&width=700"
                      alt="Live stream"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <div className="text-center">
                        <VideoOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Video is disabled</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
                    Epic Gaming Session - Boss Fight!
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat Section */}
            <Card className="h-80">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Live Chat</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-full">
                <LiveChat />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats and Controls */}
          <div className="space-y-4">
            {/* Stream Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Stream Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Viewers</span>
                    <span className="text-lg font-bold text-green-600">{viewers.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Wifi className="h-4 w-4" />
                      Internet
                    </span>
                    <span className="text-sm font-medium">{internetStrength}%</span>
                  </div>
                  <Progress value={internetStrength} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Bitrate</span>
                    <span className="text-sm font-medium">{bitrate} kbps</span>
                  </div>
                  <Progress value={(bitrate / 5000) * 100} className="h-2" />
                </div>

                <div className="pt-2 border-t">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold">2.4K</div>
                      <div className="text-xs text-muted-foreground">Followers</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">156</div>
                      <div className="text-xs text-muted-foreground">Likes</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Viewer Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Viewer Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ViewerChart />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Share Stream
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Stream Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Moderator Tools
                </Button>
                <Button
                  variant={isLive ? "destructive" : "default"}
                  className="w-full"
                  onClick={() => setIsLive(!isLive)}
                >
                  {isLive ? "End Stream" : "Go Live"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

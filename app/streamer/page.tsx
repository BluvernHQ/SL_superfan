"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Wifi, Activity, Settings, Mic, MicOff, Video, VideoOff, Play, Square, Circle } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { ViewerChart } from "@/components/viewer-chart"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"

export default function StreamerPage() {
  const [isLive, setIsLive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [viewers, setViewers] = useState(0)
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [internetStrength, setInternetStrength] = useState(85)
  const [bitrate, setBitrate] = useState(2500)
  const [roomDescription, setRoomDescription] = useState("My Awesome Stream")
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const logsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // WebRTC and Janus related refs
  const janusSessionIdRef = useRef<string | null>(null)
  const videoRoomPluginHandleRef = useRef<string | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const myPrivateIdRef = useRef<string | null>(null)
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const stopSessionPollingRef = useRef(false)

  const FLASK_PROXY_URL = "/janus_proxy"
  const FLASK_SERVER_URL = "/"

  // Firebase authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUid(user.uid)
        log("Firebase authenticated. UID: " + user.uid)
      } else {
        log("Not authenticated with Firebase. Redirecting to login...")
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (isStreaming) {
        setViewers((prev) => Math.max(0, prev + Math.floor(Math.random() * 10) - 5))
      }
      setInternetStrength((prev) => Math.max(60, Math.min(100, prev + Math.floor(Math.random() * 10) - 5)))
      setBitrate((prev) => Math.max(1000, Math.min(5000, prev + Math.floor(Math.random() * 200) - 100)))
    }, 3000)

    return () => clearInterval(interval)
  }, [isStreaming])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isStreaming || janusSessionIdRef.current) {
        stopStreamingCleanup()
      }
    }
  }, [])

  const log = (message: string) => {
    console.log(message)
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${typeof message === "object" ? JSON.stringify(message) : message}`
    setLogs((prev) => [...prev, logMessage])
  }

  const sendToProxy = async (path: string, payload: any, method = "POST") => {
    log(`Sending to proxy (${method}): ${path} with payload: ${JSON.stringify(payload)}`)
    try {
      const response = await fetch(FLASK_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path, payload: payload, method: method }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error, not JSON" }))
        log(`Proxy Error: ${response.status} - ${errorData.error?.reason || response.statusText}`)
        throw new Error(`Proxy error: ${response.status} - ${errorData.error?.reason || response.statusText}`)
      }
      const data = await response.json()
      log(`Received from proxy: ${JSON.stringify(data)}`)
      return data
    } catch (error: any) {
      log(`Error in sendToProxy: ${error.message}`)
      throw error
    }
  }

  const sendToHandler = async (path: string, payload: any, method = "POST") => {
    log(`Sending to Handler (${method}): ${path} with payload: ${JSON.stringify(payload)}`)
    try {
      const response = await fetch(FLASK_SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path, payload: payload, method: method }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error, not JSON" }))
        log(`Handler Error: ${response.status} - ${errorData.error?.reason || response.statusText}`)
        throw new Error(`Handler error: ${response.status} - ${errorData.error?.reason || response.statusText}`)
      }
      const data = await response.json()
      log(`Received from Handler: ${JSON.stringify(data)}`)
      return data
    } catch (error: any) {
      log(`Error in sendToHandler: ${error.message}`)
      throw error
    }
  }

  const startKeepAlive = () => {
    if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current)
    keepAliveIntervalRef.current = setInterval(async () => {
      if (janusSessionIdRef.current) {
        try {
          await sendToProxy(`/${janusSessionIdRef.current}`, {
            janus: "keepalive",
            transaction: `keepalive_${Date.now()}`,
          })
          log("Sent keepalive")
        } catch (error: any) {
          log(`Keepalive failed: ${error.message}.`)
        }
      }
    }, 30000)
  }

  const startSessionLongPoll = async () => {
    if (stopSessionPollingRef.current || !janusSessionIdRef.current) return
    log("Streamer: Starting session long-poll GET...")
    try {
      const response = await sendToProxy(`/${janusSessionIdRef.current}?maxev=1&rid=${Date.now()}`, null, "GET")
      if (response) {
        handleAsyncJanusEvent(response)
      }
    } catch (error: any) {
      log(`Streamer: Error in session long-poll: ${error.message}`)
      if (janusSessionIdRef.current && !stopSessionPollingRef.current) {
        setTimeout(startSessionLongPoll, 1000)
      }
      return
    }
    if (janusSessionIdRef.current && !stopSessionPollingRef.current) {
      startSessionLongPoll()
    }
  }

  const handleAsyncJanusEvent = (event: any) => {
    log(`Streamer Async Janus Event: ${JSON.stringify(event)}`)

    if (event.sender && event.sender !== videoRoomPluginHandleRef.current) {
      log(`Streamer: Event for a different handle (${event.sender}), ignoring.`)
      return
    }

    if (event.plugindata && event.plugindata.data) {
      const data = event.plugindata.data
      const videoroomEvent = data.videoroom

      if (videoroomEvent === "joined") {
        log(`Streamer: Successfully joined room ${data.room}. My ID: ${data.id}, Private ID: ${data.private_id}`)
        myPrivateIdRef.current = data.private_id
        publishOwnFeed().catch((err) => {
          log(`Error during publishOwnFeed after joined event: ${err.message}`)
          stopStreamingCleanup()
        })
      } else if (videoroomEvent === "event") {
        if (data.configured === "ok") {
          log("Streamer: 'configure' request for recording was successful.")
        }
        if (data.error_code || data.error) {
          log(`Streamer: VideoRoom event error: ${data.error} (Code: ${data.error_code})`)
          stopStreamingCleanup()
        }
      }
    }

    if (event.jsep && event.jsep.type === "answer") {
      if (pcRef.current && pcRef.current.signalingState === "have-local-offer") {
        log("Streamer: Received JSEP answer for publish.")
        pcRef.current
          .setRemoteDescription(new RTCSessionDescription(event.jsep))
          .then(() => {
            log("Streamer: Remote description (answer) set. Stream is live!")
            setIsStreaming(true)
            setIsLive(true)
            if (firebaseUid && createdRoomId) {
              sendToHandler("create_stream", {
                room_id: createdRoomId,
                room_description: roomDescription,
                session_id: janusSessionIdRef.current,
                UID: firebaseUid,
              })
            }
          })
          .catch((err) => {
            log(`Streamer: Error setting remote description (answer): ${err.message}`)
            stopStreamingCleanup()
          })
      }
    }

    if (event.janus === "trickle" && event.candidate) {
      if (pcRef.current) {
        log("Streamer: Received remote ICE candidate from Janus (trickle).")
        pcRef.current
          .addIceCandidate(new RTCIceCandidate(event.candidate))
          .catch((e) => log(`Streamer: Error adding remote ICE candidate: ${e.message}`))
      }
    }
  }

  const createJanusSession = async () => {
    const response = await sendToProxy("", { janus: "create", transaction: `create_${Date.now()}` })
    if (response && response.janus === "success") {
      janusSessionIdRef.current = response.data.id
      log(`Streamer: Janus session created: ${janusSessionIdRef.current}`)
      startKeepAlive()
      stopSessionPollingRef.current = false
      startSessionLongPoll()
      return janusSessionIdRef.current
    }
    throw new Error("Streamer: Failed to create Janus session")
  }

  const attachVideoRoomPlugin = async () => {
    if (!janusSessionIdRef.current) throw new Error("Streamer: Janus session not available")
    const response = await sendToProxy(`/${janusSessionIdRef.current}`, {
      janus: "attach",
      plugin: "janus.plugin.videoroom",
      transaction: `attach_${Date.now()}`,
    })
    if (response && response.janus === "success") {
      videoRoomPluginHandleRef.current = response.data.id
      log(`Streamer: VideoRoom plugin attached: ${videoRoomPluginHandleRef.current}`)
      return videoRoomPluginHandleRef.current
    }
    throw new Error("Streamer: Failed to attach VideoRoom plugin")
  }

  const createRoom = async (description: string) => {
    if (!videoRoomPluginHandleRef.current) throw new Error("Streamer: Plugin handle not available for creating room")
    const createMsg = {
      janus: "message",
      transaction: `createroom_${Date.now()}`,
      body: {
        request: "create",
        description: description,
        is_private: false,
        record: true,
        rec_dir: "/root/superfan_complete/recordings_raw",
        bitrate: 1024000,
      },
    }
    const response = await sendToProxy(`/${janusSessionIdRef.current}/${videoRoomPluginHandleRef.current}`, createMsg)

    if (response?.plugindata?.data?.videoroom === "created") {
      const roomId = response.plugindata.data.room
      setCreatedRoomId(roomId)
      log(`Streamer: Room created successfully with ID: ${roomId}`)
      return roomId
    } else {
      const errorReason = response?.error?.reason || response?.plugindata?.data?.error || "Unknown error creating room"
      throw new Error(`Streamer: Failed to create room: ${errorReason}`)
    }
  }

  const joinRoomAsPublisher = async (roomId: string) => {
    if (!videoRoomPluginHandleRef.current) throw new Error("Streamer: Plugin handle not available")
    const joinMsg = {
      janus: "message",
      transaction: `join_${Date.now()}`,
      body: { request: "join", ptype: "publisher", room: roomId, display: "Streamer" },
    }
    const response = await sendToProxy(`/${janusSessionIdRef.current}/${videoRoomPluginHandleRef.current}`, joinMsg)
    if (response && (response.janus === "ack" || response.janus === "success")) {
      log(`Streamer: Join request for room ${roomId} acknowledged. Waiting for 'joined' event.`)
    } else {
      throw new Error(`Streamer: Failed to send join room message: ${response?.error?.reason}`)
    }
  }

  const publishOwnFeed = async () => {
    if (!videoRoomPluginHandleRef.current) throw new Error("Streamer: Plugin handle not available for publishing")
    log("Streamer: Creating PeerConnection and publishing feed...")

    pcRef.current = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })

    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendToProxy(`/${janusSessionIdRef.current}/${videoRoomPluginHandleRef.current}`, {
          janus: "trickle",
          candidate: event.candidate,
          transaction: `trickle_${Date.now()}`,
        }).catch((err) => log(`Streamer: Error sending ICE candidate: ${err.message}`))
      }
    }

    pcRef.current.oniceconnectionstatechange = () => {
      log(`Streamer: ICE connection state: ${pcRef.current?.iceConnectionState}`)
      if (pcRef.current?.iceConnectionState === "failed" || pcRef.current?.iceConnectionState === "disconnected") {
        log("Streamer: ICE connection failed.")
        stopStreamingCleanup()
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pcRef.current?.addTrack(track, localStreamRef.current!))
    }

    try {
      const offer = await pcRef.current.createOffer()
      await pcRef.current.setLocalDescription(offer)
      log("Streamer: Offer created and set as local description.")

      const publishMsg = {
        janus: "message",
        transaction: `publish_${Date.now()}`,
        body: { request: "configure", audio: true, video: true },
        jsep: offer,
      }
      const response = await sendToProxy(
        `/${janusSessionIdRef.current}/${videoRoomPluginHandleRef.current}`,
        publishMsg,
      )
      if (response && (response.janus === "ack" || response.janus === "success")) {
        log("Streamer: Publish/Configure message sent. Waiting for JSEP answer.")
      } else {
        throw new Error(`Streamer: Failed to send publish message: ${response?.error?.reason}`)
      }
    } catch (error: any) {
      log(`Streamer: Error publishing feed: ${error.message}`)
      stopStreamingCleanup()
    }
  }

  const toggleRecording = async (start: boolean) => {
    if (!videoRoomPluginHandleRef.current || !isStreaming) {
      log("Cannot change recording state: not streaming or no handle.")
      return
    }
    log(`Sending request to ${start ? "START" : "STOP"} recording...`)
    const recMsg = {
      janus: "message",
      transaction: `rec_${Date.now()}`,
      body: {
        request: "configure",
        record: start,
        filename: `/root/superfan_complete/recordings_raw/room-${createdRoomId}-rec`,
      },
    }
    try {
      await sendToProxy(`/${janusSessionIdRef.current}/${videoRoomPluginHandleRef.current}`, recMsg)
      log(`Recording request sent successfully.`)
      setIsRecording(start)
    } catch (error: any) {
      log(`Failed to send recording request: ${error.message}`)
      alert(`Failed to ${start ? "start" : "stop"} recording. Check server logs.`)
    }
  }

  const startStreaming = async () => {
    if (!roomDescription) {
      alert("Please enter a Room Description.")
      return
    }
    log(`Streamer: Starting stream for room: "${roomDescription}"`)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: micEnabled, video: videoEnabled })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      log("Streamer: Local media obtained.")

      await createJanusSession()
      await attachVideoRoomPlugin()
      const newRoomId = await createRoom(roomDescription)
      await joinRoomAsPublisher(newRoomId)
    } catch (error: any) {
      log(`Streamer: Error starting stream: ${error.message}`)
      alert(`Error starting stream: ${error.message}`)
      stopStreamingCleanup()
    }
  }

  const stopStreamingCleanup = () => {
    log("Streamer: Initiating cleanup...")
    stopSessionPollingRef.current = true

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
      }
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }

    const cleanupPromises = []

    if (videoRoomPluginHandleRef.current && janusSessionIdRef.current) {
      if (createdRoomId) {
        const destroyMsg = {
          janus: "message",
          transaction: `destroy_${Date.now()}`,
          body: { request: "destroy", room: createdRoomId, permanent: false },
        }
        cleanupPromises.push(
          sendToProxy(`/${janusSessionIdRef.current}/${videoRoomPluginHandleRef.current}`, destroyMsg).catch((err) =>
            log(`Streamer: Error destroying room: ${err.message}`),
          ),
        )
      }

      cleanupPromises.push(
        sendToProxy(`/${janusSessionIdRef.current}/${videoRoomPluginHandleRef.current}`, {
          janus: "detach",
          transaction: `detach_${Date.now()}`,
        }).catch((err) => log(`Streamer: Error detaching plugin: ${err.message}`)),
      )
    }

    if (janusSessionIdRef.current) {
      cleanupPromises.push(
        sendToProxy(`/${janusSessionIdRef.current}`, {
          janus: "destroy",
          transaction: `destroy_${Date.now()}`,
        }).catch((err) => log(`Streamer: Error destroying session: ${err.message}`)),
      )
    }

    Promise.all(cleanupPromises).finally(() => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current)
        keepAliveIntervalRef.current = null
      }

      janusSessionIdRef.current = null
      videoRoomPluginHandleRef.current = null
      setIsStreaming(false)
      setIsLive(false)
      setIsRecording(false)
      setCreatedRoomId(null)
      myPrivateIdRef.current = null
      setViewers(0)
      log("Streamer: Streaming stopped and resources cleaned up.")
    })
  }

  const handleMicToggle = () => {
    setMicEnabled(!micEnabled)
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !micEnabled
      }
    }
  }

  const handleVideoToggle = () => {
    setVideoEnabled(!videoEnabled)
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Stream Setup */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Stream Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="roomDescription">Stream Title</Label>
                  <Input
                    id="roomDescription"
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    placeholder="Enter your stream title"
                    disabled={isStreaming}
                    className="border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-500"
                  />
                </div>
                {createdRoomId && (
                  <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm">
                      Room created! Tell viewers to join Room ID:{" "}
                      <strong className="text-blue-600 dark:text-blue-400">{createdRoomId}</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Video Section */}
            <Card className="flex-1 border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={isLive ? "destructive" : "secondary"}>{isLive ? "LIVE" : "OFFLINE"}</Badge>
                    {isStreaming && <span className="text-sm text-muted-foreground">Streaming for 2h 34m</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={micEnabled ? "default" : "destructive"}
                      size="sm"
                      onClick={handleMicToggle}
                      disabled={!isStreaming}
                      className={
                        micEnabled
                          ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                          : ""
                      }
                    >
                      {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant={videoEnabled ? "default" : "destructive"}
                      size="sm"
                      onClick={handleVideoToggle}
                      disabled={!isStreaming}
                      className={
                        videoEnabled
                          ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                          : ""
                      }
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
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {!videoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        <VideoOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Video is disabled</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
                    {roomDescription}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stream Controls */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={startStreaming}
                    disabled={isStreaming || !firebaseUid}
                    className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Streaming
                  </Button>
                  <Button onClick={stopStreamingCleanup} disabled={!isStreaming} variant="destructive">
                    <Square className="h-4 w-4 mr-2" />
                    Stop Streaming
                  </Button>
                  <Button
                    onClick={() => toggleRecording(true)}
                    disabled={!isStreaming || isRecording}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Circle className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                  <Button
                    onClick={() => toggleRecording(false)}
                    disabled={!isRecording}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Recording
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats and Controls */}
          <div className="space-y-4">
            {/* Stream Stats */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-500" />
                  Stream Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Viewers</span>
                    <span className="text-lg font-bold text-orange-600">{viewers.toLocaleString()}</span>
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

                <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-orange-600">2.4K</div>
                      <div className="text-xs text-muted-foreground">Followers</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-orange-600">156</div>
                      <div className="text-xs text-muted-foreground">Likes</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Viewer Chart */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Viewer Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ViewerChart />
              </CardContent>
            </Card>

            {/* Logs */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Stream Logs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-48 p-4" ref={logsRef}>
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <p key={index} className="text-xs text-muted-foreground font-mono">
                        {log}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, Share, Users, Eye, Play, Square, VolumeX, Volume2 } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { LiveChat } from "@/components/live-chat"
import { ShareModal } from "@/components/share-modal"
import { useSearchParams } from "next/navigation"

// Video Player Component
const VideoPlayer = ({ stream, muted, volume }: { stream: MediaStream; muted: boolean; volume: number }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100
    }
  }, [volume])

  return (
    <video ref={videoRef} autoPlay playsInline controls={false} muted={muted} className="w-full h-full object-cover" />
  )
}

export default function ViewerPage() {
  const searchParams = useSearchParams()
  const roomIdFromUrl = searchParams.get("roomId")

  const [isFollowing, setIsFollowing] = useState(false)
  const [likes, setLikes] = useState(156)
  const [hasLiked, setHasLiked] = useState(false)
  const [roomId, setRoomId] = useState(roomIdFromUrl || "")
  const [isWatching, setIsWatching] = useState(false)
  const [remoteFeeds, setRemoteFeeds] = useState<{ [key: string]: { stream: MediaStream } }>({})
  const [currentViewers, setCurrentViewers] = useState(1234)
  const [connectionState, setConnectionState] = useState<string>("disconnected")
  const [isAudioMuted, setIsAudioMuted] = useState(true) // Muted by default
  const [volume, setVolume] = useState(50) // Volume from 0-100
  const [sidebarStreams, setSidebarStreams] = useState<any[]>([])
  const [isLoadingSidebarStreams, setIsLoadingSidebarStreams] = useState(true)
  const [showDescription, setShowDescription] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const remoteVideosRef = useRef<HTMLDivElement>(null)

  // WebRTC and Janus related refs
  const janusSessionIdRef = useRef<string | null>(null)
  const mainVideoRoomHandleRef = useRef<string | null>(null)
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const stopPollingRef = useRef(false)
  const remoteFeedsRef = useRef<{ [key: string]: any }>({})

  const FLASK_PROXY_URL = "https://superfan.alterwork.in/api/janus_proxy"

  // Start watching automatically if room ID is in URL
  useEffect(() => {
    if (roomIdFromUrl && !isWatching) {
      handleWatchStream()
    }
  }, [roomIdFromUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isWatching || janusSessionIdRef.current) {
        stopWatchingCleanup()
      }
    }
  }, [])

  const log = (message: string) => {
    console.log(message)
  }

  const sendToProxy = async (path: string, payload: any, method = "POST") => {
    log(`Sending to proxy (${method}): ${path} with payload: ${JSON.stringify(payload)}`)
    try {
      const response = await fetch(FLASK_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
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
          log(`Keepalive failed: ${error.message}. Stopping keepalive.`)
          stopWatchingCleanup()
        }
      }
    }, 30000)
  }

  const createJanusSession = async () => {
    const transaction = `createsession_${Date.now()}`
    const response = await sendToProxy("", { janus: "create", transaction: transaction })
    if (response && response.janus === "success") {
      janusSessionIdRef.current = response.data.id
      log(`Janus session created: ${janusSessionIdRef.current}`)
      startKeepAlive()
      return janusSessionIdRef.current
    }
    throw new Error("Failed to create Janus session")
  }

  const attachVideoRoomPlugin = async (isMainHandle = true) => {
    if (!janusSessionIdRef.current) throw new Error("Janus session not available")
    const transaction = `attachplugin_${Date.now()}`
    const response = await sendToProxy(`/${janusSessionIdRef.current}`, {
      janus: "attach",
      plugin: "janus.plugin.videoroom",
      transaction: transaction,
    })
    if (response && response.janus === "success") {
      const handleId = response.data.id
      log(`VideoRoom plugin attached: ${handleId}`)
      if (isMainHandle) {
        mainVideoRoomHandleRef.current = handleId
        startSessionLongPoll()
      }
      return handleId
    }
    throw new Error("Failed to attach VideoRoom plugin")
  }

  const startSessionLongPoll = async () => {
    if (stopPollingRef.current || !janusSessionIdRef.current) return
    log("Starting session long-poll GET...")
    try {
      const response = await sendToProxy(`/${janusSessionIdRef.current}?maxev=1&rid=${Date.now()}`, null, "GET")
      if (response) {
        handleAsyncJanusEvent(response)
      }
    } catch (error: any) {
      log(`Error in session long-poll: ${error.message}`)
      if (janusSessionIdRef.current && !stopPollingRef.current) {
        setTimeout(startSessionLongPoll, 1000)
      }
      return
    }
    if (janusSessionIdRef.current && !stopPollingRef.current) {
      startSessionLongPoll()
    }
  }

  const joinRoomAsSubscriber = async (roomId: string) => {
    if (!mainVideoRoomHandleRef.current) throw new Error("Main plugin handle not available")
    const transaction = `join_${Date.now()}`
    const joinMsg = {
      janus: "message",
      transaction: transaction,
      body: {
        request: "join",
        ptype: "publisher",
        room: Number.parseInt(roomId),
        display: "Viewer_" + Date.now().toString().slice(-4),
      },
    }

    const response = await sendToProxy(`/${janusSessionIdRef.current}/${mainVideoRoomHandleRef.current}`, joinMsg)
    if (response && (response.janus === "ack" || response.janus === "success")) {
      log("Join as subscriber request sent. Waiting for 'joined' event via long-poll.")
      setIsWatching(true)
    } else {
      throw new Error(`Failed to send join room message: ${response?.plugindata?.data?.error || "Unknown error"}`)
    }
  }

  const handleAsyncJanusEvent = (event: any) => {
    log(`Async Janus Event: ${JSON.stringify(event)}`)

    if (event.janus === "trickle" && event.sender && event.candidate) {
      const feedHandleId = event.sender
      handleRemoteIceForFeed(feedHandleId, event.candidate)
      return
    }

    if (!event.plugindata || !event.plugindata.data) {
      return
    }

    const data = event.plugindata.data
    const videoroomEvent = data.videoroom

    if (event.sender === mainVideoRoomHandleRef.current) {
      if (videoroomEvent === "joined") {
        log(`Successfully joined room ${data.room}. My ID: ${data.id}`)
        setConnectionState("connected")
        if (data.publishers && data.publishers.length > 0) {
          log(`Found publishers: ${JSON.stringify(data.publishers)}`)
          data.publishers.forEach((publisher: any) =>
            subscribeToPublisherFeed(data.room, publisher.id, publisher.display),
          )
        } else {
          log("No publishers in the room yet.")
        }
      } else if (videoroomEvent === "event") {
        if (data.publishers && data.publishers.length > 0) {
          log(`New publishers announced: ${JSON.stringify(data.publishers)}`)
          data.publishers.forEach((publisher: any) => {
            if (!remoteFeedsRef.current[publisher.id]) {
              subscribeToPublisherFeed(data.room, publisher.id, publisher.display)
            }
          })
        } else if (data.unpublished) {
          const publisherId = data.unpublished
          log(`Publisher ${publisherId} unpublished.`)
          removeRemoteFeed(publisherId)
        } else if (data.leaving) {
          log(`Participant ${data.leaving} leaving.`)
          if (remoteFeedsRef.current[data.leaving]) {
            removeRemoteFeed(data.leaving)
          }
        } else if (data.error_code) {
          log(`VideoRoom event error on main handle: ${data.error} (Code: ${data.error_code})`)
          alert(`An error occurred: ${data.error}. The room may no longer exist.`)
          stopWatchingCleanup()
        }
      }
    } else {
      // Handle events for individual feed handles
      const feedHandleId = event.sender
      const publisherId = Object.keys(remoteFeedsRef.current).find(
        (pid) => remoteFeedsRef.current[pid].handleId === feedHandleId,
      )

      if (publisherId) {
        if (videoroomEvent === "attached" && event.jsep && event.jsep.type === "offer") {
          log(`Received JSEP offer for publisher ${publisherId} (feed ID) on handle ${feedHandleId}`)
          handleRemoteOffer(publisherId, event.jsep)
        } else if (videoroomEvent === "event") {
          if (data.error_code) {
            log(`VideoRoom event error on feed handle ${publisherId}: ${data.error} (Code: ${data.error_code})`)
            removeRemoteFeed(publisherId)
          }
        }
      }
    }
  }

  const subscribeToPublisherFeed = async (roomId: string, publisherId: string, display: string) => {
    if (remoteFeedsRef.current[publisherId]) {
      log(`Already subscribed or subscribing to ${publisherId}`)
      return
    }
    log(`Subscribing to publisher: ${publisherId} (Display: ${display}) in room ${roomId}`)

    try {
      const feedHandleId = await attachVideoRoomPlugin(false)
      remoteFeedsRef.current[publisherId] = {
        pc: null,
        handleId: feedHandleId,
        display: display,
        iceQueue: [],
      }

      const subscribeMsg = {
        janus: "message",
        transaction: `subscribe_${publisherId}_${Date.now()}`,
        body: { request: "join", ptype: "subscriber", room: Number.parseInt(roomId), feed: publisherId },
      }

      const response = await sendToProxy(`/${janusSessionIdRef.current}/${feedHandleId}`, subscribeMsg)
      if (response && response.jsep && response.jsep.type === "offer") {
        log(`Subscription join sent. Got JSEP offer directly for publisher ${publisherId}`)
        handleRemoteOffer(publisherId, response.jsep)
      } else if (response && (response.janus === "ack" || response.janus === "success")) {
        log(`Subscription join request for ${publisherId} acknowledged. Waiting for async JSEP offer.`)
      } else {
        log(`Failed to send subscribe message for ${publisherId}: ${response?.error?.reason}`)
        delete remoteFeedsRef.current[publisherId]
        if (feedHandleId) {
          sendToProxy(`/${janusSessionIdRef.current}/${feedHandleId}`, {
            janus: "detach",
            transaction: `detachfailsub_${Date.now()}`,
          }).catch((e) => log(`Error detaching failed feed handle: ${e}`))
        }
      }
    } catch (error: any) {
      log(`Error subscribing to feed ${publisherId}: ${error.message}`)
      if (remoteFeedsRef.current[publisherId] && remoteFeedsRef.current[publisherId].handleId) {
        sendToProxy(`/${janusSessionIdRef.current}/${remoteFeedsRef.current[publisherId].handleId}`, {
          janus: "detach",
          transaction: `detacherr_${Date.now()}`,
        }).catch((e) => log(`Error detaching failed feed handle: ${e}`))
      }
      delete remoteFeedsRef.current[publisherId]
    }
  }

  const handleRemoteOffer = async (publisherId: string, offerSdp: any) => {
    if (!remoteFeedsRef.current[publisherId]) return
    const feedInfo = remoteFeedsRef.current[publisherId]
    log(`Handling remote JSEP offer for publisher ${publisherId}`)

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })
    feedInfo.pc = pc

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendToProxy(`/${janusSessionIdRef.current}/${feedInfo.handleId}`, {
          janus: "trickle",
          candidate: event.candidate.toJSON(),
          transaction: `trickle_${publisherId}_${Date.now()}`,
        }).catch((err) => log(`Error sending ICE for ${publisherId}: ${err.message}`))
      }
    }

    pc.oniceconnectionstatechange = () => {
      log(`ICE connection state for ${publisherId}: ${pc.iceConnectionState}`)
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        log(`WebRTC connection established for ${publisherId}`)
      }
      if (
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "closed"
      ) {
        log(`WebRTC connection failed for ${publisherId}`)
        removeRemoteFeed(publisherId)
      }
    }

    pc.ontrack = (event) => {
      log(`Remote track received for publisher ${publisherId}`)
      if (event.streams && event.streams[0]) {
        setRemoteFeeds((prev) => ({
          ...prev,
          [publisherId]: { stream: event.streams[0] },
        }))
      }
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp))
      log(`Remote offer for ${publisherId} set.`)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      log(`Local answer for ${publisherId} created and set.`)

      const startMsg = {
        janus: "message",
        transaction: `start_${publisherId}_${Date.now()}`,
        body: { request: "start" },
        jsep: answer,
      }
      await sendToProxy(`/${janusSessionIdRef.current}/${feedInfo.handleId}`, startMsg)
      log(`'start' message with answer sent for ${publisherId}.`)

      while (feedInfo.iceQueue && feedInfo.iceQueue.length > 0) {
        const candidate = feedInfo.iceQueue.shift()
        log(`Adding queued remote ICE candidate for ${publisherId}.`)
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (error: any) {
      log(`Error handling remote offer for ${publisherId}: ${error.message}`)
      removeRemoteFeed(publisherId)
    }
  }

  const handleRemoteIceForFeed = (feedHandleId: string, candidateData: any) => {
    const publisherId = Object.keys(remoteFeedsRef.current).find(
      (pid) => remoteFeedsRef.current[pid].handleId === feedHandleId,
    )
    if (publisherId && remoteFeedsRef.current[publisherId]) {
      const feedInfo = remoteFeedsRef.current[publisherId]
      if (feedInfo.pc && feedInfo.pc.remoteDescription) {
        feedInfo.pc
          .addIceCandidate(new RTCIceCandidate(candidateData))
          .catch((e: any) => log(`Error adding remote ICE for ${publisherId}: ${e}`))
      } else {
        feedInfo.iceQueue = feedInfo.iceQueue || []
        feedInfo.iceQueue.push(candidateData)
      }
    }
  }

  const removeRemoteFeed = (publisherId: string) => {
    log(`Removing feed for publisher ${publisherId}`)
    const feedInfo = remoteFeedsRef.current[publisherId]
    if (feedInfo) {
      if (feedInfo.pc) feedInfo.pc.close()
      if (feedInfo.handleId && janusSessionIdRef.current) {
        sendToProxy(`/${janusSessionIdRef.current}/${feedInfo.handleId}`, {
          janus: "detach",
          transaction: `detach_${publisherId}_${Date.now()}`,
        }).catch((err) => log(`Error detaching feed handle ${feedInfo.handleId}: ${err.message}`))
      }
      delete remoteFeedsRef.current[publisherId]
    }

    setRemoteFeeds((prev) => {
      const newFeeds = { ...prev }
      delete newFeeds[publisherId]
      return newFeeds
    })
  }

  const handleWatchStream = async () => {
    if (!roomId) {
      alert("Please enter a valid Room ID from the streamer.")
      return
    }
    log(`Attempting to watch stream in room: ${roomId}`)
    stopPollingRef.current = false

    try {
      await createJanusSession()
      await attachVideoRoomPlugin(true)
      await joinRoomAsSubscriber(roomId)
    } catch (error: any) {
      log(`Error watching stream: ${error.message}`)
      alert(`Error watching stream: ${error.message}`)
      stopWatchingCleanup()
    }
  }

  const stopWatchingCleanup = () => {
    log("Initiating cleanup...")
    stopPollingRef.current = true

    Object.keys(remoteFeedsRef.current).forEach((publisherId) => {
      removeRemoteFeed(publisherId)
    })
    remoteFeedsRef.current = {}

    const cleanupPromises = []
    if (mainVideoRoomHandleRef.current && janusSessionIdRef.current) {
      cleanupPromises.push(
        sendToProxy(`/${janusSessionIdRef.current}/${mainVideoRoomHandleRef.current}`, {
          janus: "detach",
          transaction: `detachmain_${Date.now()}`,
        }).catch((err) => log(`Error detaching main handle: ${err.message}`)),
      )
    }
    if (janusSessionIdRef.current) {
      cleanupPromises.push(
        sendToProxy(`/${janusSessionIdRef.current}`, {
          janus: "destroy",
          transaction: `destroysession_${Date.now()}`,
        }).catch((err) => log(`Error destroying session: ${err.message}`)),
      )
    }

    Promise.all(cleanupPromises).finally(() => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current)
        keepAliveIntervalRef.current = null
      }

      janusSessionIdRef.current = null
      mainVideoRoomHandleRef.current = null
      setIsWatching(false)
      setRemoteFeeds({})
      log("Watching stopped and resources cleaned up.")
    })
  }

  const handleLike = () => {
    if (!hasLiked) {
      setLikes((prev) => prev + 1)
      setHasLiked(true)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  const fetchSidebarStreams = async () => {
    try {
      setIsLoadingSidebarStreams(true)
      const response = await fetch("https://superfan.alterwork.in/api/get_live", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Convert the streams object to an array and filter out current room
        const streamsArray = Object.entries(data.live || {})
          .filter(([sessionId, streamData]: [string, any]) => streamData.roomId !== roomId)
          .map(([sessionId, streamData]: [string, any]) => ({
            sessionId,
            ...streamData,
            id: streamData.roomId,
            title: `${streamData.name}'s Stream`,
            streamer: streamData.name,
            viewers: Math.floor(Math.random() * 1000) + 50,
            thumbnail: "/placeholder.svg?height=120&width=160",
          }))
          .slice(0, 5) // Show only top 5
        setSidebarStreams(streamsArray)
      }
    } catch (error) {
      console.error("Error fetching sidebar streams:", error)
    } finally {
      setIsLoadingSidebarStreams(false)
    }
  }

  useEffect(() => {
    fetchSidebarStreams()
    // Poll for updates every 60 seconds
    const interval = setInterval(fetchSidebarStreams, 60000)
    return () => clearInterval(interval)
  }, [roomId])

  const getStreamUrl = () => {
    if (roomId) {
      return `${window.location.origin}/viewer?roomId=${roomId}`
    }
    return ""
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Room ID Input (only show if no roomId in URL) */}
            {!roomIdFromUrl && (
              <Card className="">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter Room ID from streamer"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      disabled={isWatching}
                      className="flex-1"
                    />
                    {!isWatching ? (
                      <Button
                        onClick={handleWatchStream}
                        className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Watch Stream
                      </Button>
                    ) : (
                      <Button onClick={stopWatchingCleanup} variant="destructive">
                        <Square className="h-4 w-4 mr-2" />
                        Stop Watching
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Video Section */}
            <Card className="flex-1">
              <CardContent className="p-0">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  {/* Video Player */}
                  <div ref={remoteVideosRef} className="w-full h-full">
                    {Object.entries(remoteFeeds).map(([id, feed]) => (
                      <VideoPlayer key={id} stream={feed.stream} muted={isAudioMuted} volume={volume} />
                    ))}

                    {!isWatching && (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="text-center">
                          <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg">Enter a Room ID to start watching</p>
                        </div>
                      </div>
                    )}
                    {isWatching && Object.keys(remoteFeeds).length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-lg">Connecting to stream...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Video Overlays */}
                  {isWatching && (
                    <>
                      <div className="absolute top-4 left-4">
                        <Badge variant="destructive" className="text-sm">
                          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                          LIVE
                        </Badge>
                      </div>

                      {/* Audio Controls - Moved to bottom right */}
                      <div className="absolute bottom-4 right-4 flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsAudioMuted(!isAudioMuted)}
                          className="bg-black/70 text-white hover:bg-black/90"
                        >
                          {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </Button>

                        {/* Volume Slider */}
                        {!isAudioMuted && (
                          <div className="flex items-center gap-2 bg-black/70 rounded px-2 py-1">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={volume}
                              onChange={(e) => setVolume(Number(e.target.value))}
                              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                              style={{
                                background: `linear-gradient(to right, #ea580c 0%, #ea580c ${volume}%, #4b5563 ${volume}%, #4b5563 100%)`,
                              }}
                            />
                            <span className="text-white text-xs min-w-[2rem]">{volume}%</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Stream Details */}
                {isWatching && (
                  <div className="p-6 bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h1 className="text-xl font-bold mb-3">Live Stream - Room {roomId}</h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {formatNumber(currentViewers)} watching
                          </span>
                          <span>Live now</span>
                          <Badge
                            variant="outline"
                            className="border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
                          >
                            Live Stream
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 flex items-center justify-center text-white font-bold">
                            S
                          </div>
                          <div>
                            <div className="font-medium">Streamer</div>
                            <div className="text-sm text-muted-foreground">Broadcasting live</div>
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-orange-50 dark:hover:bg-orange-950"
                          onClick={() => setShowShareModal(true)}
                          disabled={!isWatching || !roomId}
                        >
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
                )}
              </CardContent>
            </Card>

            {/* Recommended Streams Section */}
            <Card className="">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recommended Streams</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {isLoadingSidebarStreams ? (
                    // Loading skeleton
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex gap-3 animate-pulse">
                        <div className="w-20 h-14 bg-muted rounded"></div>
                        <div className="flex-1">
                          <div className="h-3 bg-muted rounded mb-1"></div>
                          <div className="h-2 bg-muted rounded mb-1"></div>
                          <div className="h-2 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    ))
                  ) : sidebarStreams.length > 0 ? (
                    sidebarStreams.map((stream) => (
                      <div
                        key={stream.sessionId}
                        className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => window.open(`/viewer?roomId=${stream.roomId}`, "_blank")}
                      >
                        <div className="relative">
                          <img
                            src={stream.thumbnail || "/placeholder.svg"}
                            alt={stream.title}
                            className="w-20 h-14 object-cover rounded"
                          />
                          <div className="absolute top-1 left-1">
                            <Badge variant="destructive" className="text-xs px-1 py-0">
                              LIVE
                            </Badge>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">{stream.title}</h4>
                          <p className="text-xs text-muted-foreground mb-1">{stream.streamer}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {formatNumber(stream.viewers)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-6">
                      <Play className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No other streams available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chat */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-120px)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Live Chat</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-70px)]">
                <LiveChat />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        streamUrl={getStreamUrl()}
        streamTitle={`Live Stream - Room ${roomId}`}
      />

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #ea580c;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #ea580c;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  )
}

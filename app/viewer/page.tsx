"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, Share, Eye, Play, VolumeX, Volume2, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { LiveChat } from "@/components/live-chat"
import { ShareModal } from "@/components/share-modal"
import { useSearchParams, useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { getIdToken, onAuthStateChanged } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Video Player Component for recorded videos
const RecordedVideoPlayer = ({ videoUrl, title }: { videoUrl: string; title: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasVideoError, setHasVideoError] = useState(false)

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("Video playback error:", e.currentTarget.error)
    setHasVideoError(true)
  }

  if (hasVideoError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground p-4 text-center bg-black">
        <div className="text-red-500 mb-4">⚠️</div>
        <p className="text-lg font-medium mb-2">Video Playback Error</p>
        <p className="text-sm">The video could not be loaded. Please check if the file exists on the server.</p>
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      controls
      autoPlay
      playsInline
      className="w-full h-full object-contain"
      onError={handleVideoError}
    >
      <source src={videoUrl} type="video/webm" />
      Your browser does not support the video tag.
    </video>
  )
}

// Live Video Player Component
const LiveVideoPlayer = ({ stream, muted, volume }: { stream: MediaStream; muted: boolean; volume: number }) => {
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
  const router = useRouter()

  // Get URL parameters
  const type = searchParams.get("type") // "live" or "storage"
  const roomId = searchParams.get("roomId") // for live streams
  const hookId = searchParams.get("hookId") // for both live and recorded
  const videoId = searchParams.get("video") // alternative to hookId for recorded videos

  // Determine the actual video/room ID to use
  const actualVideoId = videoId || hookId
  const actualRoomId = roomId

  // State for both live and recorded videos
  const [isFollowing, setIsFollowing] = useState(false)
  const [likes, setLikes] = useState(156)
  const [hasLiked, setHasLiked] = useState(false)
  const [currentViewers, setCurrentViewers] = useState(1)
  const [showDescription, setShowDescription] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState("Guest")
  const [isChatEnabled, setIsChatEnabled] = useState(true)
  const [isLiking, setIsLiking] = useState(false)
  const [isFollowingAction, setIsFollowingAction] = useState(false)
  const [isBlockedByStreamer, setIsBlockedByStreamer] = useState(false)

  // Live streaming specific state
  const [isWatching, setIsWatching] = useState(false)
  const [remoteFeeds, setRemoteFeeds] = useState<{ [key: string]: { stream: MediaStream } }>({})
  const [connectionState, setConnectionState] = useState<string>("disconnected")
  const [isAudioMuted, setIsAudioMuted] = useState(true)
  const [volume, setVolume] = useState(50)

  // Recorded video specific state
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string>("")
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)

  // Common state
  const [streamDetails, setStreamDetails] = useState<{
    title: string
    description: string
    streamerName: string
    streamerUID: string
    startTime: string
    chatEnabled: boolean
  } | null>(null)
  const [isLoadingStreamDetails, setIsLoadingStreamDetails] = useState(false)
  const [sidebarStreams, setSidebarStreams] = useState<any[]>([])
  const [isLoadingSidebarStreams, setIsLoadingSidebarStreams] = useState(true)

  // WebRTC refs (only for live streams)
  const remoteVideosRef = useRef<HTMLDivElement>(null)
  const janusSessionIdRef = useRef<string | null>(null)
  const mainVideoRoomHandleRef = useRef<string | null>(null)
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const stopPollingRef = useRef(false)
  const remoteFeedsRef = useRef<{ [key: string]: any }>({})

  const FLASK_PROXY_URL = "https://superfan.alterwork.in/api/janus_proxy"

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    if (auth.currentUser) {
      try {
        const authToken = await getIdToken(auth.currentUser)
        headers["Authorization"] = `Bearer ${authToken}`
      } catch (tokenError) {
        console.log(`Error getting Firebase token: ${tokenError}`)
      }
    }

    return headers
  }

  // Get current user's display name
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserDisplayName(user.displayName || user.email?.split("@")[0] || "You")
      } else {
        setCurrentUserDisplayName("Guest")
      }
    })
    return () => unsubscribe()
  }, [])

  // Initialize based on type
  useEffect(() => {
    if (type === "storage" && actualVideoId) {
      // Handle recorded video
      setRecordedVideoUrl(`https://superfan.alterwork.in/files/videos/${actualVideoId}.webm`)
      fetchVideoDetails(actualVideoId)
    } else if (type === "live" && actualRoomId) {
      // Handle live stream
      handleWatchStream()
      fetchStreamDetails(actualRoomId)
    } else {
      console.error("Invalid URL parameters. Expected type=storage&video=ID or type=live&roomId=ID")
    }
  }, [type, actualVideoId, actualRoomId])

  // Fetch video details for recorded videos
  const fetchVideoDetails = async (videoId: string) => {
    try {
      setIsLoadingStreamDetails(true)
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
          const video = data.user.find((rec: any) => rec.hookId === videoId)
          if (video) {
            setStreamDetails({
              title: video.title || video.description || `Recording ${videoId}`,
              description: video.description || "",
              streamerName: video.name || "Unknown",
              streamerUID: video.UID || "",
              startTime: video.start || "",
              chatEnabled: false, // Recorded videos don't have live chat
            })
            setLikes(video.likes || 0)
            setCurrentViewers(video.maxviews || 0)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching video details:", error)
    } finally {
      setIsLoadingStreamDetails(false)
    }
  }

  // Fetch stream details for live streams (existing function)
  const fetchStreamDetails = async (roomId: string) => {
    try {
      setIsLoadingStreamDetails(true)
      const headers = await getAuthHeaders()

      const response = await fetch("https://superfan.alterwork.in/api/get_live_det", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            room_id: roomId,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setStreamDetails({
          title: data.title || `Live Stream - Room ${roomId}`,
          description: data.description || "",
          streamerName: data.name || "Streamer",
          streamerUID: data.UID || "",
          startTime: data.start || "",
          chatEnabled: data.chatEnabled !== undefined ? data.chatEnabled : true,
        })
        setIsChatEnabled(data.chatEnabled !== undefined ? data.chatEnabled : true)

        if (data.likes !== undefined) {
          setLikes(data.likes)
        }
      }
    } catch (error) {
      console.error("Error fetching stream details:", error)
    } finally {
      setIsLoadingStreamDetails(false)
    }
  }

  // Live streaming functions (existing WebRTC code)
  const log = (message: string) => {
    console.log(message)
  }

  const sendToProxy = async (path: string, payload: any, method = "POST") => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(FLASK_PROXY_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ path: path, payload: payload, method: method }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        throw new Error(`Proxy error: ${response.status} - ${errorData.error?.reason || response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
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
        room: roomId,
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
        body: { request: "join", ptype: "subscriber", room: roomId, feed: publisherId },
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

        // Increment view count when video stream is successfully received
        if (janusSessionIdRef.current && actualRoomId) {
          incrementViewCount(janusSessionIdRef.current, actualRoomId)
          log(`Called incrementViewCount for session ${janusSessionIdRef.current} and room ${actualRoomId}`)
        }
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
          transaction: `detachfailsub_${Date.now()}`,
        }).catch((e) => log(`Error detaching failed feed handle: ${e}`))
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
    if (!actualRoomId) {
      alert("Please enter a valid Room ID from the streamer.")
      return
    }
    log(`Attempting to watch stream in room: ${actualRoomId}`)
    stopPollingRef.current = false

    try {
      await createJanusSession()
      await attachVideoRoomPlugin(true)
      await joinRoomAsSubscriber(actualRoomId)
    } catch (error: any) {
      log(`Error watching stream: ${error.message}`)
      alert(`Error watching stream: ${error.message}`)
      stopWatchingCleanup()
    }
  }

  // Function to increment view count when viewer connects
  const incrementViewCount = async (sessionId: string, roomId: string) => {
    try {
      const headers = await getAuthHeaders()

      const response = await fetch("https://superfan.alterwork.in/api/create_view", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            session_id: sessionId,
            room_id: roomId,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        log(`View count incremented successfully: ${JSON.stringify(data)}`)
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        log(`Failed to increment view count: ${response.status} - ${errorData.message || errorData.reason}`)
      }
    } catch (error: any) {
      log(`Error incrementing view count: ${error.message}`)
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

  async function handleLike() {
    if (hasLiked || !actualRoomId || isLiking) {
      return
    }
    setIsLiking(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/create_like", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            room_id: actualRoomId,
          },
        }),
      })

      if (response.ok) {
        setLikes((prev) => prev + 1)
        setHasLiked(true)
        log("Like successfully recorded.")
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        log(`Failed to record like: ${response.status} - ${errorData.message || errorData.reason}`)
        alert(`Failed to like stream: ${errorData.message || "Please try again."}`)
      }
    } catch (error: any) {
      log(`Error recording like: ${error.message}`)
      alert(`Error liking stream: ${error.message}`)
    } finally {
      setIsLiking(false)
    }
  }

  // Add the `handleUnlike` function:
  async function handleUnfollow() {
    if (!auth.currentUser) {
      router.push("/login?redirect=viewer&roomId=" + actualRoomId)
      return
    }
    if (!isFollowing || !actualRoomId || isFollowingAction || !streamDetails?.streamerName) {
      return
    }
    setIsFollowingAction(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/un_follow", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            unfollow: streamDetails.streamerName,
          },
        }),
      })

      if (response.ok) {
        setIsFollowing(false)
        // Optionally, update followers count if API returns it
        log(`Successfully unfollowed ${streamDetails.streamerName}.`)
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        log(`Failed to unfollow: ${response.status} - ${errorData.message || errorData.reason}`)
        alert(`Failed to unfollow streamer: ${errorData.message || "Please try again."}`)
      }
    } catch (error: any) {
      log(`Error unfollowing streamer: ${error.message}`)
      alert(`Error unfollowing streamer: ${error.message}`)
    } finally {
      setIsFollowingAction(false)
    }
  }

  async function handleFollow() {
    if (!auth.currentUser) {
      router.push("/login?redirect=viewer&roomId=" + actualRoomId)
      return
    }
    if (isFollowing || !actualRoomId || isFollowingAction || !streamDetails?.streamerName) {
      return
    }
    setIsFollowingAction(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/create_follower", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            follow: streamDetails.streamerName,
          },
        }),
      })

      if (response.ok) {
        setIsFollowing(true)
        // Optionally, update followers count if API returns it
        log(`Successfully followed ${streamDetails.streamerName}.`)
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        log(`Failed to follow: ${response.status} - ${errorData.message || errorData.reason}`)
        alert(`Failed to follow streamer: ${errorData.message || "Please try again."}`)
      }
    } catch (error: any) {
      log(`Error following streamer: ${error.message}`)
      alert(`Error following streamer: ${error.message}`)
    } finally {
      setIsFollowingAction(false)
    }
  }

  const checkIfFollowing = async () => {
    if (!auth.currentUser || !streamDetails?.streamerName) {
      setIsFollowing(false)
      return
    }
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/did_follow", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            did_follow: streamDetails.streamerName,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsFollowing(data.followed)
      } else {
        console.error("Failed to check follow status:", response.status, response.statusText)
        setIsFollowing(false)
      }
    } catch (error) {
      console.error("Error checking follow status:", error)
      setIsFollowing(false)
    }
  }

  useEffect(() => {
    if (streamDetails?.streamerName && currentUserDisplayName !== "Guest") {
      checkIfFollowing()
    }
  }, [streamDetails?.streamerName, currentUserDisplayName])

  // New function to check if the current user is blocked by the streamer
  const checkBlocklistStatus = async () => {
    // Only check if logged in and streamer name is available
    if (currentUserDisplayName === "Guest" || !streamDetails?.streamerName) {
      setIsBlockedByStreamer(false) // Not blocked if not logged in or no streamer name
      return
    }

    // If the current user is the streamer, they cannot be blocked from their own chat
    if (currentUserDisplayName === streamDetails.streamerName) {
      setIsBlockedByStreamer(false)
      return
    }

    log(`Checking blocklist status for ${currentUserDisplayName} by ${streamDetails.streamerName}...`)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/ami_blocklist", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            blocklist: streamDetails.streamerName, // The owner of the blocklist
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsBlockedByStreamer(data.blocked)
        log(`Blocklist status: ${data.blocked ? "Blocked" : "Not Blocked"}`)
      } else {
        console.error("Failed to check blocklist status:", response.status, response.statusText)
        setIsBlockedByStreamer(false) // Default to not blocked on error
      }
    } catch (error) {
      console.error("Error checking blocklist status:", error)
      setIsBlockedByStreamer(false) // Default to not blocked on error
    }
  }

  // Trigger blocklist check when streamDetails or currentUserDisplayName changes
  useEffect(() => {
    if (streamDetails?.streamerName && currentUserDisplayName) {
      checkBlocklistStatus()
    }
  }, [streamDetails?.streamerName, currentUserDisplayName])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const getShareUrl = () => {
    if (type === "storage" && actualVideoId) {
      return `${window.location.origin}/viewer?type=storage&video=${actualVideoId}`
    } else if (type === "live" && actualRoomId) {
      return `${window.location.origin}/viewer?type=live&roomId=${actualRoomId}${hookId ? `&hookId=${hookId}` : ""}`
    }
    return ""
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch {
      return ""
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Back Button */}
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="self-start">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {/* Main Video Section */}
            <Card className="flex-1">
              <CardContent className="p-0">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  {/* Video Player */}
                  <div ref={remoteVideosRef} className="w-full h-full">
                    {type === "storage" && recordedVideoUrl ? (
                      <RecordedVideoPlayer
                        videoUrl={recordedVideoUrl}
                        title={streamDetails?.title || "Recorded Video"}
                      />
                    ) : type === "live" && Object.keys(remoteFeeds).length > 0 ? (
                      Object.entries(remoteFeeds).map(([id, feed]) => (
                        <LiveVideoPlayer key={id} stream={feed.stream} muted={isAudioMuted} volume={volume} />
                      ))
                    ) : type === "live" ? (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="text-center">
                          {isWatching ? (
                            <>
                              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                              <p className="text-lg">Connecting to live stream...</p>
                            </>
                          ) : (
                            <>
                              <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">Loading live stream...</p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="text-center">
                          <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg">Loading video...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Video Overlays */}
                  {type === "live" && isWatching && (
                    <>
                      <div className="absolute top-4 left-4">
                        <Badge variant="destructive" className="text-sm">
                          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                          LIVE
                        </Badge>
                      </div>

                      {/* Audio Controls for live streams */}
                      <div className="absolute bottom-4 right-4 flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsAudioMuted(!isAudioMuted)}
                          className="bg-black/70 text-white hover:bg-black/90"
                        >
                          {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </Button>

                        {!isAudioMuted && (
                          <div className="flex items-center gap-2 bg-black/70 rounded px-2 py-1">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={volume}
                              onChange={(e) => setVolume(Number(e.target.value))}
                              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <span className="text-white text-xs min-w-[2rem]">{volume}%</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Video Details */}
                {streamDetails && (
                  <div className="p-6 bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h1 className="text-xl font-bold mb-3">{streamDetails.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {formatNumber(currentViewers)} {type === "live" ? "watching" : "views"}
                          </span>
                          {type === "live" ? <span>Live now</span> : <span>Recorded</span>}
                          {streamDetails.startTime && <span>Started {formatDate(streamDetails.startTime)}</span>}
                          <Badge
                            variant="outline"
                            className="border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
                          >
                            {type === "live" ? "Live Stream" : "Recorded Video"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar className="w-10 h-10">
                            <AvatarImage
                              src={`https://superfan.alterwork.in/files/profilepic/${streamDetails.streamerName}.png`}
                              alt={streamDetails.streamerName}
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg?height=40&width=40"
                              }}
                            />
                            <AvatarFallback>
                              {streamDetails.streamerName?.charAt(0)?.toUpperCase() || "S"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">@{streamDetails.streamerName}</div>
                            <div className="text-sm text-muted-foreground">
                              {type === "live" ? "Broadcasting live" : "Content creator"}
                            </div>
                          </div>
                        </div>

                        {/* Description Section */}
                        {streamDetails.description && (
                          <div className="mt-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDescription(!showDescription)}
                              className="p-0 h-auto font-medium text-sm hover:bg-transparent"
                            >
                              Description
                              {showDescription ? (
                                <ChevronUp className="w-4 h-4 ml-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-1" />
                              )}
                            </Button>
                            {showDescription && (
                              <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                                {streamDetails.description}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={hasLiked ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleLike()}
                          disabled={isLiking}
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
                        >
                          <Share className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chat (only for live streams) */}
          {type === "live" && (
            <div className="lg:col-span-1">
              <Card className="h-[calc(100vh-120px)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Live Chat</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-70px)]">
                  <LiveChat
                    roomId={actualRoomId || ""}
                    currentUserDisplayName={currentUserDisplayName}
                    enableChat={isChatEnabled}
                    isBlocked={isBlockedByStreamer}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        streamUrl={getShareUrl()}
        streamTitle={streamDetails?.title || "Video"}
      />
    </div>
  )
}

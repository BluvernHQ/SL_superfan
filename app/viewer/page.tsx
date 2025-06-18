"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, Share, Users, Eye, Play, Square, VolumeX, Volume2, ChevronDown, ChevronUp } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { LiveChat } from "@/components/live-chat"
import { ShareModal } from "@/components/share-modal"
import { useSearchParams } from "next/navigation"
import { auth } from "@/lib/firebase"
import { getIdToken, onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"

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
  const router = useRouter()

  const [isFollowing, setIsFollowing] = useState(false)
  const [likes, setLikes] = useState(156)
  const [hasLiked, setHasLiked] = useState(false)
  const [roomId, setRoomId] = useState(roomIdFromUrl || "")
  const [isWatching, setIsWatching] = useState(false)
  const [remoteFeeds, setRemoteFeeds] = useState<{ [key: string]: { stream: MediaStream } }>({})
  const [currentViewers, setCurrentViewers] = useState(1)
  const [connectionState, setConnectionState] = useState<string>("disconnected")
  const [isAudioMuted, setIsAudioMuted] = useState(true) // Muted by default
  const [volume, setVolume] = useState(50) // Volume from 0-100
  const [sidebarStreams, setSidebarStreams] = useState<any[]>([])
  const [isLoadingSidebarStreams, setIsLoadingSidebarStreams] = useState(true)
  const [showDescription, setShowDescription] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState("Guest") // Default for chat
  const [isChatEnabled, setIsChatEnabled] = useState(true) // State for chat enablement
  const [isLiking, setIsLiking] = useState(false)
  const [isFollowingAction, setIsFollowingAction] = useState(false)

  // Stream details from API
  const [streamDetails, setStreamDetails] = useState<{
    title: string
    description: string
    streamerName: string
    streamerUID: string
    startTime: string
    chatEnabled: boolean // Add chatEnabled to stream details
  } | null>(null)
  const [isLoadingStreamDetails, setIsLoadingStreamDetails] = useState(false)

  const remoteVideosRef = useRef<HTMLDivElement>(null)

  // WebRTC and Janus related refs
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
        console.log("Firebase auth token added to request headers")
      } catch (tokenError) {
        console.log(`Error getting Firebase token: ${tokenError}`)
      }
    }

    return headers
  }

  // Get current user's display name for chat
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

  // Function to fetch stream details
  const fetchStreamDetails = async (roomId: string) => {
    console.log("Attempting to fetch stream details for roomId:", roomId) // Debug log
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

      console.log("Raw response from get_live_det:", response) // Debug log

      if (response.ok) {
        const data = await response.json()
        console.log("Stream details data from API:", data) // Debug log

        setStreamDetails({
          title: data.title || `Live Stream - Room ${roomId}`,
          description: data.description || "",
          streamerName: data.name || "Streamer",
          streamerUID: data.UID || "",
          startTime: data.start || "",
          chatEnabled: data.chatEnabled !== undefined ? data.chatEnabled : true, // Default to true if not provided
        })
        setIsChatEnabled(data.chatEnabled !== undefined ? data.chatEnabled : true) // Update chat enabled state

        console.log("Stream details state after update:", {
          title: data.title || `Live Stream - Room ${roomId}`,
          description: data.description || "",
          streamerName: data.name || "Streamer",
          streamerUID: data.UID || "",
          startTime: data.start || "",
          chatEnabled: data.chatEnabled !== undefined ? data.chatEnabled : true,
        }) // Debug log

        // Also update likes from the API response
        if (data.likes !== undefined) {
          setLikes(data.likes)
        }
      } else {
        console.error("Failed to fetch stream details:", response.status, response.statusText)
        // Set fallback details
        setStreamDetails({
          title: `Live Stream - Room ${roomId}`,
          description: "",
          streamerName: "Streamer",
          streamerUID: "",
          startTime: "",
          chatEnabled: true, // Fallback to true
        })
        setIsChatEnabled(true) // Fallback to true
      }
    } catch (error) {
      console.error("Error fetching stream details:", error)
      // Set fallback details
      setStreamDetails({
        title: `Live Stream - Room ${roomId}`,
        description: "",
        streamerName: "Streamer",
        streamerUID: "",
        startTime: "",
        chatEnabled: true, // Fallback to true
      })
      setIsChatEnabled(true) // Fallback to true
    } finally {
      setIsLoadingStreamDetails(false)
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

  const fetchViewCount = async () => {
    if (!roomId) return

    try {
      const headers = await getAuthHeaders()

      const response = await fetch("https://superfan.alterwork.in/api/get_views", {
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
        console.log("View count data:", data) // Debug log

        // Update the current viewers count with real data from API
        if (data.views !== undefined) {
          // Ensure at least 1 viewer is shown when someone is actively watching
          setCurrentViewers(Math.max(data.views, isWatching ? 1 : 0))
        } else if (isWatching) {
          // If no view data but someone is watching, show at least 1
          setCurrentViewers(Math.max(currentViewers, 1))
        }
      } else {
        console.error("Failed to fetch view count:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error fetching view count:", error)
    }
  }

  // Start watching automatically if room ID is in URL
  useEffect(() => {
    if (roomIdFromUrl && !isWatching) {
      handleWatchStream()
    }
  }, [roomIdFromUrl])

  // Fetch stream details when roomId changes
  useEffect(() => {
    console.log("useEffect triggered for roomId:", roomId) // Debug log
    if (roomId) {
      fetchStreamDetails(roomId)
    }
  }, [roomId])

  // Fetch view count periodically when watching
  useEffect(() => {
    if (isWatching && roomId) {
      // Fetch immediately
      fetchViewCount()

      // Then fetch every 10 seconds
      const interval = setInterval(fetchViewCount, 10000)
      return () => clearInterval(interval)
    }
  }, [isWatching, roomId])

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
      const headers = await getAuthHeaders()

      const response = await fetch(FLASK_PROXY_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ path: path, payload: payload, method: method }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
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

        // Increment view count when video stream is successfully received
        if (janusSessionIdRef.current && roomId) {
          incrementViewCount(janusSessionIdRef.current, roomId)
          log(`Called incrementViewCount for session ${janusSessionIdRef.current} and room ${roomId}`)
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

  async function handleLike() {
    if (hasLiked || !roomId || isLiking) {
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
            room_id: roomId,
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
      router.push("/login?redirect=viewer&roomId=" + roomId)
      return
    }
    if (!isFollowing || !roomId || isFollowingAction || !streamDetails?.streamerName) {
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
      router.push("/login?redirect=viewer&roomId=" + roomId)
      return
    }
    if (isFollowing || !roomId || isFollowingAction || !streamDetails?.streamerName) {
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
      const headers = await getAuthHeaders()

      const response = await fetch("https://superfan.alterwork.in/api/get_live", {
        method: "GET",
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Sidebar streams data:", data) // Debug log

        // Convert the streams object to an array and filter out current room
        const streamsArray = Object.entries(data.live || {})
          .filter(([sessionId, streamData]: [string, any]) => streamData.roomId !== roomId)
          .map(([sessionId, streamData]: [string, any]) => {
            const thumbnailUrl = `/files/thumbnails/${streamData.roomId}.jpg`
            console.log("Generated sidebar thumbnail URL:", thumbnailUrl) // Debug log

            return {
              sessionId,
              ...streamData,
              id: streamData.roomId,
              title: streamData.title || `${streamData.name}'s Stream`, // Use title from API
              streamer: streamData.name,
              viewers: streamData.views || 0, // Use real views from API
              likes: streamData.likes || 0, // Include likes from API
              thumbnail: thumbnailUrl,
            }
          })
          .slice(0, 5) // Show only top 5

        console.log("Processed sidebar streams:", streamsArray) // Debug log
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
    const interval = setInterval(fetchSidebarStreams, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [roomId])

  const getStreamUrl = () => {
    if (roomId) {
      return `${window.location.origin}/viewer?roomId=${roomId}`
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

  console.log("Current streamDetails state in render:", streamDetails) // Debug log

  async function handleUnlike() {
    if (!hasLiked || !roomId || isLiking) {
      return
    }
    setIsLiking(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/delete_like", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            room_id: roomId,
          },
        }),
      })

      if (response.ok) {
        setLikes((prev) => prev - 1)
        setHasLiked(false)
        log("Like successfully removed.")
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        log(`Failed to remove like: ${response.status} - ${errorData.message || errorData.reason}`)
        alert(`Failed to unlike stream: ${errorData.message || "Please try again."}`)
      }
    } catch (error: any) {
      log(`Error removing like: ${error.message}`)
      alert(`Error unliking stream: ${error.message}`)
    } finally {
      setIsLiking(false)
    }
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
                {(isWatching || streamDetails) && (
                  <div className="p-6 bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {isLoadingStreamDetails ? (
                          <div className="animate-pulse">
                            <div className="h-6 bg-muted rounded mb-3 w-3/4"></div>
                            <div className="h-4 bg-muted rounded mb-2 w-1/2"></div>
                            <div className="h-4 bg-muted rounded mb-4 w-1/3"></div>
                          </div>
                        ) : (
                          <>
                            <h1 className="text-xl font-bold mb-3">
                              {streamDetails?.title || `Live Stream - Room ${roomId}`}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                              <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {formatNumber(currentViewers)} watching
                              </span>
                              <span>Live now</span>
                              {streamDetails?.startTime && <span>Started {formatDate(streamDetails.startTime)}</span>}
                              <Badge
                                variant="outline"
                                className="border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
                              >
                                Live Stream
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 flex items-center justify-center text-white font-bold">
                                {streamDetails?.streamerName?.charAt(0)?.toUpperCase() || "S"}
                              </div>
                              <div>
                                <div className="font-medium">@{streamDetails?.streamerName || "Streamer"}</div>
                                <div className="text-sm text-muted-foreground">Broadcasting live</div>
                              </div>
                            </div>

                            {/* Description Section */}
                            {streamDetails?.description && (
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
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={hasLiked ? "default" : "outline"}
                          size="sm"
                          onClick={hasLiked ? handleUnlike : handleLike} // Toggle between like and unlike
                          disabled={isLiking || !roomId} // Disable while loading or if no room ID
                          className={
                            hasLiked
                              ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                              : "hover:bg-orange-50 dark:hover:bg-orange-950"
                          }
                        >
                          <Heart className={`w-4 h-4 mr-1 ${hasLiked ? "fill-current" : ""}`} />
                          {isLiking ? (hasLiked ? "Unliking..." : "Liking...") : likes}
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
                          onClick={isFollowing ? handleUnfollow : handleFollow}
                          disabled={
                            isFollowingAction ||
                            !auth.currentUser ||
                            !streamDetails?.streamerName ||
                            (auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0]) ===
                              streamDetails?.streamerName
                          }
                          className={
                            !isFollowing
                              ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                              : ""
                          }
                        >
                          {isFollowingAction
                            ? isFollowing
                              ? "Unfollowing..."
                              : "Following..."
                            : isFollowing
                              ? "Following"
                              : "Follow"}
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
                            onLoad={(e) => {
                              console.log("Sidebar thumbnail loaded successfully:", e.currentTarget.src)
                            }}
                            onError={(e) => {
                              console.error("Sidebar thumbnail failed to load:", e.currentTarget.src)
                              // Try the full URL first
                              const fullUrl = `https://superfan.alterwork.in/files/thumbnails/${stream.roomId}.jpg`
                              if (e.currentTarget.src !== fullUrl) {
                                console.log("Trying full sidebar URL:", fullUrl)
                                e.currentTarget.src = fullUrl
                              } else {
                                // If full URL also fails, use placeholder
                                console.log("Full sidebar URL also failed, using placeholder")
                                e.currentTarget.src = "/placeholder.svg?height=56&width=80"
                              }
                            }}
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
                <LiveChat roomId={roomId} currentUserDisplayName={currentUserDisplayName} enableChat={isChatEnabled} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        streamUrl={getStreamUrl()}
        streamTitle={streamDetails?.title || `Live Stream - Room ${roomId}`}
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

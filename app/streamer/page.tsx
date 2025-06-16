"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Video, VideoOff, Play, Square, Share, Users } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { getIdToken } from "firebase/auth"
import { useRouter } from "next/navigation"
import { LiveChat } from "@/components/live-chat"
import { ShareModal } from "@/components/share-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StreamDetailsModal } from "@/components/stream-details-modal" // Import the new modal component

export default function StreamerPage() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [viewers, setViewers] = useState(0)
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [enableChat, setEnableChat] = useState(true)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [roomId, setRoomId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [internetStrength, setInternetStrength] = useState(85)
  const [bitrate, setBitrate] = useState(2500)
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [likes, setLikes] = useState(156)
  const [hasLiked, setHasLiked] = useState(false)
  const [streamDuration, setStreamDuration] = useState("00:00:00")
  const [isLoading, setIsLoading] = useState(false)
  const [isLive, setIsLive] = useState(isStreaming)
  const [showStreamDetailsModal, setShowStreamDetailsModal] = useState(true) // Changed to true to open on load
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState("Streamer") // For chat

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
  const createdRoomIdRef = useRef<string | null>(null)

  const FLASK_PROXY_URL = "https://superfan.alterwork.in/api/janus_proxy"
  const FLASK_SERVER_URL = "https://superfan.alterwork.in/api/create_stream"

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
        log("Firebase auth token added to request headers")
      } catch (tokenError) {
        log(`Error getting Firebase token: ${tokenError}`)
      }
    }

    return headers
  }

  // Firebase authentication check and set current user display name
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        setFirebaseUid(currentUser.uid)
        setCurrentUserDisplayName(currentUser.displayName || currentUser.email?.split("@")[0] || "Streamer")
        log("Firebase authenticated. UID: " + currentUser.uid)
      } else {
        log("Not authenticated with Firebase. Redirecting to login...")
        router.push("/login")
      }
    })
    return () => unsubscribe()
  }, [router])

  const testServerConnection = async () => {
    log("Testing server connection...")
    try {
      const headers = await getAuthHeaders()

      // Test Flask handler connection with proper payload structure
      log(`Testing connection to: ${FLASK_SERVER_URL}`)
      const handlerResponse = await fetch(FLASK_SERVER_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            test: true,
            UID: firebaseUid || "test_uid",
            username: "test_user",
          },
        }),
      })
      log(`Handler server response status: ${handlerResponse.status}`)
      log(`Handler server content-type: ${handlerResponse.headers.get("content-type")}`)

      if (handlerResponse.ok) {
        const data = await handlerResponse.json()
        log(`Server connection test successful: ${JSON.stringify(data)}`)
        return true
      } else {
        log(`Server connection test failed: ${handlerResponse.status} ${handlerResponse.statusText}`)
        return false
      }
    } catch (error: any) {
      log(`Server connection test failed: ${error.message}`)
      return false
    }
  }

  useEffect(() => {
    if (firebaseUid) {
      testServerConnection()
    }
  }, [firebaseUid])

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  // Stream duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    let startTime: number

    if (isStreaming) {
      startTime = Date.now()
      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const hours = Math.floor(elapsed / 3600)
          .toString()
          .padStart(2, "0")
        const minutes = Math.floor((elapsed % 3600) / 60)
          .toString()
          .padStart(2, "0")
        const seconds = (elapsed % 60).toString().padStart(2, "0")
        setStreamDuration(`${hours}:${minutes}:${seconds}`)
      }, 1000)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isStreaming])

  // Fetch view count periodically when streaming
  const fetchViewCount = async () => {
    if (!createdRoomId) return

    try {
      const headers = await getAuthHeaders()

      const response = await fetch("https://superfan.alterwork.in/api/get_views", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            room_id: createdRoomId,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Streamer view count data:", data) // Debug log

        // Update the viewers count with real data from API
        if (data.views !== undefined) {
          setViewers(data.views)
        }
      } else {
        console.error("Failed to fetch view count:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error fetching view count:", error)
    }
  }

  useEffect(() => {
    if (isStreaming && createdRoomId) {
      // Fetch immediately
      fetchViewCount()

      // Then fetch every 10 seconds
      const interval = setInterval(fetchViewCount, 10000)
      return () => clearInterval(interval)
    }
  }, [isStreaming, createdRoomId])

  // Simulate other real-time updates (but not viewers - that comes from API now)
  useEffect(() => {
    const interval = setInterval(() => {
      setInternetStrength((prev) => Math.max(60, Math.min(100, prev + Math.floor(Math.random() * 10) - 5)))
      setBitrate((prev) => Math.max(1000, Math.min(5000, prev + Math.floor(Math.random() * 200) - 100)))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

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

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const sendToProxy = async (path: string, payload: any, method = "POST") => {
    // Ensure we always have a payload, even if it's empty
    const requestPayload = payload || {}

    log(`Sending to proxy (${method}): ${path} with payload: ${JSON.stringify(requestPayload)}`)
    try {
      const headers = await getAuthHeaders()

      const response = await fetch(FLASK_PROXY_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          path: path,
          payload: requestPayload,
          method: method,
        }),
      })

      // Check if response is HTML instead of JSON
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("text/html")) {
        const htmlText = await response.text()
        log(`Received HTML instead of JSON. Status: ${response.status}`)
        log(`HTML content: ${htmlText.substring(0, 200)}...`)
        throw new Error(
          `Server returned HTML instead of JSON. Status: ${response.status}. This usually means the Flask proxy server is not running or the endpoint is incorrect.`,
        )
      }

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

  const sendToHandler = async (payload: any) => {
    // Validate that we have a proper payload
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid payload: payload must be a valid object")
    }

    log(`Sending to create_stream endpoint with payload: ${JSON.stringify(payload)}`)
    try {
      const headers = await getAuthHeaders()

      // Ensure the payload is properly wrapped and validated
      const requestBody = {
        payload: payload,
      }

      log(`Full request body being sent: ${JSON.stringify(requestBody)}`)

      const response = await fetch(FLASK_SERVER_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      })

      // Check if response is HTML instead of JSON
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("text/html")) {
        const htmlText = await response.text()
        log(`Handler received HTML instead of JSON. Status: ${response.status}`)
        log(`HTML content: ${htmlText.substring(0, 200)}...`)
        throw new Error(
          `Handler returned HTML instead of JSON. Status: ${response.status}. This usually means the Flask server is not running or the endpoint is incorrect.`,
        )
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error, not JSON" }))
        log(
          `Handler Error: ${response.status} - ${errorData.message || errorData.error?.reason || response.statusText}`,
        )
        throw new Error(
          `Handler error: ${response.status} - ${errorData.message || errorData.error?.reason || response.statusText}`,
        )
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
      // For GET requests, we still need to structure the request properly
      const response = await sendToProxy(`/${janusSessionIdRef.current}?maxev=1&rid=${Date.now()}`, {}, "GET")
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
          // Set loading state to false on error
          setIsLoading(false)
        })
      } else if (videoroomEvent === "event") {
        if (data.configured === "ok") {
          log("Streamer: 'configure' request for recording was successful.")
        }
        if (data.error_code || data.error) {
          log(`Streamer: VideoRoom event error: ${data.error} (Code: ${data.error_code})`)
          stopStreamingCleanup()
          // Set loading state to false on error
          setIsLoading(false)
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
            // Set loading state to false when stream is live
            setIsLoading(false)

            // Use the ref value which is set immediately
            const currentRoomId = createdRoomIdRef.current
            log(`About to call sendToHandler - firebaseUid: ${firebaseUid}, currentRoomId: ${currentRoomId}`)

            if (firebaseUid && currentRoomId) {
              log("Calling sendToHandler with create_stream...")

              // Validate all required fields before creating payload
              const username = getUserDisplayName()
              if (!username || !currentRoomId || !janusSessionIdRef.current) {
                log(
                  `Missing required fields - username: ${username}, roomId: ${currentRoomId}, sessionId: ${janusSessionIdRef.current}`,
                )
                return
              }

              // Create the payload that matches your endpoint structure
              const streamPayload = {
                room_id: currentRoomId,
                room_description: title || "Live Stream",
                session_id: janusSessionIdRef.current,
                UID: firebaseUid,
                username: username,
                title: title || "Live Stream",
                description: description || "",
                chatEnabled: enableChat, // Include chatEnabled
              }

              // Validate payload before sending - update validation to include new fields
              if (
                !streamPayload.room_id ||
                !streamPayload.UID ||
                !streamPayload.username ||
                !streamPayload.session_id ||
                !streamPayload.title ||
                streamPayload.chatEnabled === undefined // Validate chatEnabled
              ) {
                log(`Invalid payload - missing required fields: ${JSON.stringify(streamPayload)}`)
                return
              }

              sendToHandler(streamPayload)
                .then(() => {
                  log("sendToHandler create_stream completed successfully")
                })
                .catch((error) => {
                  log(`sendToHandler create_stream failed: ${error.message}`)
                })
            } else {
              log(`sendToHandler NOT called - missing firebaseUid: ${!!firebaseUid}, currentRoomId: ${!!currentRoomId}`)

              // Let's also check what we have in our refs and state
              log(`Debug info - createdRoomId state: ${createdRoomId}`)
              log(`Debug info - janusSessionIdRef: ${janusSessionIdRef.current}`)
              log(`Debug info - videoRoomPluginHandleRef: ${videoRoomPluginHandleRef.current}`)
            }
          })
          .catch((err) => {
            log(`Streamer: Error setting remote description (answer): ${err.message}`)
            stopStreamingCleanup()
            // Set loading state to false on error
            setIsLoading(false)
          })
      } else {
        log(`JSEP answer received but PeerConnection not in correct state. State: ${pcRef.current?.signalingState}`)
      }
    } else if (event.jsep) {
      log(`Received JSEP but not an answer. Type: ${event.jsep.type}`)
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

    log(`Sending createRoom message: ${JSON.stringify(createMsg)}`)
    const response = await sendToProxy(`/${janusSessionIdRef.current}/${videoRoomPluginHandleRef.current}`, createMsg)

    log(`Full createRoom response: ${JSON.stringify(response, null, 2)}`)

    // Check multiple possible response structures
    let roomId = null

    if (response?.plugindata?.data?.videoroom === "created") {
      roomId = response.plugindata.data.room
      log(`Found room ID in plugindata.data.room: ${roomId}`)
    } else if (response?.plugindata?.data?.room) {
      roomId = response.plugindata.data.room
      log(`Found room ID in plugindata.data.room (alternative): ${roomId}`)
    } else if (response?.data?.room) {
      roomId = response.data.room
      log(`Found room ID in data.room: ${roomId}`)
    } else if (response?.room) {
      roomId = response.room
      log(`Found room ID in root room: ${roomId}`)
    }

    if (roomId) {
      const roomIdString = roomId.toString()
      setCreatedRoomId(roomIdString) // Set state
      createdRoomIdRef.current = roomIdString // Set ref immediately
      log(`Streamer: Room created successfully with ID: ${roomIdString} (type: ${typeof roomId})`)
      log(`createdRoomId state set to: ${roomIdString}`)
      log(`createdRoomIdRef set to: ${roomIdString}`)
      return roomId
    } else {
      const errorReason = response?.error?.reason || response?.plugindata?.data?.error || "Unknown error creating room"
      log(`Failed to extract room ID from response. Error: ${errorReason}`)
      log(`Response structure: ${JSON.stringify(response)}`)
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

  const handleStartStreamFromModal = async () => {
    // This function is called when the "Start Stream" button inside the modal is clicked.
    // It will trigger the actual startStreaming logic and then close the modal.
    await startStreaming()
    setShowStreamDetailsModal(false)
  }

  const startStreaming = async () => {
    if (!title.trim()) {
      alert("Please enter a stream title")
      return
    }
    if (!description.trim()) {
      alert("Please enter a stream description")
      return
    }

    log(`Streamer: Starting stream: "${title}"`)
    setIsLoading(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: micEnabled, video: videoEnabled })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      log("Streamer: Local media obtained.")

      await createJanusSession()
      await attachVideoRoomPlugin()
      const newRoomId = await createRoom(title)

      log(`Room creation returned: ${newRoomId}`)
      log(`createdRoomId state is now: ${createdRoomId}`)

      await joinRoomAsPublisher(newRoomId)
    } catch (error: any) {
      log(`Streamer: Error starting stream: ${error.message}`)
      alert(`Error starting stream: ${error.message}`)
      stopStreamingCleanup()
      setIsLoading(false)
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
      setCreatedRoomId(null)
      myPrivateIdRef.current = null
      setViewers(0)
      // Set loading state to false when cleanup is complete
      setIsLoading(false)
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

  const handleCopyStreamUrl = () => {
    if (createdRoomId) {
      const streamUrl = `${window.location.origin}/viewer?roomId=${createdRoomId}`
      navigator.clipboard.writeText(streamUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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

  const getStreamUrl = () => {
    if (createdRoomId) {
      return `${window.location.origin}/viewer?roomId=${createdRoomId}`
    }
    return ""
  }

  const stopStreaming = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      localVideoRef.current.srcObject = null
    }
    setIsStreaming(false)
    setRoomId(null)
    setViewers(0)
  }

  const toggleMic = () => {
    setMicEnabled(!micEnabled)
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !micEnabled
      }
    }
  }

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled)
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled
      }
    }
  }

  const shareStream = () => {
    if (roomId || createdRoomId) {
      const streamUrl = `${window.location.origin}/viewer?roomId=${roomId || createdRoomId}`
      navigator.clipboard.writeText(streamUrl)
      alert("Stream URL copied to clipboard!")
    }
  }

  const getUserDisplayName = () => {
    return user?.displayName || user?.email?.split("@")[0] || "User"
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Section */}
            <Card className="">
              <CardContent className="p-0">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                  {/* Start Streaming Button */}
                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Button
                        onClick={() => setShowStreamDetailsModal(true)} // This button will still open the modal if it's closed
                        disabled={!firebaseUid || isLoading}
                        size="lg"
                        className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Starting Stream...
                          </>
                        ) : (
                          <>
                            <Play className="h-5 w-5 mr-2" />
                            Start Streaming
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Video Disabled Overlay */}
                  {!videoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        <VideoOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Video is disabled</p>
                      </div>
                    </div>
                  )}

                  {/* Stream Controls Overlay (Top Right) */}
                  {isStreaming && (
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <Button
                        variant={micEnabled ? "default" : "destructive"}
                        size="sm"
                        onClick={handleMicToggle}
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
                        className={
                          videoEnabled
                            ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                            : ""
                        }
                      >
                        {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}

                  {/* Stream Info Overlay (Bottom Left) */}
                  {isStreaming && (
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                      <div className="bg-black/70 text-white px-3 py-1 rounded flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {formatNumber(viewers)} viewers
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stream Info - Only show when streaming */}
            {isStreaming && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h1 className="text-xl font-bold mb-3">{title}</h1>
                      {description && <p className="text-muted-foreground mb-4">{description}</p>}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {formatNumber(viewers)} watching
                        </span>
                        <span>Duration: {streamDuration}</span>
                        <Badge variant="destructive" className="animate-pulse">
                          <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                          LIVE
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="/placeholder.svg" alt="Channel" />
                          <AvatarFallback>@</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">@{getUserDisplayName()}</div>
                          <div className="text-sm text-muted-foreground">Broadcasting live</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={stopStreamingCleanup} variant="destructive">
                        <Square className="h-4 w-4 mr-2" />
                        Stop Stream
                      </Button>
                      <Button
                        onClick={() => setShowShareModal(true)}
                        variant="outline"
                        className="hover:bg-orange-50 dark:hover:bg-orange-950"
                      >
                        <Share className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat Section */}
          <div>
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="text-lg">Live Chat</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-70px)]">
                <LiveChat
                  roomId={createdRoomId}
                  currentUserDisplayName={currentUserDisplayName}
                  enableChat={enableChat}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        streamUrl={getStreamUrl()}
        streamTitle={title || "My Live Stream"}
      />

      {/* Stream Details Modal */}
      <StreamDetailsModal
        open={showStreamDetailsModal}
        onOpenChange={setShowStreamDetailsModal}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        tags={tags}
        setTags={setTags}
        newTag={newTag}
        setNewTag={setNewTag}
        handleAddTag={handleAddTag}
        handleRemoveTag={handleRemoveTag}
        handleKeyPress={handleKeyPress}
        enableChat={enableChat}
        setEnableChat={setEnableChat}
        onStartStream={handleStartStreamFromModal}
        isLoading={isLoading}
        firebaseUid={firebaseUid}
      />
    </div>
  )
}

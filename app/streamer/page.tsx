"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Video, VideoOff, Play, Square, Share, Users, Camera, Settings, Radio } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { getIdToken } from "firebase/auth"
import { useRouter } from "next/navigation"
import { LiveChat } from "@/components/live-chat"
import { ShareModal } from "@/components/share-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StreamDetailsModal } from "@/components/stream-details-modal"
import { DeviceSelectionModal } from "@/components/device-selection-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

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
  const [showStreamDetailsModal, setShowStreamDetailsModal] = useState(false)
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState("Streamer")
  const [showDeviceSelectionModal, setShowDeviceSelectionModal] = useState(false)
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(null)
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(null)
  const [userStatus, setUserStatus] = useState<string | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [showAlreadyLiveAlert, setShowAlreadyLiveAlert] = useState(false)

  const [existingHookId, setExistingHookId] = useState<string | null>(null)
  const [existingStreamTitle, setExistingStreamTitle] = useState<string>("")
  const [existingStreamDescription, setExistingStreamDescription] = useState<string>("")
  const [existingStreamChatEnabled, setExistingStreamChatEnabled] = useState<boolean>(true)
  const [streamType, setStreamType] = useState<"new" | "old">("new")
  const [currentHookId, setCurrentHookId] = useState<string | null>(null)

  const [modalTitle, setModalTitle] = useState("")
  const [modalDescription, setModalDescription] = useState("")
  const [modalTags, setModalTags] = useState<string[]>([])
  const [modalEnableChat, setModalEnableChat] = useState(true)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const logsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

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
  const GET_LIVE_DET_URL = "https://superfan.alterwork.in/api/get_live_det"

  const [deviceSelectionOpen, setDeviceSelectionOpen] = useState(false)

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

  useEffect(() => {
    if (firebaseUid && currentUserDisplayName) {
      checkUserStatus(currentUserDisplayName)
    }
  }, [firebaseUid, currentUserDisplayName])

  const fetchLiveStreamDetails = async (roomId: string) => {
    log(`Fetching live stream details for room ID: ${roomId}`)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(GET_LIVE_DET_URL, {
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
        log(`Live stream details fetched: ${JSON.stringify(data)}`)
        setExistingStreamTitle(data.title || "")
        setExistingStreamDescription(data.description || "")
        setExistingStreamChatEnabled(data.chatEnabled !== undefined ? data.chatEnabled : true)
        return {
          title: data.title,
          description: data.description,
          chatEnabled: data.chatEnabled,
        }
      } else {
        log(`Failed to fetch live stream details: ${response.status} ${response.statusText}`)
        return null
      }
    } catch (error: any) {
      log(`Error fetching live stream details: ${error.message}`)
      return null
    }
  }

  const checkUserStatus = async (username: string) => {
    if (!username || !firebaseUid) return

    setIsCheckingStatus(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/get_user", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            username: username,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const status = data.user?.status || "notlive"
        setUserStatus(status)
        log(`User status: ${status}`)

        if (status !== "notlive") {
          setExistingHookId(status)
          await fetchLiveStreamDetails(firebaseUid)
          setShowAlreadyLiveAlert(true)
          log("User is already live")
        } else {
          handleInitialStartStreamSetup()
        }
      } else {
        log(`Failed to check user status: ${response.status}`)
        setUserStatus("notlive")
        handleInitialStartStreamSetup()
      }
    } catch (error: any) {
      log(`Error checking user status: ${error.message}`)
      setUserStatus("notlive")
      handleInitialStartStreamSetup()
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const testServerConnection = async () => {
    log("Testing server connection...")
    try {
      const headers = await getAuthHeaders()

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

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

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

  useEffect(() => {
    if (isStreaming && createdRoomId) {
      fetchViewCount()

      const interval = setInterval(fetchViewCount, 10000)
      return () => clearInterval(interval)
    }
  }, [isStreaming, createdRoomId])

  useEffect(() => {
    const interval = setInterval(() => {
      setInternetStrength((prev) => Math.max(60, Math.min(100, prev + Math.floor(Math.random() * 10) - 5)))
      setBitrate((prev) => Math.max(1000, Math.min(5000, prev + Math.floor(Math.random() * 200) - 100)))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

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
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid payload: payload must be a valid object")
    }

    log(`Sending to create_stream endpoint with payload: ${JSON.stringify(payload)}`)
    try {
      const headers = await getAuthHeaders()

      const requestBody = {
        payload: payload,
      }

      log(`Full request body being sent: ${JSON.stringify(requestBody)}`)

      const response = await fetch(FLASK_SERVER_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      })

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
          setIsLoading(false)
        })
      } else if (videoroomEvent === "event") {
        if (data.configured === "ok") {
          log("Streamer: 'configure' request for recording was successful.")
        }
        if (data.error_code || data.error) {
          log(`Streamer: VideoRoom event error: ${data.error} (Code: ${data.error_code})`)
          stopStreamingCleanup()
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
            setIsLoading(false)

            const currentRoomId = createdRoomIdRef.current
            log(`About to call sendToHandler - firebaseUid: ${firebaseUid}, currentRoomId: ${currentRoomId}`)

            if (firebaseUid && currentRoomId) {
              log("Calling sendToHandler with create_stream...")

              const username = getUserDisplayName()
              if (!username || !currentRoomId || !janusSessionIdRef.current) {
                log(
                  `Missing required fields - username: ${username}, roomId: ${currentRoomId}, sessionId: ${janusSessionIdRef.current}`,
                )
                return
              }

              const streamPayload = {
                type: streamType,
                session_id: janusSessionIdRef.current,
                username: username,
                title: title,
                description: description,
                chatEnabled: enableChat,
                room_id: currentRoomId,
              }

              if (
                !streamPayload.room_id ||
                !streamPayload.username ||
                !streamPayload.session_id ||
                !streamPayload.title ||
                streamPayload.chatEnabled === undefined
              ) {
                log(`Invalid payload - missing required fields: ${JSON.stringify(streamPayload)}`)
                return
              }

              sendToHandler(streamPayload)
                .then(() => {
                  log("sendToHandler create_stream completed successfully")
                  if (streamType === "new") {
                    setCurrentHookId(janusSessionIdRef.current)
                  }
                })
                .catch((error) => {
                  log(`sendToHandler create_stream failed: ${error.message}`)
                })
            } else {
              log(`sendToHandler NOT called - missing firebaseUid: ${!!firebaseUid}, currentRoomId: ${!!currentRoomId}`)

              log(`Debug info - createdRoomId state: ${createdRoomId}`)
              log(`Debug info - janusSessionIdRef: ${janusSessionIdRef.current}`)
              log(`Debug info - videoRoomPluginHandleRef: ${videoRoomPluginHandleRef.current}`)
            }
          })
          .catch((err) => {
            log(`Streamer: Error setting remote description (answer): ${err.message}`)
            stopStreamingCleanup()
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

  const createPermanentJanusRoom = async (roomId: string) => {
    if (!videoRoomPluginHandleRef.current) throw new Error("Streamer: Plugin handle not available for room creation")

    log(`Attempting to create/configure permanent room: ${roomId}`)
    const createRoomMsg = {
      janus: "message",
      transaction: `create_room_${Date.now()}`,
      body: {
        request: "create",
        room: roomId,
        permanent: true,
        description: "A permanent test room for alphanumeric IDs",
        publishers: 1,
        record: true,
        rec_dir: "/root/superfan_complete/recordings_raw",
        bitrate: 5000000,
      },
    }
    const response = await sendToProxy(
      `/${janusSessionIdRef.current}/${videoRoomPluginHandleRef.current}`,
      createRoomMsg,
    )
    if (response && (response.janus === "ack" || response.janus === "success")) {
      log(`Streamer: Permanent room ${roomId} creation/configuration request sent.`)
    } else {
      throw new Error(`Streamer: Failed to create/configure permanent room: ${response?.error?.reason}`)
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

  const handleInitialStartStreamSetup = () => {
    setModalTitle("")
    setModalDescription("")
    setModalTags([])
    setModalEnableChat(true)

    setShowStreamDetailsModal(true)
  }

  const handleStreamDetailsConfirmed = async (details: {
    title: string
    description: string
    tags: string[]
    enableChat: boolean
  }) => {
    setTitle(details.title)
    setDescription(details.description)
    setTags(details.tags)
    setEnableChat(details.enableChat)
    setStreamType("new")
    setCurrentHookId(null)

    setShowStreamDetailsModal(false)
    setShowDeviceSelectionModal(true)
  }

  const handleContinueWithOldSession = async () => {
    setShowAlreadyLiveAlert(false)
    setIsLoading(true)

    setTitle(existingStreamTitle)
    setDescription(existingStreamDescription)
    setEnableChat(existingStreamChatEnabled)
    setTags([])
    setStreamType("old")
    setCreatedRoomId(firebaseUid)
    createdRoomIdRef.current = firebaseUid
    setCurrentHookId(existingHookId)

    setShowDeviceSelectionModal(true)
    setIsLoading(false)
  }

  const handleDevicesSelected = async (videoDeviceId: string | null, audioDeviceId: string | null) => {
    setSelectedVideoDeviceId(videoDeviceId)
    setSelectedAudioDeviceId(audioDeviceId)
    setShowDeviceSelectionModal(false)

    // Small delay to ensure the modal is closed
    setTimeout(() => {
      startStreaming(videoDeviceId, audioDeviceId)
    }, 100)
  }

  const startStreaming = async (videoDeviceId: string | null, audioDeviceId: string | null) => {
    if (!title.trim()) {
      alert("Please enter a stream title")
      setIsLoading(false)
      return
    }
    if (!description.trim()) {
      alert("Please enter a stream description")
      setIsLoading(false)
      return
    }

    log(`Streamer: Starting stream: "${title}" (Type: ${streamType})`)
    log(`Streamer: Using video device: ${videoDeviceId}`)
    log(`Streamer: Using audio device: ${audioDeviceId}`)
    setIsLoading(true)

    try {
      // If we already have a valid stream, use it
      if (localStreamRef.current && localStreamRef.current.active) {
        log("Using existing active stream")
        const videoTrack = localStreamRef.current.getVideoTracks()[0]
        const audioTrack = localStreamRef.current.getAudioTracks()[0]
        
        if (videoTrack && audioTrack) {
          log(`Using existing tracks - Video: ${videoTrack.label}, Audio: ${audioTrack.label}`)
          
          await createJanusSession()
          await attachVideoRoomPlugin()

          const userRoomId = firebaseUid
          if (!userRoomId) {
            throw new Error("User ID not available. Please try logging in again.")
          }

          setCreatedRoomId(userRoomId)
          createdRoomIdRef.current = userRoomId
          log(`Streamer: Using room ID: ${userRoomId}`)

          await createPermanentJanusRoom(userRoomId)
          await joinRoomAsPublisher(userRoomId)
          return
        }
      }

      // If we don't have a valid stream, create a new one
      log("Creating new stream with constraints")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true
      })

      log(`Stream obtained with ${stream.getVideoTracks().length} video and ${stream.getAudioTracks().length} audio tracks`)
      stream.getTracks().forEach(track => {
        log(`Track: ${track.kind} - ${track.label} - enabled: ${track.enabled}`)
      })

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      await createJanusSession()
      await attachVideoRoomPlugin()

      const userRoomId = firebaseUid
      if (!userRoomId) {
        throw new Error("User ID not available. Please try logging in again.")
      }

      setCreatedRoomId(userRoomId)
      createdRoomIdRef.current = userRoomId
      log(`Streamer: Using room ID: ${userRoomId}`)

      await createPermanentJanusRoom(userRoomId)
      await joinRoomAsPublisher(userRoomId)

    } catch (error: any) {
      log(`Streamer: Error starting stream: ${error.name} - ${error.message}`)
      console.error("Detailed error:", error)
      
      const errorMessage = error.name === 'NotAllowedError' 
        ? "Camera or microphone access was denied. Please grant permission and try again."
        : `Failed to access selected devices. Please try:\n1. Checking your camera/mic connections\n2. Refreshing the page\n3. Selecting different devices`
      
      alert(errorMessage)
      stopStreamingCleanup()
    } finally {
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
      setIsLoading(false)
      log("Streamer: Streaming stopped and resources cleaned up.")
      const username = getUserDisplayName()
      if (username) {
        router.push(`/profile/${username}`)
      } else {
        log("Could not get username for redirection.")
        router.push("/")
      }
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
    if (createdRoomId && currentHookId) {
      const streamUrl = `${window.location.origin}/viewer?type=live&roomId=${createdRoomId}&hookId=${currentHookId}`
      navigator.clipboard.writeText(streamUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      alert("Stream URL not available yet. Start streaming first.")
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
    if (createdRoomId && currentHookId) {
      return `${window.location.origin}/viewer?type=live&roomId=${createdRoomId}&hookId=${currentHookId}`
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

  const handleDevicePermissionDenied = () => {
    setShowDeviceSelectionModal(false)
    setShowStreamDetailsModal(true)
    alert("Camera and microphone permissions are required to start streaming.")
  }

  const testCamera = async () => {
    try {
      log("Testing camera access...")
      
      if (!navigator.mediaDevices) {
        throw new Error("Media devices are not supported in this browser")
      }

      const isSecureContext = window.location.protocol === 'https:' || 
                              window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1' ||
                              window.location.hostname === '::1'

      if (!isSecureContext) {
        throw new Error("Camera access requires HTTPS. Please access this page over a secure connection.")
      }

      log("Enumerating available devices...")
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')
      const audioDevices = devices.filter(d => d.kind === 'audioinput')
      
      log(`Found ${videoDevices.length} video devices and ${audioDevices.length} audio devices`)
      videoDevices.forEach((device, index) => {
        log(`Video device ${index + 1}: ${device.label || 'Unknown'} (${device.deviceId})`)
      })
      audioDevices.forEach((device, index) => {
        log(`Audio device ${index + 1}: ${device.label || 'Unknown'} (${device.deviceId})`)
      })

      if (videoDevices.length === 0) {
        throw new Error("No camera devices found. Please connect a camera and try again.")
      }

      const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      log(`Test camera successful. Video tracks: ${testStream.getVideoTracks().length}`)
      testStream.getVideoTracks().forEach((track, index) => {
        log(`Test video track ${index}: ${track.label}`)
      })
      testStream.getTracks().forEach(track => track.stop())
      alert("Camera test successful! All devices are working properly.")
    } catch (error: any) {
      log(`Camera test failed: ${error.name} - ${error.message}`)
      alert(`Camera test failed: ${error.message}`)
    }
  }

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
        if (data.views !== undefined) {
          setViewers(data.views)
        }
      }
    } catch (error) {
      console.error("Error fetching view count:", error)
    }
  }

  const handleCancel = () => {
    if (isStreaming) {
      stopStreamingCleanup()
    } else {
      router.back()
    }
  }

  const handleStartStop = () => {
    if (isStreaming) {
      stopStreamingCleanup()
    } else {
      handleInitialStartStreamSetup()
    }
  }

  const handleStreamTypeChange = (value: string) => {
    if (value === "new" || value === "old") {
      setStreamType(value)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation allUsers={[]} isLoadingUsers={false} />

      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Start Streaming</h1>
          {isStreaming && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-500 font-medium">Live</span>
              <Badge variant="secondary">{viewers} viewer{viewers !== 1 ? 's' : ''}</Badge>
            </div>
          )}
        </div>

        <Card className="overflow-hidden">
          <div className="relative bg-black aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="font-medium">Starting Stream...</p>
                  <p className="text-sm text-white/70">This may take a few moments</p>
                </div>
              </div>
            )}
            {!isStreaming && !isLoading && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center text-white">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Camera Preview</p>
                  <p className="text-sm text-white/70">Set up your stream to begin</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Stream Settings</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Stream Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your stream"
                  disabled={isStreaming || isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your stream"
                  disabled={isStreaming || isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Stream Type</Label>
                <Select
                  value={streamType}
                  onValueChange={handleStreamTypeChange}
                  disabled={isStreaming || isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stream type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Device Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  <span>Camera</span>
                </div>
                <Switch
                  checked={videoEnabled}
                  onCheckedChange={setVideoEnabled}
                  disabled={isStreaming || isLoading}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  <span>Microphone</span>
                </div>
                <Switch
                  checked={micEnabled}
                  onCheckedChange={setMicEnabled}
                  disabled={isStreaming || isLoading}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeviceSelectionModal(true)}
                disabled={isStreaming || isLoading}
                className="w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Devices
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartStop}
            disabled={isLoading || (!videoEnabled && !micEnabled)}
            className={cn(
              "min-w-[120px]",
              isStreaming
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isStreaming ? "Stopping..." : "Starting..."}
              </>
            ) : isStreaming ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Stop Stream
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 mr-2" />
                Go Live
              </>
            )}
          </Button>
        </div>

        <DeviceSelectionModal
          open={showDeviceSelectionModal}
          onOpenChange={setShowDeviceSelectionModal}
          onDevicesSelected={handleDevicesSelected}
          onPermissionDenied={handleDevicePermissionDenied}
        />
      </div>

      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        streamUrl={getStreamUrl()}
        streamTitle={title || "My Live Stream"}
        isLoadingUrl={!createdRoomId || !currentHookId}
      />

      <StreamDetailsModal
        open={showStreamDetailsModal}
        onOpenChange={setShowStreamDetailsModal}
        initialTitle={modalTitle}
        initialDescription={modalDescription}
        initialTags={modalTags}
        initialEnableChat={modalEnableChat}
        onConfirmDetails={handleStreamDetailsConfirmed}
        isLoading={isLoading}
        firebaseUid={firebaseUid}
      />
    </div>
  )
}

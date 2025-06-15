"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Mic, MicOff, Video, VideoOff, Play, Square, Share, Users } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import { LiveChat } from "@/components/live-chat"
import { StreamSettingsModal } from "@/components/stream-settings-modal"
import { ShareModal } from "@/components/share-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function StreamerPage() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [viewers, setViewers] = useState(0)
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [enableChat, setEnableChat] = useState(true)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [roomId, setRoomId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [internetStrength, setInternetStrength] = useState(85)
  const [bitrate, setBitrate] = useState(2500)
  const [roomDescription, setRoomDescription] = useState("My Awesome Stream")
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [copied, setCopied] = useState(false)
  const [streamSettings, setStreamSettings] = useState<{
    title: string
    description: string
    tags: string[]
    enableChat: boolean
  } | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [likes, setLikes] = useState(156)
  const [hasLiked, setHasLiked] = useState(false)
  const [streamDuration, setStreamDuration] = useState("00:00:00")
  const [isLoading, setIsLoading] = useState(false)
  const [isLive, setIsLive] = useState(isStreaming)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

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

  // Firebase authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        setFirebaseUid(currentUser.uid)
        log("Firebase authenticated. UID: " + currentUser.uid)
      } else {
        log("Not authenticated with Firebase. Redirecting to login...")
        router.push("/login")
      }
    })
    return () => unsubscribe()
  }, [router])

  // Add this useEffect after the Firebase auth useEffect:
  useEffect(() => {
    if (firebaseUid) {
      testServerConnection()
    }
  }, [firebaseUid])

  useEffect(() => {
    if (firebaseUid) {
      // Check if stream settings exist
      const savedSettings = localStorage.getItem("streamSettings")
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings)
          setStreamSettings(settings)
          setRoomDescription(settings.title) // Use title as room description
          setTitle(settings.title)
          setDescription(settings.description)
          setEnableChat(settings.enableChat)
          log(`Stream settings loaded: ${settings.title}`)
        } catch (error) {
          log("Error parsing stream settings, showing modal")
          setShowSettingsModal(true)
        }
      } else {
        log("No stream settings found, showing modal")
        setShowSettingsModal(true)
      }
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
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ path: path, payload: payload, method: method }),
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

  const sendToHandler = async (path: string, payload: any, method = "POST") => {
    log(`Sending to Handler (${method}): ${path} with payload: ${JSON.stringify(payload)}`)
    try {
      const response = await fetch(FLASK_SERVER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ path: path, payload: payload, method: method }),
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

  const testServerConnection = async () => {
    log("Testing server connection...")
    try {
      // Test Flask proxy connection
      log(`Testing connection to: ${FLASK_PROXY_URL}`)
      const proxyResponse = await fetch(FLASK_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ test: true }),
      })
      log(`Proxy server response status: ${proxyResponse.status}`)
      log(`Proxy server content-type: ${proxyResponse.headers.get("content-type")}`)

      // Test Flask handler connection
      log(`Testing connection to: ${FLASK_SERVER_URL}`)
      const handlerResponse = await fetch(FLASK_SERVER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ test: true }),
      })
      log(`Handler server response status: ${handlerResponse.status}`)
      log(`Handler server content-type: ${handlerResponse.headers.get("content-type")}`)
    } catch (error: any) {
      log(`Server connection test failed: ${error.message}`)
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
              sendToHandler("create_stream", {
                room_id: currentRoomId,
                room_description: roomDescription,
                session_id: janusSessionIdRef.current,
                UID: firebaseUid,
              })
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

  const startStreaming = async () => {
    if (!title.trim()) {
      alert("Please enter a stream title")
      return
    }

    if (!roomDescription) {
      alert("Please enter a Room Description.")
      return
    }
    log(`Streamer: Starting stream for room: "${roomDescription}"`)

    // Set loading state to true
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
      const newRoomId = await createRoom(roomDescription)

      // Verify the room ID was set correctly
      log(`Room creation returned: ${newRoomId}`)
      log(`createdRoomId state is now: ${createdRoomId}`)

      await joinRoomAsPublisher(newRoomId)
    } catch (error: any) {
      log(`Streamer: Error starting stream: ${error.message}`)
      alert(`Error starting stream: ${error.message}`)
      stopStreamingCleanup()
      // Set loading state to false on error
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
      log(`Stream URL copied: ${streamUrl}`)
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

  const handleUpdateSettings = async () => {
    if (!title.trim()) {
      alert("Please enter a stream title")
      return
    }

    setIsUpdating(true)

    try {
      const updatedSettings = {
        title: title.trim(),
        description: description.trim(),
        tags: streamSettings?.tags || [],
        enableChat,
      }

      localStorage.setItem("streamSettings", JSON.stringify(updatedSettings))
      setStreamSettings(updatedSettings)
      setRoomDescription(updatedSettings.title) // Update room description
      setHasUnsavedChanges(false)

      log(`Stream settings updated: ${updatedSettings.title}`)

      // Show success feedback
      setTimeout(() => {
        setIsUpdating(false)
      }, 500)
    } catch (error) {
      console.error("Error updating settings:", error)
      setIsUpdating(false)
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
                        onClick={startStreaming}
                        disabled={!firebaseUid || !streamSettings || isLoading}
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
                      {/*<Badge variant="destructive" className="text-xs">
                        <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></div>
                        LIVE
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-black/70 text-white">
                        <Users className="w-3 h-3 mr-1" />
                        {formatNumber(viewers)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-black/70 text-white">
                        <Clock className="w-3 h-3 mr-1" />
                        {streamDuration}
                      </Badge>*/}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card className="">
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      // Enable update button when title changes from saved settings
                      if (streamSettings && e.target.value !== streamSettings.title) {
                        setHasUnsavedChanges(true)
                      } else if (
                        streamSettings &&
                        e.target.value === streamSettings.title &&
                        description === streamSettings.description
                      ) {
                        setHasUnsavedChanges(false)
                      }
                    }}
                    placeholder="Enter stream title"
                    disabled={isStreaming}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      // Enable update button when description changes from saved settings
                      if (streamSettings && e.target.value !== streamSettings.description) {
                        setHasUnsavedChanges(true)
                      } else if (
                        streamSettings &&
                        e.target.value === streamSettings.description &&
                        title === streamSettings.title
                      ) {
                        setHasUnsavedChanges(false)
                      }
                    }}
                    placeholder="Describe your stream"
                    disabled={isStreaming}
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="chat" checked={enableChat} onCheckedChange={setEnableChat} disabled={isStreaming} />
                  <Label htmlFor="chat">Enable Chat</Label>
                </div>
                <div className="flex gap-2">
                  {/* Update Button - only show when not streaming */}
                  {!isStreaming && (
                    <Button
                      onClick={handleUpdateSettings}
                      disabled={!hasUnsavedChanges || isUpdating}
                      variant="outline"
                      className="hover:bg-orange-50 dark:hover:bg-orange-950"
                    >
                      {isUpdating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        "Update"
                      )}
                    </Button>
                  )}

                  {isStreaming ? (
                    <>
                      <Button onClick={stopStreamingCleanup} variant="destructive">
                        <Square className="h-4 w-4 mr-2" />
                        Stop Stream
                      </Button>
                      <Button onClick={shareStream} variant="outline">
                        <Share className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            {/* Video Title and Description (YouTube-style) */}
            {/*<Card className="border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-2">{streamSettings?.title || "My Awesome Stream"}</h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date().toLocaleDateString()}
                      </span>
                      {isStreaming && (
                        <>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {formatNumber(viewers)} watching
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            {formatNumber(likes)} likes
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isStreaming ? (
                      <>
                        <Button onClick={stopStreamingCleanup} variant="destructive">
                          <Square className="h-4 w-4 mr-2" />
                          Stop Streaming
                        </Button>
                        {createdRoomId && (
                          <Button
                            onClick={handleCopyStreamUrl}
                            variant="outline"
                            className="hover:bg-orange-50 dark:hover:bg-orange-950"
                          >
                            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                            {copied ? "Copied!" : "Copy Stream URL"}
                          </Button>
                        )}
                      </>
                    ) : null}

                    <Button
                      variant={hasLiked ? "default" : "outline"}
                      onClick={handleLike}
                      disabled={!isStreaming || hasLiked}
                      className={
                        hasLiked
                          ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                          : "hover:bg-orange-50 dark:hover:bg-orange-950"
                      }
                    >
                      <ThumbsUp className={`w-4 h-4 mr-1 ${hasLiked ? "fill-current" : ""}`} />
                      Like
                    </Button>

                    <Button
                      variant="outline"
                      className="hover:bg-orange-50 dark:hover:bg-orange-950"
                      onClick={() => setShowShareModal(true)}
                      disabled={!isStreaming || !createdRoomId}
                    >
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>

                
                <div className="flex items-start gap-4 mt-4 pb-4 border-b border-orange-200 dark:border-orange-800">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="/placeholder.svg" alt="Channel" />
                    <AvatarFallback>CH</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="font-medium">Your Channel</h3>
                    <p className="text-sm text-muted-foreground">2.4K subscribers</p>
                  </div>
                </div>

                
                <div className="mt-4">
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <span className="font-medium">Description</span>
                    {showDescription ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showDescription && (
                    <div className="mt-2 text-sm">
                      <p>{streamSettings?.description || "No description available."}</p>

                      {streamSettings?.tags && streamSettings.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {streamSettings.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-500" />
                  Performance Metrics
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
            </Card>*/}
            {/* Update the channel info section to only show username */}
            <div className="flex items-start gap-4 mt-4 pb-4 border-b border-orange-200 dark:border-orange-800">
              <Avatar className="h-12 w-12">
                <AvatarImage src="/placeholder.svg" alt="Channel" />
                <AvatarFallback>@</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h3 className="font-medium">@{getUserDisplayName()}</h3>
                <p className="text-sm text-muted-foreground">2.4K subscribers</p>
              </div>
            </div>
          </div>

          {/* Chat Section */}
          <div>
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>Chat ({viewers} viewers)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-70px)]">
                {enableChat ? <LiveChat /> : <div className="p-4 text-center text-muted-foreground">Chat disabled</div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <StreamSettingsModal open={showSettingsModal} onOpenChange={setShowSettingsModal} />
      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        streamUrl={getStreamUrl()}
        streamTitle={streamSettings?.title || "My Awesome Stream"}
      />
    </div>
  )
}

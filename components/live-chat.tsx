"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Heart, Gift, Smile } from "lucide-react"

interface ChatMessage {
  id: string
  username: string
  message: string
  timestamp: Date
  type: "message" | "follow" | "donation"
  amount?: number
  avatar?: string
}

interface LiveChatProps {
  roomId: string | null
  currentUserDisplayName: string
  enableChat: boolean
}

export function LiveChat({ roomId, currentUserDisplayName, enableChat }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const CHAT_WEBSOCKET_URL = "wss://superfan.alterwork.in/chat"

  useEffect(() => {
    if (!roomId || !enableChat) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setMessages([]) // Clear messages if chat is disabled or room is not set
      return
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close()
    }

    const ws = new WebSocket(CHAT_WEBSOCKET_URL)
    wsRef.current = ws

    ws.onopen = () => {
      console.log("WebSocket connected for room:", roomId)
      // Send raw room ID as the first initialization message
      ws.send(roomId)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.user && data.message) {
          const receivedMessage: ChatMessage = {
            id: Date.now().toString() + Math.random(), // Unique ID
            username: data.user,
            message: data.message,
            timestamp: new Date(),
            type: "message", // Assuming all incoming are messages for now
            avatar: `/placeholder.svg?height=32&width=32&query=avatar-${data.user.charAt(0)}`,
          }
          setMessages((prev) => [...prev, receivedMessage])
        } else {
          console.warn("Received unexpected message format:", data)
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error, event.data)
      }
    }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
    }

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason)
      if (!event.wasClean) {
        console.warn("WebSocket connection unexpectedly closed. Attempting to reconnect...")
        // Simple reconnect logic, could be more robust with backoff
        setTimeout(() => {
          if (roomId && enableChat) {
            // Only try to reconnect if still in a room and chat is enabled
            // This prevents infinite reconnects if the room is gone or chat is intentionally off
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
              // Only reconnect if no other connection is pending/open
              console.log("Attempting WebSocket reconnect...")
              const newWs = new WebSocket(CHAT_WEBSOCKET_URL)
              wsRef.current = newWs
            }
          }
        }, 3000) // Try to reconnect after 3 seconds
      }
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [roomId, enableChat]) // Reconnect if roomId or enableChat changes

  // Auto scroll to bottom for new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    const messageToSend = {
      user: currentUserDisplayName,
      message: newMessage.trim(),
    }

    try {
      wsRef.current.send(JSON.stringify(messageToSend))
      // Optimistically add message to UI
      const sentMessage: ChatMessage = {
        id: Date.now().toString(),
        username: currentUserDisplayName,
        message: newMessage.trim(),
        timestamp: new Date(),
        type: "message",
        avatar: `/placeholder.svg?height=32&width=32&query=avatar-${currentUserDisplayName.charAt(0)}`,
      }
      setMessages((prev) => [...prev, sentMessage])
      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message via WebSocket:", error)
      // Optionally, show an error to the user
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Chat Messages */}
      <ScrollArea className="flex-1 border-b" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              {enableChat ? "No messages yet. Be the first to say hi!" : "Chat is disabled for this stream."}
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={msg.avatar || "/placeholder.svg"} alt={msg.username} />
                <AvatarFallback>{msg.username.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium text-sm ${msg.username === currentUserDisplayName ? "text-orange-600 dark:text-orange-400" : ""}`}
                  >
                    @{msg.username}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>

                  {msg.type === "follow" && (
                    <Badge
                      variant="outline"
                      className="text-xs border-green-300 text-green-600 dark:border-green-700 dark:text-green-400"
                    >
                      <Heart className="h-3 w-3 mr-1" />
                      New follower
                    </Badge>
                  )}

                  {msg.type === "donation" && (
                    <Badge
                      variant="outline"
                      className="text-xs border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
                    >
                      <Gift className="h-3 w-3 mr-1" />${msg.amount}
                    </Badge>
                  )}
                </div>

                <p className="text-sm break-words">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="p-3 bg-background">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage
              src={`/placeholder.svg?height=32&width=32&query=avatar-${currentUserDisplayName.charAt(0)}`}
              alt={currentUserDisplayName}
            />
            <AvatarFallback>{currentUserDisplayName.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 flex gap-2 items-center">
            <div className="relative flex-1">
              <Input
                placeholder={`Chat as @${currentUserDisplayName}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="pr-10 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-500"
                disabled={!enableChat || !roomId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                disabled={!enableChat || !roomId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>

            <Button
              type="submit"
              size="sm"
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
              disabled={
                !enableChat ||
                !roomId ||
                !newMessage.trim() ||
                !wsRef.current ||
                wsRef.current.readyState !== WebSocket.OPEN
              }
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

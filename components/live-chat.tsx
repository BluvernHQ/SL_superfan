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

export function LiveChat() {
  // Update the mock messages to only use usernames
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      username: "GamerFan123",
      message: "Amazing gameplay! 🔥",
      timestamp: new Date(Date.now() - 60000),
      type: "message",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    {
      id: "2",
      username: "StreamLover",
      message: "Just followed! Keep it up!",
      timestamp: new Date(Date.now() - 45000),
      type: "follow",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    {
      id: "3",
      username: "ProPlayer99",
      message: "That was an epic move!",
      timestamp: new Date(Date.now() - 30000),
      type: "message",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    {
      id: "4",
      username: "SupporterX",
      message: "Thanks for the great content!",
      timestamp: new Date(Date.now() - 15000),
      type: "donation",
      amount: 5,
      avatar: "/placeholder.svg?height=32&width=32",
    },
  ])

  const [newMessage, setNewMessage] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Simulate new messages
  useEffect(() => {
    const interval = setInterval(() => {
      const randomMessages = [
        "Great stream!",
        "Love this game!",
        "You got this!",
        "Amazing skills!",
        "Keep going!",
        "This is so cool!",
        "Best streamer ever!",
        "Can you play my favorite song?",
        "How long have you been playing?",
        "Your setup is awesome!",
      ]

      // Update the random usernames array
      const randomUsernames = [
        "ChatUser" + Math.floor(Math.random() * 1000),
        "Viewer" + Math.floor(Math.random() * 1000),
        "Fan" + Math.floor(Math.random() * 1000),
        "Player" + Math.floor(Math.random() * 1000),
      ]

      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        username: randomUsernames[Math.floor(Math.random() * randomUsernames.length)],
        message: randomMessages[Math.floor(Math.random() * randomMessages.length)],
        timestamp: new Date(),
        type: Math.random() > 0.9 ? "follow" : "message",
        avatar: `/placeholder.svg?height=32&width=32&query=avatar${Math.floor(Math.random() * 10)}`,
      }

      setMessages((prev) => [...prev.slice(-50), newMsg])
    }, 3000)

    return () => clearInterval(interval)
  }, [])

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
    if (!newMessage.trim()) return

    const message: ChatMessage = {
      id: Date.now().toString(),
      username: "You",
      message: newMessage,
      timestamp: new Date(),
      type: "message",
      avatar: "/placeholder.svg?height=32&width=32",
    }

    setMessages((prev) => [...prev, message])
    setNewMessage("")
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Chat Messages */}
      <ScrollArea className="flex-1 border-b" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={msg.avatar || "/placeholder.svg"} alt={msg.username} />
                <AvatarFallback>{msg.username.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {/* Update the message rendering to show @username */}
                  <span
                    className={`font-medium text-sm ${msg.username === "You" ? "text-orange-600 dark:text-orange-400" : ""}`}
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
            <AvatarImage src="/placeholder.svg?height=32&width=32" alt="You" />
            <AvatarFallback>Y</AvatarFallback>
          </Avatar>

          <div className="flex-1 flex gap-2 items-center">
            <div className="relative flex-1">
              {/* Update the chat input placeholder */}
              <Input
                placeholder="Chat as @You..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="pr-10 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-500"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>

            <Button
              type="submit"
              size="sm"
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

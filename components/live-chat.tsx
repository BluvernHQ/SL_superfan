"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Heart, Gift } from "lucide-react"

interface ChatMessage {
  id: string
  username: string
  message: string
  timestamp: Date
  type: "message" | "follow" | "donation"
  amount?: number
}

export function LiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      username: "GamerFan123",
      message: "Amazing gameplay! 🔥",
      timestamp: new Date(Date.now() - 60000),
      type: "message",
    },
    {
      id: "2",
      username: "StreamLover",
      message: "Just followed! Keep it up!",
      timestamp: new Date(Date.now() - 45000),
      type: "follow",
    },
    {
      id: "3",
      username: "ProPlayer99",
      message: "That was an epic move!",
      timestamp: new Date(Date.now() - 30000),
      type: "message",
    },
    {
      id: "4",
      username: "SupporterX",
      message: "Thanks for the great content!",
      timestamp: new Date(Date.now() - 15000),
      type: "donation",
      amount: 5,
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
      }

      setMessages((prev) => [...prev.slice(-50), newMsg])
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Auto scroll to top for new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollElement) {
        scrollElement.scrollTop = 0
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
    }

    setMessages((prev) => [...prev, message])
    setNewMessage("")
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-card">
      <div className="border-b border-orange-200 dark:border-orange-800 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-500"
          />
          <Button
            type="submit"
            size="sm"
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
      <ScrollArea className="flex-1 p-4 overflow-hidden" ref={scrollAreaRef}>
        <div className="space-y-3">
          {messages
            .slice()
            .reverse()
            .map((msg) => (
              <div key={msg.id} className="flex flex-col space-y-1">
                {msg.type === "follow" && (
                  <div className="flex items-center space-x-2 text-sm bg-green-50 dark:bg-green-950/50 p-2 rounded border border-green-200 dark:border-green-800">
                    <Heart className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      {msg.username} just followed!
                    </span>
                  </div>
                )}

                {msg.type === "donation" && (
                  <div className="flex items-center space-x-2 text-sm bg-orange-50 dark:bg-orange-950/50 p-2 rounded border border-orange-200 dark:border-orange-800">
                    <Gift className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-700 dark:text-orange-400">
                      {msg.username} donated ${msg.amount}!
                    </span>
                  </div>
                )}

                {msg.type === "message" && (
                  <div className="flex items-start space-x-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm text-orange-600 dark:text-orange-400">{msg.username}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
                        {msg.username === "You" && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                          >
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm break-words overflow-hidden text-foreground">{msg.message}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  )
}

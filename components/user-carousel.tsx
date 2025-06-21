"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"

interface User {
  id: string
  username: string
  display_name?: string
  isLive: boolean
  totalSessions: number // Still in interface, but not displayed
  followers: number
  isFollowing: boolean
}

interface UserCarouselProps {
  title: string
  users: User[]
  emptyMessage?: string
  isLoading?: boolean
  currentLoggedInUser?: string | null
}

export function UserCarousel({
  title,
  users,
  emptyMessage = "No users found.",
  isLoading = false,
  currentLoggedInUser,
}: UserCarouselProps) {
  const router = useRouter()

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      {isLoading ? (
        <div className="flex space-x-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="min-w-[140px] max-w-[140px] animate-pulse">
              <CardContent className="p-2 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-muted mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4 mb-1"></div>
                <div className="h-2.5 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-7 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : users.length > 0 ? (
        <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
          <div className="flex w-max space-x-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="relative min-w-[140px] max-w-[140px]"
                style={
                  {
                    "--hover-bg": "rgb(249 115 22)", // orange-500
                  } as React.CSSProperties
                }
              >
                <div
                  className="absolute inset-0 rounded-md opacity-0 transition-opacity duration-75 z-0"
                  style={{
                    backgroundColor: "var(--hover-bg)",
                    transform: "translate(2px, 2px)",
                  }}
                ></div>
                <Card
                  className="relative z-10 cursor-pointer transition-all duration-75 hover:shadow-lg w-full h-full hover:-translate-x-[2px] hover:-translate-y-[2px]"
                  onClick={() => router.push(`/profile/${user.username}`)}
                  onMouseEnter={(e) => {
                    const bg = e.currentTarget.parentElement?.querySelector("div:first-child") as HTMLElement
                    if (bg) bg.style.opacity = "1"
                  }}
                  onMouseLeave={(e) => {
                    const bg = e.currentTarget.parentElement?.querySelector("div:first-child") as HTMLElement
                    if (bg) bg.style.opacity = "0"
                  }}
                >
                  <CardContent className="p-2 flex flex-col items-center text-center">
                    <div className="relative mb-1.5">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={`https://superfan.alterwork.in/files/profilepic/${user.username}.png`}
                          alt={user.display_name || user.username}
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=40&width=40"
                          }}
                        />
                        <AvatarFallback>{(user.display_name || user.username).charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {user.isLive && (
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-1 border-white"></div>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-1">@{user.username}</h3>
                    {user.display_name && user.display_name !== user.username && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{user.display_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mb-2">{formatNumber(user.followers)} Followers</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <p className="text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  )
}

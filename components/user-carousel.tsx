"use client"

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
          {" "}
          {/* Adjusted space-x */}
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="min-w-[140px] max-w-[140px] animate-pulse">
              {" "}
              {/* Adjusted min/max-width */}
              <CardContent className="p-2 flex flex-col items-center">
                {" "}
                {/* Reduced padding */}
                <div className="w-10 h-10 rounded-full bg-muted mb-2"></div> {/* Reduced avatar placeholder size */}
                <div className="h-3 bg-muted rounded w-3/4 mb-1"></div> {/* Reduced text placeholder size */}
                <div className="h-2.5 bg-muted rounded w-1/2 mb-2"></div> {/* Reduced text placeholder size */}
                <div className="h-7 bg-muted rounded w-full"></div> {/* Reduced button placeholder size */}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : users.length > 0 ? (
        <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
          <div className="flex w-max space-x-3">
            {" "}
            {/* Adjusted space-x */}
            {users.map((user) => (
              <Card
                key={user.id}
                className="min-w-[140px] max-w-[140px] cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/profile/${user.username}`)}
              >
                <CardContent className="p-2 flex flex-col items-center text-center">
                  <div className="relative mb-1.5">
                    {" "}
                    {/* Adjusted mb */}
                    <Avatar className="h-10 w-10">
                      {" "}
                      {/* Reduced avatar size */}
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
                  <p className="text-xs text-muted-foreground mb-2">{formatNumber(user.followers)} Followers</p>{" "}
                  {/* Adjusted mb */}
                </CardContent>
              </Card>
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

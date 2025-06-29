"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { buildApiUrl, API_CONFIG } from "@/lib/config"
import { auth } from "@/lib/firebase"
import { getIdToken } from "firebase/auth"
import { User, UserCheck } from "lucide-react"

interface User {
  id: string
  username: string
  display_name?: string
  isLive: boolean
  totalSessions: number
  followers: number
  isFollowing: boolean
}

interface UserCarouselProps {
  title?: string
  users: User[]
  emptyMessage?: string
  isLoading?: boolean
  currentLoggedInUser?: string | null
}

export function UserCarousel({
  title,
  users,
  emptyMessage = "No new users to discover.",
  isLoading = false,
  currentLoggedInUser,
}: UserCarouselProps) {
  const router = useRouter()
  const [followingStates, setFollowingStates] = useState<{ [key: string]: boolean }>({})
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({})

  // Initialize following states from props
  useEffect(() => {
    const initialStates: { [key: string]: boolean } = {}
    users.forEach(user => {
      initialStates[user.username] = user.isFollowing
    })
    setFollowingStates(initialStates)
  }, [users])

  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (auth.currentUser) {
      try {
        const authToken = await getIdToken(auth.currentUser)
        headers["Authorization"] = `Bearer ${authToken}`
      } catch (tokenError) {
        console.log("Error getting Firebase token:", tokenError)
      }
    }

    return headers
  }

  const handleFollowToggle = async (targetUsername: string, currentIsFollowing: boolean) => {
    if (!auth.currentUser) {
      router.push("/login")
      return
    }

    setLoadingStates(prev => ({ ...prev, [targetUsername]: true }))

    const endpoint = currentIsFollowing ? "/api/unfollow_user" : "/api/follow_user"
    const headers = await getAuthHeaders()

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ target_username: targetUsername }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.error) {
          console.error(`API error: ${data.error}`, data.details)
          // Don't update state if there's an API error
          return
        }
        
        setFollowingStates(prev => ({ ...prev, [targetUsername]: !currentIsFollowing }))
        console.log(`Successfully ${currentIsFollowing ? 'unfollowed' : 'followed'} ${targetUsername}`)
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error(`Failed to ${currentIsFollowing ? 'unfollow' : 'follow'}:`, response.status, errorData)
        // Show user-friendly error message
        alert(`Failed to ${currentIsFollowing ? 'unfollow' : 'follow'} user. Please try again.`)
      }
    } catch (error) {
      console.error(`Error during ${currentIsFollowing ? 'unfollow' : 'follow'}:`, error)
      // Show user-friendly error message
      alert(`Network error. Please check your connection and try again.`)
    } finally {
      setLoadingStates(prev => ({ ...prev, [targetUsername]: false }))
    }
  }

  return (
    <div className="mb-8">
      {title && <h2 className="mobile-responsive-heading mb-4">{title}</h2>}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="animate-pulse mobile-card">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted"></div>
                  <div className="space-y-2 w-full">
                    <div className="h-3 bg-muted rounded w-3/4 mx-auto"></div>
                    <div className="h-8 bg-muted rounded w-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : users.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {users.map((user) => {
            const isFollowing = followingStates[user.username] !== undefined 
              ? followingStates[user.username] 
              : user.isFollowing
            const isLoading = loadingStates[user.username] || false

            return (
              <div
                key={user.id}
                className="relative"
                style={
                  {
                    "--hover-bg": "rgb(249 115 22)", // orange-500
                  } as React.CSSProperties
                }
              >
                <div
                  className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-75 z-0"
                  style={{
                    backgroundColor: "var(--hover-bg)",
                    transform: "translate(2px, 2px)",
                  }}
                ></div>
                <Card
                  className="relative z-10 transition-all duration-75 hover:shadow-lg w-full h-full hover:-translate-x-[2px] hover:-translate-y-[2px] mobile-card"
                  onMouseEnter={(e) => {
                    const bg = e.currentTarget.parentElement?.querySelector("div:first-child") as HTMLElement
                    if (bg) bg.style.opacity = "1"
                  }}
                  onMouseLeave={(e) => {
                    const bg = e.currentTarget.parentElement?.querySelector("div:first-child") as HTMLElement
                    if (bg) bg.style.opacity = "0"
                  }}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col items-center text-center space-y-3">
                      {/* Profile Picture with Live Indicator */}
                      <div className="relative">
                        <Avatar 
                          className="h-12 w-12 sm:h-16 sm:w-16 cursor-pointer"
                          onClick={() => router.push(`/profile/${user.username}`)}
                        >
                          <AvatarImage
                            src={`https://superfan.alterwork.in/files/profilepic/${user.username}.png`}
                            alt={user.display_name || user.username}
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=64&width=64"
                            }}
                          />
                          <AvatarFallback className="text-lg">
                            {(user.display_name || user.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.isLive && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full border-2 border-background animate-pulse"></div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="space-y-1 w-full">
                        <h3 
                          className="font-semibold text-sm sm:text-base line-clamp-1 cursor-pointer hover:text-orange-600 transition-colors"
                          onClick={() => router.push(`/profile/${user.username}`)}
                        >
                          @{user.username}
                        </h3>
                        {user.display_name && user.display_name !== user.username && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                            {user.display_name}
                          </p>
                        )}
                      </div>

                      {/* Follow Button */}
                      {auth.currentUser && currentLoggedInUser !== user.username && (
                        <Button
                          variant={isFollowing ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleFollowToggle(user.username, isFollowing)}
                          disabled={isLoading}
                          className={`w-full mobile-button ${
                            isFollowing 
                              ? "border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950" 
                              : "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                          }`}
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isFollowing ? (
                            <>
                              <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              <span className="text-xs sm:text-sm">Following</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              <span className="text-xs sm:text-sm">Follow</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">👥</div>
          <p className="text-muted-foreground mobile-responsive-text">{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}

"use client"

import type * as React from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { X, Users, TrendingUp, Clock, Home, Plus, UserPlus, ArrowRightFromLine, ArrowLeftFromLine } from "lucide-react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, getIdToken } from "firebase/auth"
import { useState, useEffect } from "react"

interface UserData {
  id: string
  username: string
  display_name: string
  isLive: boolean
  totalSessions: number
  followers: number
  isFollowing: boolean
}

interface AppSidebarProps {
  users: UserData[]
  isLoading: boolean
  isOpen: boolean
  onClose: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function AppSidebar({ users, isLoading, isOpen, onClose, isCollapsed, onToggleCollapse }: AppSidebarProps) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({})
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe()
  }, [])

  // Initialize following states when users change
  useEffect(() => {
    const states: Record<string, boolean> = {}
    users.forEach(user => {
      states[user.username] = user.isFollowing
    })
    setFollowingStates(states)
  }, [users])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    if (currentUser) {
      try {
        const authToken = await getIdToken(currentUser)
        headers["Authorization"] = `Bearer ${authToken}`
      } catch (tokenError) {
        console.log(`Error getting Firebase token: ${tokenError}`)
      }
    }

    return headers
  }

  const handleFollow = async (username: string) => {
    if (!currentUser) {
      router.push("/login")
      return
    }

    setFollowLoading(prev => ({ ...prev, [username]: true }))
    
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/create_follower", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            follow: username,
          },
        }),
      })

      if (response.ok) {
        setFollowingStates(prev => ({ ...prev, [username]: true }))
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        console.error(`Failed to follow: ${response.status} - ${errorData.message || errorData.reason}`)
      }
    } catch (error: any) {
      console.error(`Error following user: ${error.message}`)
    } finally {
      setFollowLoading(prev => ({ ...prev, [username]: false }))
    }
  }

  const handleUnfollow = async (username: string) => {
    if (!currentUser) return

    setFollowLoading(prev => ({ ...prev, [username]: true }))
    
    try {
      const headers = await getAuthHeaders()
      const response = await fetch("https://superfan.alterwork.in/api/un_follow", {
        method: "POST",
        headers,
        body: JSON.stringify({
          payload: {
            unfollow: username,
          },
        }),
      })

      if (response.ok) {
        setFollowingStates(prev => ({ ...prev, [username]: false }))
      } else {
        const errorData = await response.json().catch(() => ({ reason: "Unknown error" }))
        console.error(`Failed to unfollow: ${response.status} - ${errorData.message || errorData.reason}`)
      }
    } catch (error: any) {
      console.error(`Error unfollowing user: ${error.message}`)
    } finally {
      setFollowLoading(prev => ({ ...prev, [username]: false }))
    }
  }

  const handleUserClick = (username: string) => {
    // Navigate to profile without closing sidebar
    router.push(`/profile/${username}`)
    // Don't call onClose() here - let the sidebar stay open
  }

  // Filter out current user and already followed users
  const recommendedUsers = users.filter(user => {
    if (!currentUser) return true
    if (user.username === currentUser.displayName) return false
    return !followingStates[user.username]
  }).slice(0, 10) // Limit to 10 users

  // Determine if sidebar should be collapsed based on screen size
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // On mobile, always show collapsed state (only profile circles)
  // On desktop, respect the collapsed prop
  const shouldShowCollapsed = !isDesktop || isCollapsed

  return (
    <TooltipProvider>
      {/* Twitch-style Sidebar */}
      <aside className={`fixed left-0 flex flex-col h-full bg-background border-r border-[#2D2E35] z-50 transform transition-all duration-500 ease-in-out ${
        shouldShowCollapsed ? 'w-[70px]' : 'w-[240px]'
      } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Header with "For you" and collapse icon */}
        <div className="p-3 pl-6 mb-2 flex items-center w-full">
          <div className={`transition-all duration-300 ease-in-out ${shouldShowCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
            <p className="font-semibold text-primary whitespace-nowrap">For you</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-auto p-2 ml-auto lg:block hidden"
            onClick={onToggleCollapse}
            data-state={isCollapsed ? "closed" : "open"}
          >
            {isCollapsed ? (
              <ArrowRightFromLine className="h-4 w-4" />
            ) : (
              <ArrowLeftFromLine className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Recommended subtitle */}
        <div className="space-y-4 pt-4 lg:pt-0">
          <div>
            <div className={`transition-all duration-300 ease-in-out ${shouldShowCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'} pl-6 mb-4`}>
              <p className="text-sm text-muted-foreground">Recommended</p>
            </div>
            <ul className="space-y-2 px-2">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className={`flex items-center ${shouldShowCollapsed ? 'justify-center' : 'space-x-3'} h-12`}>
                    <Skeleton className="h-8 w-8 rounded-full" />
                    {!shouldShowCollapsed && (
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    )}
                  </div>
                ))
              ) : recommendedUsers.length > 0 ? (
                recommendedUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center ${shouldShowCollapsed ? 'justify-center' : 'space-x-3'} p-2 rounded-lg hover:bg-accent transition-colors group h-12`}
                  >
                    {/* Avatar with Live Indicator and Tooltip */}
                    <div className="relative">
                      {shouldShowCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span 
                              className="relative flex shrink-0 overflow-hidden rounded-full h-8 w-8 cursor-pointer"
                              onClick={() => handleUserClick(user.username)}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={`https://superfan.alterwork.in/files/profilepic/${user.username}.png`}
                                  alt={user.display_name || user.username}
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                                  }}
                                />
                                <AvatarFallback className="text-xs">
                                  {(user.display_name || user.username).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {user.isLive && (
                                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-1 border-white animate-pulse"></div>
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[200px]">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-sm">@{user.username}</p>
                                {user.isLive && (
                                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                    <div className="w-1 h-1 bg-white rounded-full mr-1"></div>
                                    LIVE
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span 
                          className="relative flex shrink-0 overflow-hidden rounded-full h-8 w-8 cursor-pointer"
                          onClick={() => handleUserClick(user.username)}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={`https://superfan.alterwork.in/files/profilepic/${user.username}.png`}
                              alt={user.display_name || user.username}
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                              }}
                            />
                            <AvatarFallback className="text-xs">
                              {(user.display_name || user.username).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {user.isLive && (
                            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-1 border-white animate-pulse"></div>
                          )}
                        </span>
                      )}
                    </div>

                    {/* User Info and Follow Button - Only show when expanded on desktop */}
                    {!shouldShowCollapsed && (
                      <>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleUserClick(user.username)}>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm truncate">@{user.username}</p>
                            {user.isLive && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                <div className="w-1 h-1 bg-white rounded-full mr-1"></div>
                                LIVE
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Follow Button */}
                        <Button
                          variant={followingStates[user.username] ? "secondary" : "default"}
                          size="sm"
                          onClick={() => {
                            if (followingStates[user.username]) {
                              handleUnfollow(user.username)
                            } else {
                              handleFollow(user.username)
                            }
                          }}
                          disabled={followLoading[user.username]}
                          className={`${
                            !followingStates[user.username] 
                              ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600" 
                              : ""
                          } h-8 w-8 p-0`}
                        >
                          {followLoading[user.username] ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : followingStates[user.username] ? (
                            <UserPlus className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No users</p>
                </div>
              )}
            </ul>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}

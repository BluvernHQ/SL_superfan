"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Search, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { auth } from "@/lib/firebase" // Import Firebase auth

interface UserData {
  id: string
  username: string
  display_name: string
  isLive: boolean
  totalSessions: number
  followers: number
  isFollowing: boolean
}

interface UserSearchProps {
  // These props are optional, allowing the component to fetch data if not provided
  users?: UserData[]
  isLoading?: boolean
}

export function UserSearch({ users: propUsers, isLoading: propIsLoading }: UserSearchProps) {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)

  // Internal state for users and loading, used if props are not provided
  const [internalUsers, setInternalUsers] = useState<UserData[]>([])
  const [internalIsLoading, setInternalIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Determine which user list and loading state to use
  const currentUsers = propUsers || internalUsers
  const currentIsLoading = propIsLoading || internalIsLoading

  // Authenticated user for fetching token
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe()
  }, [])

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (currentUser) {
      try {
        const token = await currentUser.getIdToken()
        headers["Authorization"] = `Bearer ${token}`
      } catch (tokenError) {
        console.error("Error getting auth token:", tokenError)
      }
    }
    return headers
  }, [currentUser])

  // Fetch users internally if not provided via props
  useEffect(() => {
    if (propUsers === undefined) {
      const fetchUsers = async () => {
        setInternalIsLoading(true)
        try {
          const headers = await getAuthHeaders()
          const response = await fetch("https://superfan.alterwork.in/api/fetch_users", {
            method: "GET",
            headers,
          })

          if (response.ok) {
            const data = await response.json()
            let usersArray = []

            if (Array.isArray(data)) {
              usersArray = data
            } else if (data.users && Array.isArray(data.users)) {
              usersArray = data.users
            } else if (data.data && Array.isArray(data.data)) {
              usersArray = data.data
            } else {
              console.error("Unexpected API response structure:", data)
              setInternalUsers([])
              return
            }

            // Filter out the current user
            const filteredUsers = usersArray.filter((userData: any) => {
              if (!currentUser) return true
              const currentUserDisplayName = currentUser.displayName
              const currentUserUID = currentUser.uid
              return userData.username !== currentUserDisplayName && userData.id !== currentUserUID
            })

            const transformedUsers = filteredUsers.map((userData: any) => ({
              id: userData.UID || userData.username,
              username: userData.display_name || userData.username,
              display_name: userData.display_name,
              isLive: userData.status !== "notlive",
              totalSessions: userData.sessions || 0,
              followers: userData.followers || 0,
              isFollowing: false,
            }))
            setInternalUsers(transformedUsers)
          } else {
            console.error("Failed to fetch users:", response.status, response.statusText)
            setInternalUsers([])
          }
        } catch (error) {
          console.error("Error fetching users:", error)
          setInternalUsers([])
        } finally {
          setInternalIsLoading(false)
        }
      }
      fetchUsers()
    }
  }, [propUsers, getAuthHeaders, currentUser]) // Re-fetch if propUsers becomes defined or auth changes

  const filteredUsers = React.useMemo(() => {
    if (!query) {
      return []
    }
    const lowerCaseQuery = query.toLowerCase()
    return currentUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(lowerCaseQuery) ||
        user.display_name.toLowerCase().includes(lowerCaseQuery),
    )
  }, [currentUsers, query])

  const handleUserClick = (username: string) => {
    setQuery("") // Clear search query on click
    setIsFocused(false) // Close results
    router.push(`/profile/${username}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setQuery("") // Clear query
      setIsFocused(false) // Close results
    } else if (e.key === "ArrowDown" && filteredUsers.length > 0) {
      e.preventDefault()
      const firstResult = searchRef.current?.querySelector('[data-result="0"]') as HTMLElement
      firstResult?.focus()
    }
  }

  const handleResultKeyDown = (e: React.KeyboardEvent, index: number, username: string) => {
    if (e.key === "Enter") {
      handleUserClick(username)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      const nextResult = searchRef.current?.querySelector(`[data-result="${index + 1}"]`) as HTMLElement
      nextResult?.focus()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (index === 0) {
        const input = searchRef.current?.querySelector("input") as HTMLElement
        input?.focus()
      } else {
        const prevResult = searchRef.current?.querySelector(`[data-result="${index - 1}"]`) as HTMLElement
        prevResult?.focus()
      }
    }
  }

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [searchRef])

  return (
    <div ref={searchRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        id="search"
        placeholder="Search users..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        className="pl-10 pr-4 h-9 bg-background/50 border-border/50 focus:bg-background focus:border-border"
      />

      {isFocused && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {currentIsLoading ? (
            <div className="p-2 space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="p-2 space-y-2">
              {filteredUsers.map((user, index) => (
                <Card
                  key={user.id}
                  data-result={index}
                  onClick={() => handleUserClick(user.username)}
                  onKeyDown={(e) => handleResultKeyDown(e, index, user.username)}
                  tabIndex={0} // Make card focusable
                  className="cursor-pointer hover:shadow-lg transition-shadow w-full"
                >
                  <CardContent className="p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={`https://superfan.alterwork.in/files/profilepic/${user.username}.png`}
                            alt={user.display_name || user.username}
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=36&width=36"
                            }}
                          />
                          <AvatarFallback>
                            {(user.display_name || user.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.isLive && (
                          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-1 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">@{user.username}</h3>
                      </div>
                      {user.isLive && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                          <div className="w-1 h-1 bg-white rounded-full mr-1"></div>
                          LIVE
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No users found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

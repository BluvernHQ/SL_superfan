"use client"

import * as React from "react"
import { Search, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

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
  users: UserData[]
  isLoading: boolean
}

export function UserSearch({ users, isLoading }: UserSearchProps) {
  const [query, setQuery] = React.useState("")
  const [isFocused, setIsFocused] = React.useState(false)
  const router = useRouter()
  const searchRef = React.useRef<HTMLDivElement>(null)

  const filteredUsers = React.useMemo(() => {
    if (!query) {
      return []
    }
    const lowerCaseQuery = query.toLowerCase()
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(lowerCaseQuery) ||
        user.display_name.toLowerCase().includes(lowerCaseQuery),
    )
  }, [users, query])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

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
  React.useEffect(() => {
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
          {isLoading ? (
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

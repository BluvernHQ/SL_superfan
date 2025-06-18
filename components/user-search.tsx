"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"

interface SearchResult {
  username: string
  display_name: string
  UID: string
}

export function UserSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length > 0) {
        searchUsers(query.trim())
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const getAuthHeaders = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return {}

    try {
      const token = await currentUser.getIdToken()
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    } catch (error) {
      console.error("Error getting auth token:", error)
      return {}
    }
  }

  const searchUsers = async (searchQuery: string) => {
    setIsLoading(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(
        `https://superfan.alterwork.in/search_users?query=${encodeURIComponent(searchQuery)}`,
        {
          headers,
        },
      )

      if (response.ok) {
        const data = await response.json()
        setResults(data.users || [])
        setIsOpen(true)
      } else {
        console.error("Search failed:", response.statusText)
        setResults([])
      }
    } catch (error) {
      console.error("Error searching users:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserClick = (username: string) => {
    setIsOpen(false)
    setQuery("")
    router.push(`/profile/${username}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    } else if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault()
      // Focus first result
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
        // Focus back to input
        const input = searchRef.current?.querySelector("input") as HTMLElement
        input?.focus()
      } else {
        const prevResult = searchRef.current?.querySelector(`[data-result="${index - 1}"]`) as HTMLElement
        prevResult?.focus()
      }
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-4 h-9 bg-background/50 border-border/50 focus:bg-background focus:border-border"
        />
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-sm text-muted-foreground">Searching...</div>
          ) : results.length > 0 ? (
            <div className="py-1">
              {results.map((user, index) => (
                <button
                  key={user.UID}
                  data-result={index}
                  onClick={() => handleUserClick(user.username)}
                  onKeyDown={(e) => handleResultKeyDown(e, index, user.username)}
                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors focus:bg-accent focus:text-accent-foreground focus:outline-none"
                >
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage
                      src={`https://superfan.alterwork.in/files/profilepic/${user.username}.png`}
                      alt={user.display_name || user.username}
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                      }}
                    />
                    <AvatarFallback>{(user.display_name || user.username).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">@{user.username}</span>
                    {user.display_name && user.display_name !== user.username && (
                      <span className="text-xs text-muted-foreground">{user.display_name}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim().length > 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No users found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, User, LogOut, ChevronDown, Camera } from "lucide-react"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { UserSearch } from "./user-search" // Re-import UserSearch

interface UserData {
  id: string
  username: string
  display_name: string
  isLive: boolean
  totalSessions: number
  followers: number
  isFollowing: boolean
}

interface NavigationProps {
  allUsers: UserData[]
  isLoadingUsers: boolean
}

export function Navigation({ allUsers, isLoadingUsers }: NavigationProps) {
  const [user, setUser] = useState<any>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest(".user-dropdown")) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("click", handleClickOutside)
    }

    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      setIsDropdownOpen(false)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const getUserDisplayName = () => {
    if (user?.displayName) return user.displayName
    if (user?.email) return user.email.split("@")[0]
    return "User"
  }

  const getUserInitials = () => {
    const displayName = getUserDisplayName()
    return displayName.charAt(0).toUpperCase()
  }

  const handleProfileClick = (path: string) => {
    setIsDropdownOpen(false)
    router.push(path)
  }

  const handleStartLive = () => {
    if (user) {
      router.push("/streamer")
    } else {
      router.push("/login?redirect=stream")
    }
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Top Left */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              Superfan
            </span>
          </Link>

          {/* Search Bar - Centered and takes available space */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <UserSearch users={allUsers} isLoading={isLoadingUsers} /> {/* Pass users and loading state */}
          </div>

          {/* User Menu and Create Button - Aligned to the right */}
          <div className="flex items-center space-x-4">
            <Button
              size="sm"
              onClick={handleStartLive}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
            >
              <Camera className="mr-2 h-4 w-4" />
              Start Stream
            </Button>

            {user ? (
              <div className="relative user-dropdown">
                <Button
                  variant="ghost"
                  className="relative h-10 w-auto rounded-full hover:bg-accent px-2 flex items-center gap-2"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={`https://superfan.alterwork.in/files/profilepic/${getUserDisplayName()}.png`}
                      alt="User"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                      }}
                    />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </Button>

                {/* Custom Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
                    {/* User Info */}
                    <div className="flex items-center justify-start gap-2 p-3 border-b border-border">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium text-sm">@{getUserDisplayName()}</p>
                        <p className="w-[200px] truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => handleProfileClick(`/profile/${getUserDisplayName()}`)}
                        className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>View Profile</span>
                      </button>

                      <div className="border-t border-border my-1"></div>

                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button asChild className="bg-gradient-to-r from-orange-600 to-orange-500">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

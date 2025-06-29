"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, User, LogOut, ChevronDown, Camera, Menu, X, Home, Clock, TrendingUp, Search } from "lucide-react"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { buildProfilePicUrl } from "@/lib/config"
import { UserSearch } from "./user-search"

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
  const [isSearchOpen, setIsSearchOpen] = useState(false)
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

  const handleNavigationClick = (path: string) => {
    router.push(path)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent hidden sm:block">
              Superfan
            </span>
          </Link>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <UserSearch users={allUsers} isLoading={isLoadingUsers} />
          </div>
            </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Start Stream Button */}
              <Button
                size="sm"
                onClick={handleStartLive}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 hidden sm:flex"
              >
                <Camera className="mr-2 h-4 w-4" />
                <span>Start Stream</span>
              </Button>

          {/* Mobile Stream Button */}
          <Button
            size="sm"
            onClick={handleStartLive}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 sm:hidden p-2"
          >
            <Camera className="h-4 w-4" />
          </Button>

          {/* User Menu */}
              {user ? (
                <div className="relative user-dropdown">
                  <Button
                    variant="ghost"
                className="relative h-9 w-auto rounded-full hover:bg-accent px-2 flex items-center gap-2"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={buildProfilePicUrl(getUserDisplayName())}
                        alt="User"
                        onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg?height=28&width=28"
                        }}
                      />
                  <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <ChevronDown
                  className={`h-3 w-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </Button>

              {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg z-50">
                      {/* User Info */}
                      <div className="flex items-center gap-3 p-4 border-b border-border">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={buildProfilePicUrl(getUserDisplayName())}
                            alt="User"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=40&width=40"
                            }}
                          />
                          <AvatarFallback>{getUserInitials()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="font-medium text-sm">@{getUserDisplayName()}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</p>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={() => handleProfileClick(`/profile/${getUserDisplayName()}`)}
                          className="flex items-center w-full px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <User className="mr-3 h-4 w-4" />
                          <span>View Profile</span>
                        </button>

                        <div className="border-t border-border my-2"></div>

                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        >
                          <LogOut className="mr-3 h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button asChild className="bg-gradient-to-r from-orange-600 to-orange-500" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
        </div>
      </div>
    </nav>
  )
}

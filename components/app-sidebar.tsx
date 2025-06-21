"use client"

import type * as React from "react"
import { useRouter } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  useSidebar, // Import useSidebar
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  users: UserData[]
  isLoading: boolean
}

export function AppSidebar({ users, isLoading, ...props }: AppSidebarProps) {
  const router = useRouter()
  const { isMobile } = useSidebar() // Use useSidebar to determine mobile state

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  // Only render this sidebar on desktop (not mobile)
  if (isMobile) {
    return null
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <h2 className="text-2xl font-bold px-4 pt-2">All Users</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Users</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <SidebarMenuItem key={index}>
                    <Skeleton className="h-16 w-full rounded-md" />
                  </SidebarMenuItem>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <SidebarMenuItem key={user.id} className="relative w-full">
                    <div
                      className="relative w-full"
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
                        onClick={() => router.push(`/profile/${user.username}`)}
                        className="relative z-10 cursor-pointer transition-all duration-75 hover:shadow-lg w-full h-full hover:-translate-x-[2px] hover:-translate-y-[2px]"
                        onMouseEnter={(e) => {
                          const bg = e.currentTarget.parentElement?.querySelector("div:first-child") as HTMLElement
                          if (bg) bg.style.opacity = "1"
                        }}
                        onMouseLeave={(e) => {
                          const bg = e.currentTarget.parentElement?.querySelector("div:first-child") as HTMLElement
                          if (bg) bg.style.opacity = "0"
                        }}
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
                          <div className="text-center text-xs">
                            <div className="font-bold text-orange-600">{formatNumber(user.followers)}</div>
                            <div className="text-xs text-muted-foreground">Followers</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </SidebarMenuItem>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No users found.</p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

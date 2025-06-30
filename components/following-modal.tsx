"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

interface FollowingModalProps {
  isOpen: boolean
  onClose: () => void
  followingList: string[]
  isLoadingFollowing: boolean
  fetchFollowing: () => Promise<void>
  onUserClick: (username: string) => void
  onUnfollow: (username: string) => Promise<void>
  unfollowingUsers: Set<string>
}

export function FollowingModal({
  isOpen,
  onClose,
  followingList,
  isLoadingFollowing,
  fetchFollowing,
  onUserClick,
  onUnfollow,
  unfollowingUsers,
}: FollowingModalProps) {
  // Fetch following when modal opens if not already loaded
  // useEffect(() => {
  //   if (isOpen && followingList.length === 0 && !isLoadingFollowing) {
  //     fetchFollowing();
  //   }
  // }, [isOpen, followingList.length, isLoadingFollowing, fetchFollowing]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Following</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] px-6 pb-6">
          {isLoadingFollowing ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between space-x-3 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              ))}
            </div>
          ) : followingList.length > 0 ? (
            <div className="space-y-4">
              {followingList.map((followingUsername) => (
                <div key={followingUsername} className="flex items-center justify-between space-x-3">
                  <div
                    className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors flex-1 min-w-0"
                    onClick={() => {
                      onUserClick(followingUsername)
                      onClose()
                    }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={`https://superfan.alterwork.in/files/profilepic/${followingUsername}.png`}
                        alt={followingUsername}
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=40&width=40"
                        }}
                      />
                      <AvatarFallback>{followingUsername.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm truncate">@{followingUsername}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs bg-transparent"
                    onClick={() => onUnfollow(followingUsername)}
                    disabled={unfollowingUsers.has(followingUsername)}
                  >
                    {unfollowingUsers.has(followingUsername) ? "Unfollowing..." : "Unfollow"}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Not following anyone yet.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

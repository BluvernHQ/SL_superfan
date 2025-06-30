"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

interface FollowersModalProps {
  isOpen: boolean
  onClose: () => void
  followersList: string[]
  isLoadingFollowers: boolean
  fetchFollowers: () => Promise<void>
  onUserClick: (username: string) => void
}

export function FollowersModal({
  isOpen,
  onClose,
  followersList,
  isLoadingFollowers,
  fetchFollowers,
  onUserClick,
}: FollowersModalProps) {
  // Fetch followers when modal opens if not already loaded
  // useEffect(() => {
  //   if (isOpen && followersList.length === 0 && !isLoadingFollowers) {
  //     fetchFollowers();
  //   }
  // }, [isOpen, followersList.length, isLoadingFollowers, fetchFollowers]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Followers</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] px-6 pb-6">
          {isLoadingFollowers ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3 animate-pulse">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : followersList.length > 0 ? (
            <div className="space-y-4">
              {followersList.map((followerUsername) => (
                <div
                  key={followerUsername}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                  onClick={() => {
                    onUserClick(followerUsername)
                    onClose()
                  }}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={`https://superfan.alterwork.in/files/profilepic/${followerUsername}.png`}
                      alt={followerUsername}
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=40&width=40"
                      }}
                    />
                    <AvatarFallback>{followerUsername.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm truncate">@{followerUsername}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No followers yet.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

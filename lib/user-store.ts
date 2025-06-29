import { create } from 'zustand'

interface UserData {
  id: string
  username: string
  display_name: string
  isLive: boolean
  totalSessions: number
  followers: number
  isFollowing: boolean
}

interface UserStore {
  users: UserData[]
  isLoading: boolean
  lastFetched: number | null
  fetchUsers: () => Promise<void>
  updateFollowStatus: (username: string, isFollowing: boolean) => void
  clearUsers: () => void
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  isLoading: false,
  lastFetched: null,

  fetchUsers: async () => {
    const { lastFetched, isLoading } = get()
    
    // Don't fetch if already loading
    if (isLoading) return
    
    // Check if we have recent data (within cache duration)
    if (lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
      return
    }

    set({ isLoading: true })

    try {
      // Get current user from Firebase auth
      const { auth } = await import('@/lib/firebase')
      const { onAuthStateChanged } = await import('firebase/auth')
      
      let currentUser: any = null
      
      // Get current user synchronously if possible
      if (auth.currentUser) {
        currentUser = auth.currentUser
      } else {
        // Wait for auth state if not available
        await new Promise<void>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            currentUser = user
            unsubscribe()
            resolve()
          })
        })
      }

      // Get auth headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (currentUser) {
        try {
          const { getIdToken } = await import('firebase/auth')
          const authToken = await getIdToken(currentUser)
          headers["Authorization"] = `Bearer ${authToken}`
        } catch (tokenError) {
          console.log("Error getting Firebase token:", tokenError)
        }
      }

      // Fetch users from API
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
          set({ users: [], isLoading: false, lastFetched: Date.now() })
          return
        }

        // Transform users and check follow status if user is logged in
        const transformedUsers = await Promise.all(
          usersArray.map(async (userData: any) => {
            let isFollowing = false
            
            // Check follow status if user is logged in
            if (currentUser && userData.username) {
              try {
                const followCheckResponse = await fetch("/api/did_follow", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ target_username: userData.username }),
                })
                
                if (followCheckResponse.ok) {
                  const followData = await followCheckResponse.json()
                  isFollowing = followData.followed || false
                }
              } catch (error) {
                console.error("Error checking follow status:", error)
              }
            }

            return {
              id: userData.UID || userData.username,
              username: userData.display_name || userData.username,
              display_name: userData.display_name,
              isLive: userData.status !== "notlive",
              totalSessions: userData.sessions || 0,
              followers: userData.followers || 0,
              isFollowing: isFollowing,
            }
          })
        )

        // Filter out the current user and users that are already being followed
        const usersToShow = transformedUsers.filter((userData: any) => {
          // Exclude the current user
          if (currentUser) {
            const currentUserDisplayName = currentUser.displayName
            const currentUserUID = currentUser.uid
            const isCurrentUser = userData.username === currentUserDisplayName || 
                                 userData.id === currentUserUID ||
                                 userData.username === currentUserUID
            
            if (isCurrentUser) {
              return false
            }
          }
          
          // Exclude users that are already being followed
          if (currentUser && userData.isFollowing) {
            return false
          }
          
          return true
        })

        set({ 
          users: usersToShow, 
          isLoading: false, 
          lastFetched: Date.now() 
        })
      } else {
        console.error("Failed to fetch users:", response.status, response.statusText)
        set({ users: [], isLoading: false, lastFetched: Date.now() })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      set({ users: [], isLoading: false, lastFetched: Date.now() })
    }
  },

  updateFollowStatus: (username: string, isFollowing: boolean) => {
    const { users } = get()
    const updatedUsers = users.map(user => 
      user.username === username 
        ? { ...user, isFollowing } 
        : user
    )
    set({ users: updatedUsers })
  },

  clearUsers: () => {
    set({ users: [], isLoading: false, lastFetched: null })
  }
})) 
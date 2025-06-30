"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Navigation } from "./navigation"
import { AppSidebar } from "./app-sidebar"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, getIdToken } from "firebase/auth"
import { useUserStore } from "@/lib/user-store"
import { useSidebarStore } from "@/lib/sidebar-store"

interface MobileLayoutProps {
  children: React.ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const pathname = usePathname()
  
  // Use the singleton user store
  const { users: allUsers, isLoading: isLoadingUsers, fetchUsers } = useUserStore()
  
  // Use the global sidebar store
  const { isOpen: isSidebarOpen, isCollapsed, setIsOpen: setIsSidebarOpen, setIsCollapsed } = useSidebarStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Auto-expand sidebar only on home page (desktop only)
  useEffect(() => {
    const isHomePage = pathname === "/"
    if (isDesktop) {
      if (isHomePage) {
        setIsCollapsed(false) // Expand sidebar on home page (desktop)
      } else {
        setIsCollapsed(true) // Collapse sidebar on other pages (desktop)
      }
    } else {
      // On mobile, always keep sidebar collapsed
      setIsCollapsed(true)
    }
  }, [pathname, setIsCollapsed, isDesktop])

  const handleToggleCollapse = () => {
    // Only allow toggle on desktop
    if (isDesktop) {
      setIsCollapsed(!isCollapsed)
    }
  }

  // Calculate margin based on screen size and collapsed state
  const getMainMargin = () => {
    if (isDesktop) {
      return isCollapsed ? "70px" : "240px"
    }
    return "70px" // Always 70px on mobile (collapsed sidebar)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed App Bar */}
      <Navigation 
        allUsers={allUsers} 
        isLoadingUsers={isLoadingUsers}
      />

      {/* Sidebar positioned below app bar - always visible on mobile */}
      <div className="fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)]">
        <AppSidebar
          users={allUsers}
          isLoading={isLoadingUsers}
          isOpen={true} // Always open on mobile
          onClose={() => {}} // No-op on mobile since sidebar is always visible
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Main Content Area */}
      <main 
        className="pt-14 transition-all duration-500 ease-in-out"
        style={{ 
          marginLeft: getMainMargin()
        }}
      >
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

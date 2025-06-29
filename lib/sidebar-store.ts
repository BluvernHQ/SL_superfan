import { create } from 'zustand'

interface SidebarStore {
  isOpen: boolean
  isCollapsed: boolean
  setIsOpen: (isOpen: boolean) => void
  setIsCollapsed: (isCollapsed: boolean) => void
  toggleOpen: () => void
  toggleCollapsed: () => void
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: false,
  isCollapsed: false,
  
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
  setIsCollapsed: (isCollapsed: boolean) => set({ isCollapsed }),
  
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
})) 
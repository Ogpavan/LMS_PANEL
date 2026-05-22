"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  openGroupKey: string | null;
  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
  setMobileOpen: (value: boolean) => void;
  toggleGroup: (key: string) => void;
  setOpenGroup: (key: string | null) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      openGroupKey: null,
      toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setCollapsed: (value) => set({ isCollapsed: value }),
      setMobileOpen: (value) => set({ isMobileOpen: value }),
      toggleGroup: (key) =>
        set((state) => ({
          openGroupKey: state.openGroupKey === key ? null : key
        })),
      setOpenGroup: (key) => set({ openGroupKey: key })
    }),
    {
      name: "admin-sidebar-store",
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
        openGroupKey: state.openGroupKey
      })
    }
  )
);

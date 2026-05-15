"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ContentDensity = "comfortable" | "compact";

interface LayoutState {
  density: ContentDensity;
  navbarBlur: boolean;
  setDensity: (density: ContentDensity) => void;
  toggleNavbarBlur: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      density: "comfortable",
      navbarBlur: true,
      setDensity: (density) => set({ density }),
      toggleNavbarBlur: () => set((state) => ({ navbarBlur: !state.navbarBlur }))
    }),
    {
      name: "admin-layout-store"
    }
  )
);

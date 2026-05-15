"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  primaryColor: string;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setPrimaryColor: (value: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "light",
      primaryColor: "256 90% 63%",
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((state) => ({
          mode: state.mode === "light" ? "dark" : "light"
        })),
      setPrimaryColor: (value) => set({ primaryColor: value })
    }),
    {
      name: "admin-theme-store"
    }
  )
);

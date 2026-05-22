"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { GeneralSettings } from "@/lib/general-settings";

import { generalSettingsDefaults } from "@/lib/general-settings";

interface AppSettingsState {
  general: GeneralSettings;
  loaded: boolean;
  setGeneral: (settings: GeneralSettings) => void;
  setLoaded: (value: boolean) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      general: generalSettingsDefaults,
      loaded: false,
      setGeneral: (settings) => set({ general: settings }),
      setLoaded: (value) => set({ loaded: value })
    }),
    {
      name: "admin-app-settings-store"
    }
  )
);

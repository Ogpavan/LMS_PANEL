"use client";

import { useEffect } from "react";

import { normalizeGeneralSettings } from "@/lib/general-settings";
import { useAppSettingsStore } from "@/store/app-settings-store";

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const setGeneral = useAppSettingsStore((state) => state.setGeneral);
  const setLoaded = useAppSettingsStore((state) => state.setLoaded);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/v1/settings/general", {
          cache: "no-store"
        });

        const result = (await response.json()) as {
          success?: boolean;
          data?: Partial<{
            lmsName: string;
            supportEmail: string;
            supportContact: string;
            tagline: string;
            primaryColor: string;
            accentColor: string;
            headingFont: string;
            bodyFont: string;
          }>;
        };

        if (!active) {
          return;
        }

        if (response.ok && result.success && result.data) {
          setGeneral(normalizeGeneralSettings(result.data));
        }
      } catch {
        // Keep persisted or default settings when the request fails.
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, [setGeneral, setLoaded]);

  return children;
}

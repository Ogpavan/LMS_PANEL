"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";

import { fontFamilyValue, hexToHslTriplet } from "@/lib/general-settings";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useThemeStore } from "@/store/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeStore();
  const general = useAppSettingsStore((state) => state.general);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.setProperty("--primary", hexToHslTriplet(general.primaryColor));
    document.documentElement.style.setProperty("--ring", hexToHslTriplet(general.primaryColor));
    document.documentElement.style.setProperty("--brand-accent", general.accentColor);
    document.documentElement.style.setProperty("--font-sans", fontFamilyValue(general.bodyFont));
    document.documentElement.style.setProperty("--font-heading", fontFamilyValue(general.headingFont));
    document.title = general.lmsName;
  }, [general, mode]);

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          classNames: {
            toast:
              "!rounded-md !border !bg-card !text-foreground !shadow-[0_14px_36px_rgba(75,70,92,0.16)]",
            success:
              "!border-emerald-200 !bg-emerald-50 !text-emerald-950 dark:!border-emerald-500/20 dark:!bg-emerald-500/10 dark:!text-emerald-100",
            error:
              "!border-rose-200 !bg-rose-50 !text-rose-950 dark:!border-rose-500/20 dark:!bg-rose-500/10 dark:!text-rose-100",
            title: "!text-[14px] !font-medium !leading-[20px]",
            description: "!text-[13px] !leading-[19px] !opacity-80",
            closeButton: "!border-current/10 !bg-white/70 !text-current dark:!bg-white/5"
          }
        }}
      />
    </>
  );
}

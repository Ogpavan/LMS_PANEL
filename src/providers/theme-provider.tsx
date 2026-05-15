"use client";

import { useEffect } from "react";

import { adminConfig } from "@/config/admin.config";
import { useThemeStore } from "@/store/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, primaryColor, setPrimaryColor } = useThemeStore();

  useEffect(() => {
    setPrimaryColor(adminConfig.primaryColor);
  }, [setPrimaryColor]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.setProperty("--primary", primaryColor);
    document.documentElement.style.setProperty("--ring", primaryColor);
  }, [mode, primaryColor]);

  return children;
}

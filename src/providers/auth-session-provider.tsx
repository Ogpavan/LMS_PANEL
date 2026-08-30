"use client";

import { useEffect, type ReactNode } from "react";

import { useAuthStore } from "@/store/auth-store";

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return children;
}

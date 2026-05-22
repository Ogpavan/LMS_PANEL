"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { UserRole } from "@/types/admin";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[] | null;
}

interface AuthState {
  accessToken: string | null;
  expiresAt: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (payload: { accessToken: string; expiresAt: string; user: AuthUser }) => void;
  clearSession: () => void;
  setHydrated: (value: boolean) => void;
}

function isSessionExpired(expiresAt: string | null) {
  if (!expiresAt) {
    return true;
  }

  return Date.parse(expiresAt) <= Date.now();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      expiresAt: null,
      user: null,
      hydrated: false,
      setSession: ({ accessToken, expiresAt, user }) => set({ accessToken, expiresAt, user }),
      clearSession: () => set({ accessToken: null, expiresAt: null, user: null }),
      setHydrated: (value) => set({ hydrated: value })
    }),
    {
      name: "admin-auth-store",
      onRehydrateStorage: () => (state) => {
        if (state && isSessionExpired(state.expiresAt)) {
          state.clearSession();
        }

        state?.setHydrated(true);
      }
    }
  )
);

export function mapApiRoleToUserRole(role: string): UserRole {
  switch (role) {
    case "ADMIN":
      return "admin";
    case "INSTRUCTOR":
      return "instructor";
    case "STUDENT":
    default:
      return "student";
  }
}

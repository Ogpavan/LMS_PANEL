"use client";

import { create } from "zustand";

import type { UserRole } from "@/types/admin";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[] | null;
}

interface AuthState {
  // Compatibility readiness flag used by existing widgets. It never contains a credential.
  accessToken: string | null;
  expiresAt: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (payload: { expiresAt: string; user: AuthUser }) => void;
  clearSession: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  expiresAt: null,
  user: null,
  hydrated: false,
  setSession: ({ expiresAt, user }) =>
    set({ accessToken: "cookie-session", expiresAt, user, hydrated: true }),
  clearSession: () => set({ accessToken: null, expiresAt: null, user: null, hydrated: true }),
  restoreSession: async () => {
    try {
      const response = await fetch("/api/v1/auth/session", { cache: "no-store" });
      const result = (await response.json()) as {
        success?: boolean;
        expiresAt?: string;
        user?: { id: number; name: string; email: string; role: string; permissions: string[] | null };
      };

      if (!response.ok || !result.success || !result.expiresAt || !result.user) {
        set({ accessToken: null, expiresAt: null, user: null, hydrated: true });
        return;
      }

      set({
        accessToken: "cookie-session",
        expiresAt: result.expiresAt,
        user: {
          ...result.user,
          role: mapApiRoleToUserRole(result.user.role)
        },
        hydrated: true
      });
    } catch {
      set({ accessToken: null, expiresAt: null, user: null, hydrated: true });
    }
  }
}));

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

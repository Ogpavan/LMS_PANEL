"use client";

import { create } from "zustand";

import type { BreadcrumbItem } from "@/types/admin";

interface NavigationState {
  currentPath: string;
  breadcrumbs: BreadcrumbItem[];
  setCurrentPath: (path: string) => void;
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  currentPath: "/",
  breadcrumbs: [],
  setCurrentPath: (path) => set({ currentPath: path }),
  setBreadcrumbs: (items) => set({ breadcrumbs: items })
}));

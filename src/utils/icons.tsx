"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShoppingCart,
  SunMedium,
  Truck,
  Users,
  X
} from "lucide-react";

import type { IconName } from "@/types/admin";

const iconMap: Record<string, LucideIcon> = {
  BarChart3,
  Bell,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShoppingCart,
  SunMedium,
  Truck,
  Users,
  X
};

export function resolveIcon(name?: IconName): LucideIcon {
  if (!name) return LayoutDashboard;
  return iconMap[name] ?? LayoutDashboard;
}

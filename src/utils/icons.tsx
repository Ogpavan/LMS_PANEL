"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BadgeCheck,
  BadgeDollarSign,
  Bell,
  BellRing,
  BookOpen,
  CalendarPlus,
  CircleHelp,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Megaphone,
  MessageCircleQuestion,
  MessageSquare,
  MessageSquareQuote,
  MoonStar,
  PlusSquare,
  PlugZap,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  SunMedium,
  Tags,
  Ticket,
  TrendingUp,
  Truck,
  Trophy,
  UserCog,
  UserPlus,
  Users,
  X
} from "lucide-react";

import type { IconName } from "@/types/admin";

const iconMap: Record<string, LucideIcon> = {
  BarChart3,
  BadgeCheck,
  BadgeDollarSign,
  Bell,
  BellRing,
  BookOpen,
  CalendarPlus,
  CircleHelp,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Megaphone,
  MessageCircleQuestion,
  MessageSquare,
  MessageSquareQuote,
  MoonStar,
  PlusSquare,
  PlugZap,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  SunMedium,
  Tags,
  Ticket,
  TrendingUp,
  Truck,
  Trophy,
  UserCog,
  UserPlus,
  Users,
  X
};

export function resolveIcon(name?: IconName): LucideIcon {
  if (!name) return LayoutDashboard;
  return iconMap[name] ?? LayoutDashboard;
}

export function resolveContextualIcon(title: string, name?: IconName): LucideIcon {
  if (name) {
    return resolveIcon(name);
  }

  const normalized = title.trim().toLowerCase();

  if (normalized.includes("dashboard")) return LayoutDashboard;
  if (normalized.includes("all courses")) return BookOpen;
  if (normalized.includes("create course")) return PlusSquare;
  if (normalized.includes("categories")) return Tags;
  if (normalized.includes("certificates")) return BadgeCheck;
  if (normalized.includes("live classes")) return GraduationCap;
  if (normalized.includes("schedule class")) return CalendarPlus;
  if (normalized.includes("attendance")) return ClipboardCheck;
  if (normalized.includes("assignments")) return FileText;
  if (normalized.includes("quizzes")) return CircleHelp;
  if (normalized.includes("exams")) return FileSpreadsheet;
  if (normalized.includes("results")) return BarChart3;
  if (normalized.includes("all students")) return Users;
  if (normalized.includes("progress")) return TrendingUp;
  if (normalized.includes("performance")) return Trophy;
  if (normalized.includes("all instructors")) return Users;
  if (normalized.includes("permissions")) return UserCog;
  if (normalized.includes("enrollments")) return UserPlus;
  if (normalized.includes("discussions")) return MessageSquare;
  if (normalized.includes("announcements")) return Megaphone;
  if (normalized.includes("messages")) return MessageCircleQuestion;
  if (normalized.includes("course reports")) return BookOpen;
  if (normalized.includes("student reports")) return Users;
  if (normalized.includes("revenue reports")) return Receipt;
  if (normalized.includes("enquiries")) return MessageSquareQuote;
  if (normalized.includes("feedback")) return MessageSquareQuote;
  if (normalized.includes("tickets")) return Ticket;
  if (normalized.includes("settings")) return SlidersHorizontal;
  if (normalized.includes("roles & permissions")) return ShieldCheck;
  if (normalized.includes("integrations")) return PlugZap;
  if (normalized.includes("notifications")) return BellRing;
  if (normalized.includes("profile")) return Users;
  if (normalized.includes("billing")) return BadgeDollarSign;
  if (normalized.includes("pricing")) return BadgeDollarSign;
  if (normalized.includes("faq")) return CircleHelp;

  return LayoutDashboard;
}

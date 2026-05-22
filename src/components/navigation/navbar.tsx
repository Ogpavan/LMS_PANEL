"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  Bell,
  MoonStar,
  SunMedium,
  Menu,
  User,
  Settings,
  LogOut,
  FileText,
  BadgeDollarSign,
  CircleHelp
} from "lucide-react";

import type { PageDefinition } from "@/types/admin";

import { adminConfig } from "@/config/admin.config";
import { useAuthStore } from "@/store/auth-store";
import { useSidebarStore } from "@/store/sidebar-store";
import { useThemeStore } from "@/store/theme-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export function Navbar({ page }: { page: PageDefinition }) {
  const router = useRouter();
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen);
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const { mode, toggleMode } = useThemeStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/70 bg-white px-4 py-3 lg:px-6 dark:bg-card",
        isCollapsed ? "lg:left-[84px]" : "lg:left-[260px]"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1680px] items-center gap-3"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden"
        >
          <Menu className="h-[18px] w-[18px]" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium leading-[22px] text-foreground">
            {page.title}
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-[15px] font-normal leading-[22px] text-muted-foreground md:flex">
          <Search className="h-4 w-4" />
          <span>Search modules, pages, widgets</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleMode}>
          {mode === "dark" ? (
            <SunMedium className="h-[18px] w-[18px]" />
          ) : (
            <MoonStar className="h-[18px] w-[18px]" />
          )}
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-[18px] w-[18px]" />
        </Button>
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-card text-left shadow-sm transition-colors hover:bg-muted/60"
            aria-label="Open profile menu"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/12 text-[14px] font-semibold text-primary">
              {getInitials(user?.name ?? "Admin User")}
            </div>
          </button>

          {isProfileOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[286px] rounded-2xl border border-border/70 bg-card p-0 shadow-[0_18px_42px_rgba(75,70,92,0.16)]">
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="relative">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/12 text-[15px] font-semibold text-primary ring-2 ring-primary/20">
                    {getInitials(user?.name ?? "Admin User")}
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold leading-[22px] text-foreground">
                    {user?.name ?? "User"}
                  </div>
                  <div className="truncate text-[13px] leading-[20px] text-muted-foreground">
                    {formatRoleLabel(user?.role ?? adminConfig.defaultRole)}
                  </div>
                </div>
              </div>

              <div className="h-px bg-border/80" />

              <div className="space-y-1 p-2">
                <Link
                  href="/dashboard/academy/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium leading-[22px] text-foreground transition-colors hover:bg-muted/70"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Profile</span>
                </Link>
                <Link
                  href="/dashboard/academy/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium leading-[22px] text-foreground transition-colors hover:bg-muted/70"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </Link>
                <Link
                  href="/dashboard/academy/billing"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium leading-[22px] text-foreground transition-colors hover:bg-muted/70"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">Billing Plan</span>
                  <span className="inline-flex min-w-6 items-center justify-center rounded-md bg-[hsl(0_100%_64%)] px-1.5 py-0.5 text-[12px] font-semibold leading-none text-white">
                    4
                  </span>
                </Link>
              </div>

              <div className="h-px bg-border/80" />

              <div className="space-y-1 p-2">
                <Link
                  href="/dashboard/academy/pricing"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium leading-[22px] text-foreground transition-colors hover:bg-muted/70"
                >
                  <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Pricing</span>
                </Link>
                <Link
                  href="/dashboard/academy/faq"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium leading-[22px] text-foreground transition-colors hover:bg-muted/70"
                >
                  <CircleHelp className="h-4 w-4 text-muted-foreground" />
                  <span>FAQ</span>
                </Link>
              </div>

              <div className="h-px bg-border/80" />

              <div className="p-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    clearSession();
                    router.push("/login");
                  }}
                  className="flex min-h-9 w-full items-center justify-center gap-2 rounded-md bg-[hsl(0_100%_64%)] px-3 py-2 text-[15px] font-medium leading-[22px] text-white shadow-sm transition-colors hover:bg-[hsl(0_100%_60%)]"
                >
                  <span>Logout</span>
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRoleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

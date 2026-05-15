"use client";

import { Search, Bell, MoonStar, SunMedium, Menu } from "lucide-react";

import type { PageDefinition } from "@/types/admin";

import { adminConfig } from "@/config/admin.config";
import { useSidebarStore } from "@/store/sidebar-store";
import { useThemeStore } from "@/store/theme-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export function Navbar({ page }: { page: PageDefinition }) {
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen);
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const { mode, toggleMode } = useThemeStore();

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
          <div className="text-[13px] font-normal uppercase leading-[18px] tracking-[0.4px] text-muted-foreground">
            {adminConfig.appName}
          </div>
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
      </div>
    </header>
  );
}

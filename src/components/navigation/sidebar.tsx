"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { SidebarSectionConfig } from "@/types/admin";

import { LogoMark } from "@/components/shared/logo-mark";
import { Button } from "@/components/ui/button";
import { SidebarItem } from "@/components/navigation/sidebar-item";
import { useSidebarStore } from "@/store/sidebar-store";
import { cn } from "@/utils/cn";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

function SidebarBody({
  sections,
  collapsed,
  onCloseMobile
}: {
  sections: SidebarSectionConfig[];
  collapsed: boolean;
  onCloseMobile?: () => void;
}) {
  const toggleCollapsed = useSidebarStore((state) => state.toggleCollapsed);
  const items = sections.flatMap((section) => section.items);

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border/70 bg-[hsl(var(--sidebar))] p-3 shadow-shell transition-[width] duration-300 ease-out",
        collapsed ? "w-[84px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center justify-between gap-3 px-1 pb-4">
        <LogoMark collapsed={collapsed} />
        <div className="flex items-center gap-2">
          {onCloseMobile ? (
            <Button size="icon" variant="ghost" onClick={onCloseMobile} className="lg:hidden">
              <X className="h-[18px] w-[18px]" />
            </Button>
          ) : null}
          <Button size="icon" variant="ghost" onClick={toggleCollapsed} className="hidden lg:inline-flex">
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto py-2 pr-1">
        {items.map((item) => (
          <SidebarItem
            key={item.href ?? item.title}
            item={item}
            collapsed={collapsed}
            onNavigate={onCloseMobile}
          />
        ))}
      </div>
    </div>
  );
}

export const Sidebar = memo(function Sidebar({
  sections
}: {
  sections: SidebarSectionConfig[];
}) {
  const { isCollapsed, isMobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-300 ease-out lg:block",
          isCollapsed ? "w-[84px]" : "w-[260px]"
        )}
      >
        <SidebarBody sections={sections} collapsed={isCollapsed} />
      </aside>

      <AnimatePresence>
        {isMobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-slate-950/45 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              className="h-full max-w-[320px] p-3"
              initial={{ x: -32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -32, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
              <SidebarBody
                sections={sections}
                collapsed={false}
                onCloseMobile={() => setMobileOpen(false)}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
});

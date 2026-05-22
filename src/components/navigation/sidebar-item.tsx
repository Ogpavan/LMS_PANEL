"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import type { SidebarItemConfig } from "@/types/admin";

import { Badge } from "@/components/ui/badge";
import { useSidebarStore } from "@/store/sidebar-store";
import { cn } from "@/utils/cn";
import { resolveContextualIcon, resolveIcon } from "@/utils/icons";

interface SidebarItemProps {
  item: SidebarItemConfig;
  collapsed: boolean;
  depth?: number;
  onNavigate?: () => void;
}

export const SidebarItem = memo(function SidebarItem({
  item,
  collapsed,
  depth = 0,
  onNavigate
}: SidebarItemProps) {
  const pathname = usePathname();
  const itemRef = useRef<HTMLDivElement | null>(null);
  const Icon = resolveIcon(item.icon);
  const ItemIcon = resolveContextualIcon(item.title, item.icon);
  const DisplayIcon = depth > 0 ? ItemIcon : Icon;
  const itemKey = item.href ?? item.pageKey ?? item.title;
  const openGroupKey = useSidebarStore((state) => state.openGroupKey);
  const toggleGroup = useSidebarStore((state) => state.toggleGroup);
  const setOpenGroup = useSidebarStore((state) => state.setOpenGroup);
  const isActive = item.href ? pathname === item.href : false;
  const hasActiveChild = useMemo(
    () => item.children?.some((child) => pathname?.startsWith(child.href ?? "")) ?? false,
    [item.children, pathname]
  );
  const [open, setOpen] = useState(hasActiveChild);
  const [hovered, setHovered] = useState(false);
  const [flyoutTop, setFlyoutTop] = useState<number | null>(null);
  const [arrowTop, setArrowTop] = useState<number | null>(null);
  const [flyoutLeft, setFlyoutLeft] = useState<number | null>(null);
  const showCollapsedFlyout = collapsed && depth === 0;
  const isAccordionGroup = depth === 0 && Boolean(item.children?.length);

  useEffect(() => {
    if (!isAccordionGroup || !hasActiveChild) return;
    setOpenGroup(itemKey);
  }, [hasActiveChild, isAccordionGroup, itemKey, setOpenGroup]);

  useEffect(() => {
    if (!item.children?.length) return;

    if (isAccordionGroup) {
      setOpen(openGroupKey === itemKey);
      return;
    }

    if (hasActiveChild) {
      setOpen(true);
    }
  }, [hasActiveChild, isAccordionGroup, item.children?.length, itemKey, openGroupKey]);

  useEffect(() => {
    if (!showCollapsedFlyout || !hovered || !itemRef.current) return;

    const updatePosition = () => {
      const rect = itemRef.current?.getBoundingClientRect();
      if (!rect) return;
      setFlyoutTop(rect.top);
      setArrowTop(rect.top + rect.height / 2);
      setFlyoutLeft(rect.right + 12);
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [hovered, showCollapsedFlyout]);

  const flyout = showCollapsedFlyout && hovered ? (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed z-[70] min-w-[140px] max-w-56 rounded-lg border border-border/70 bg-white px-3 py-2 shadow-lg dark:bg-card"
      style={{ top: flyoutTop ?? 0, left: flyoutLeft ?? 0 }}
    >
      <div
        className="fixed z-[71] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-l border-border/70 bg-white dark:bg-card"
        style={{ top: arrowTop ?? 0, left: (flyoutLeft ?? 0) - 0.5 }}
      />
      <div className="relative text-[15px] font-medium leading-[22px] text-foreground">
        {item.title}
      </div>
      {item.children?.length ? (
        <div className="relative mt-2 space-y-1 border-t border-border/70 pt-2">
          {item.children.map((child) => {
            const childActive = pathname === child.href;
            const ChildIcon = resolveContextualIcon(child.title, child.icon);

            return (
              <Link
                key={child.href ?? child.title}
                href={child.href ?? "#"}
                onClick={onNavigate}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium leading-[20px] transition-colors",
                  childActive
                    ? "bg-primary text-white hover:bg-primary hover:text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <ChildIcon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{child.title}</span>
                {child.badge ? (
                  <Badge className={cn(childActive ? "bg-white/20 text-white" : "")}>
                    {child.badge}
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </motion.div>
  ) : null;

  if (item.children?.length) {
    return (
      <div
        ref={itemRef}
        className="relative space-y-1.5"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <button
          type="button"
          onClick={() => {
            if (isAccordionGroup) {
              toggleGroup(itemKey);
              return;
            }

            setOpen((value) => !value);
          }}
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-[15px] font-medium leading-[22px] transition-colors",
            hasActiveChild
              ? "bg-primary text-white shadow-sm hover:bg-primary hover:text-white"
              : "text-muted-foreground hover:bg-muted",
            collapsed && "justify-center px-2"
          )}
        >
          <DisplayIcon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed ? (
            <>
              <span className="flex-1 truncate">{item.title}</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
              />
            </>
          ) : null}
        </button>
        <AnimatePresence initial={false}>
          {open && !collapsed ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="ml-4 space-y-1.5 border-l border-border/70 pl-3">
                {item.children.map((child) => (
                  <SidebarItem
                    key={child.href ?? child.title}
                    item={child}
                    collapsed={false}
                    depth={depth + 1}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>{flyout}</AnimatePresence>
      </div>
    );
  }

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={item.href ?? "#"}
        onClick={onNavigate}
        className={cn(
          "group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium leading-[22px] transition-colors",
          isActive
            ? "bg-primary text-white shadow-sm hover:bg-primary hover:text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          collapsed && "justify-center px-2",
          depth > 0 && "text-[13px] leading-[20px]"
        )}
      >
        <DisplayIcon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed ? (
          <>
            <span className="flex-1 truncate">{item.title}</span>
            {item.badge ? (
              <Badge className={cn(isActive ? "bg-white/20 text-white" : "")}>
                {item.badge}
              </Badge>
            ) : null}
          </>
        ) : null}
      </Link>
      <AnimatePresence>{flyout}</AnimatePresence>
    </div>
  );
});

"use client";

import { memo, useEffect } from "react";
import { motion } from "framer-motion";

import type { ShellContextValue } from "@/types/admin";

import { Sidebar } from "@/components/navigation/sidebar";
import { Navbar } from "@/components/navigation/navbar";
import { ContentContainer } from "@/components/layouts/content-container";
import { Footer } from "@/components/layouts/footer";
import { useNavigationStore } from "@/store/navigation-store";
import { useAuthStore } from "@/store/auth-store";
import { useSidebarStore } from "@/store/sidebar-store";
import { adminConfig } from "@/config/admin.config";
import { getRegistrySnapshot } from "@/services/registry-service";
import { cn } from "@/utils/cn";

export const AppShell = memo(function AppShell({
  page,
  breadcrumbs,
  children
}: ShellContextValue) {
  const role = useAuthStore((state) => state.user?.role ?? adminConfig.defaultRole);
  const permissions = useAuthStore((state) => state.user?.permissions ?? null);
  const snapshot = getRegistrySnapshot(role, permissions);
  const setCurrentPath = useNavigationStore((state) => state.setCurrentPath);
  const setBreadcrumbs = useNavigationStore((state) => state.setBreadcrumbs);
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);

  useEffect(() => {
    setCurrentPath(page.href);
    setBreadcrumbs(breadcrumbs);
  }, [breadcrumbs, page.href, setBreadcrumbs, setCurrentPath]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar sections={snapshot.navigation} />
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col bg-white transition-[padding] duration-300 ease-out dark:bg-card",
          isCollapsed ? "lg:pl-[84px]" : "lg:pl-[260px]"
        )}
        >
        <Navbar page={page} />
        <ContentContainer>
          <motion.div
            key={page.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="flex-1"
          >
            {children}
          </motion.div>
        </ContentContainer>
        <Footer />
      </div>
    </div>
  );
});

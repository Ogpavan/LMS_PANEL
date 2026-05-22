"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { adminConfig } from "@/config/admin.config";
import { getRegistrySnapshot } from "@/services/registry-service";
import { useAuthStore } from "@/store/auth-store";
import { resolveRoute } from "@/utils/routes";

export function useAdminRoute() {
  const pathname = usePathname() ?? adminConfig.defaultRoute;
  const role = useAuthStore((state) => state.user?.role ?? adminConfig.defaultRole);
  const permissions = useAuthStore((state) => state.user?.permissions ?? null);

  return useMemo(() => {
    const snapshot = getRegistrySnapshot(role, permissions);
    const slug = pathname.split("/").filter(Boolean);
    return {
      snapshot,
      match: resolveRoute(snapshot, slug)
    };
  }, [pathname, permissions, role]);
}

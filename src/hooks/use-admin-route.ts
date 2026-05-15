"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { adminConfig } from "@/config/admin.config";
import { getRegistrySnapshot } from "@/services/registry-service";
import { resolveRoute } from "@/utils/routes";

export function useAdminRoute() {
  const pathname = usePathname() ?? adminConfig.defaultRoute;

  return useMemo(() => {
    const snapshot = getRegistrySnapshot(adminConfig.currentRole);
    const slug = pathname.split("/").filter(Boolean);
    return {
      snapshot,
      match: resolveRoute(snapshot, slug)
    };
  }, [pathname]);
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { adminConfig } from "@/config/admin.config";
import { AppShell } from "@/components/layouts/app-shell";
import { NotFoundPage } from "@/components/layouts/not-found-page";
import { PageRenderer } from "@/components/layouts/page-renderer";
import { useAdminRoute } from "@/hooks/use-admin-route";
import { useAuthStore } from "@/store/auth-store";

export default function DynamicAdminPage() {
  const router = useRouter();
  const { snapshot, match } = useAdminRoute();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const clearSession = useAuthStore((state) => state.clearSession);

  const isExpired = !expiresAt || Date.parse(expiresAt) <= Date.now();

  useEffect(() => {
    if (hydrated && (!accessToken || isExpired)) {
      if (accessToken && isExpired) {
        clearSession();
      }

      router.replace("/login");
    }
  }, [accessToken, clearSession, hydrated, isExpired, router]);

  if (!hydrated || !accessToken || isExpired) {
    return null;
  }

  if (!match) {
    const fallbackPage = snapshot.pagesByHref.get(adminConfig.defaultRoute);

    if (!fallbackPage) {
      return <NotFoundPage />;
    }

    return (
      <AppShell page={fallbackPage} breadcrumbs={[{ title: "Unknown route", href: "#" }]}>
        <NotFoundPage />
      </AppShell>
    );
  }

  return (
    <AppShell page={match.page} breadcrumbs={match.breadcrumbs} section={match.section}>
      <PageRenderer page={match.page} />
    </AppShell>
  );
}

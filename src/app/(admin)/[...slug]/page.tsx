import { adminConfig } from "@/config/admin.config";
import { AppShell } from "@/components/layouts/app-shell";
import { NotFoundPage } from "@/components/layouts/not-found-page";
import { PageRenderer } from "@/components/layouts/page-renderer";
import { getRegistrySnapshot } from "@/services/registry-service";
import { resolveRoute } from "@/utils/routes";

export default async function DynamicAdminPage({
  params
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const resolvedParams = await params;
  const snapshot = getRegistrySnapshot(adminConfig.currentRole);
  const match = resolveRoute(snapshot, resolvedParams.slug);

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

"use client";

import { useMemo } from "react";

import type { PageDefinition } from "@/types/admin";

import { adminConfig } from "@/config/admin.config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRegistrySnapshot } from "@/services/registry-service";

export function PageRenderer({ page }: { page: PageDefinition }) {
  const snapshot = useMemo(
    () => getRegistrySnapshot(adminConfig.currentRole),
    []
  );
  const layout = snapshot.layouts.get(page.layoutKey);

  if (!layout) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Unregistered layout</CardTitle>
        </CardHeader>
        <CardContent>
          Layout <strong>{page.layoutKey}</strong> is referenced by page{" "}
          <strong>{page.key}</strong> but not registered.
        </CardContent>
      </Card>
    );
  }

  const LayoutComponent = layout.component;
  return <LayoutComponent page={page} widgets={page.widgets ?? []} />;
}

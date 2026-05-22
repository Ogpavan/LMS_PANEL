"use client";

import { memo, useMemo } from "react";

import type { PageDefinition, WidgetInstanceConfig } from "@/types/admin";

import { adminConfig } from "@/config/admin.config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRegistrySnapshot } from "@/services/registry-service";
import { useAuthStore } from "@/store/auth-store";

export const WidgetRenderer = memo(function WidgetRenderer({
  config,
  page
}: {
  config: WidgetInstanceConfig;
  page: PageDefinition;
}) {
  const role = useAuthStore((state) => state.user?.role ?? adminConfig.defaultRole);
  const permissions = useAuthStore((state) => state.user?.permissions ?? null);
  const snapshot = useMemo(
    () => getRegistrySnapshot(role, permissions),
    [permissions, role]
  );
  const widget = snapshot.widgets.get(config.widgetKey);

  if (!widget) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unregistered widget</CardTitle>
        </CardHeader>
        <CardContent>
          Widget <strong>{config.widgetKey}</strong> is referenced by page{" "}
          <strong>{page.key}</strong> but not registered.
        </CardContent>
      </Card>
    );
  }

  const Component = widget.component;
  return <Component config={config} page={page} />;
});

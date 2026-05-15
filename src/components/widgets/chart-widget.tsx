"use client";

import type { WidgetRendererProps } from "@/types/admin";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartWidget({ config }: WidgetRendererProps) {
  const points = ((config.props?.points as number[] | undefined) ?? [45, 68, 52, 76, 72, 94]).slice(
    0,
    12
  );

  const max = Math.max(...points, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-56 items-end gap-3 rounded-xl bg-gradient-to-b from-primary/10 to-transparent p-5">
          {points.map((point, index) => (
            <div key={`${config.id}-${index}`} className="flex flex-1 flex-col justify-end">
              <div
                className="rounded-sm bg-primary transition-all duration-300"
                style={{ height: `${Math.max((point / max) * 100, 14)}%` }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

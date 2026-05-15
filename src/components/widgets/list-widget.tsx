"use client";

import { ArrowRight } from "lucide-react";

import type { WidgetRendererProps } from "@/types/admin";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ListRow = {
  label: string;
  value: string;
  tone?: string;
};

export function ListWidget({ config }: WidgetRendererProps) {
  const rows = (config.props?.rows as ListRow[] | undefined) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div
            key={`${config.id}-${row.label}`}
            className="flex items-center justify-between rounded-lg bg-muted/55 px-4 py-3"
          >
            <div>
              <p className="text-[15px] font-medium leading-[22px]">{row.label}</p>
              <p className="text-[13px] font-normal leading-[20px] text-muted-foreground">{row.value}</p>
            </div>
            <div className="flex items-center gap-2 text-[13px] font-medium leading-[20px] text-muted-foreground">
              <span>{row.tone ?? "View"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

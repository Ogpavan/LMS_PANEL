"use client";

import { ArrowUpRight } from "lucide-react";

import type { WidgetRendererProps } from "@/types/admin";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricWidget({ config }: WidgetRendererProps) {
  const value = String(config.props?.value ?? "0");
  const delta = String(config.props?.delta ?? "+0%");
  const caption = String(config.props?.caption ?? "Compared to last period");

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-[15px] font-medium leading-[22px] text-foreground">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[28px] font-semibold leading-[42px] text-foreground">
              {value}
            </div>
            <p className="mt-2 text-[13px] font-normal leading-[20px] text-muted-foreground">
              {caption}
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-[13px] font-medium leading-[18px] text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {delta}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

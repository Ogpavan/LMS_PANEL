"use client";

import { Sparkles } from "lucide-react";

import type { WidgetRendererProps } from "@/types/admin";

import { Card, CardContent } from "@/components/ui/card";

export function HeroWidget({ config }: WidgetRendererProps) {
  const eyebrow = String(config.props?.eyebrow ?? "Framework Ready");
  const pills = ((config.props?.pills as string[] | undefined) ?? [
    "Config",
    "Registry",
    "Layout",
    "Theme"
  ]).map((pill) => String(pill));

  return (
    <Card className="overflow-hidden">
      <CardContent className="relative p-5 md:p-6">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-[13px] font-normal leading-[18px] tracking-[0.4304px] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {eyebrow}
            </div>
            <div>
              <h2 className="text-[24px] font-semibold leading-[38px] md:text-[28px] md:leading-[42px]">
                {config.title}
              </h2>
              <p className="mt-2 max-w-2xl text-[13px] font-normal leading-[20px] text-muted-foreground">
                {String(
                  config.description ??
                    "This page is rendered by the registry, composed by the layout engine, and populated by widgets without custom route files."
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-background/70 p-4">
            {pills.map((pill) => (
              <div
                key={pill}
                className="rounded-lg border border-border/70 bg-white px-3 py-2 text-center text-[13px] font-medium leading-[20px] text-muted-foreground dark:bg-card"
              >
                {pill}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

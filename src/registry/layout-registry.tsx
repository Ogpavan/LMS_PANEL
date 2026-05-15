import { memo } from "react";

import type { LayoutDefinition, LayoutRendererProps, WidgetInstanceConfig } from "@/types/admin";

import { WidgetRenderer } from "@/components/widgets/widget-renderer";
import { cn } from "@/utils/cn";

function getWidgetSpan(size: WidgetInstanceConfig["size"]) {
  switch (size) {
    case "xs":
      return "xl:col-span-2";
    case "sm":
      return "md:col-span-3 xl:col-span-3";
    case "lg":
      return "md:col-span-6 xl:col-span-6";
    case "xl":
      return "xl:col-span-8";
    case "full":
      return "col-span-full";
    case "md":
    default:
      return "md:col-span-3 xl:col-span-4";
  }
}

const OverviewLayout = memo(function OverviewLayout({
  page,
  widgets
}: LayoutRendererProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-6 xl:grid-cols-12">
      {widgets.map((widget) => (
        <div key={widget.id} className={cn("col-span-1", getWidgetSpan(widget.size))}>
          <WidgetRenderer page={page} config={widget} />
        </div>
      ))}
    </div>
  );
});

const SplitLayout = memo(function SplitLayout({ page, widgets }: LayoutRendererProps) {
  const [lead, ...rest] = widgets;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.85fr)]">
      <div className="space-y-5">
        {lead ? <WidgetRenderer page={page} config={lead} /> : null}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {rest.slice(0, 4).map((widget) => (
            <WidgetRenderer key={widget.id} page={page} config={widget} />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        {rest.slice(4).map((widget) => (
          <WidgetRenderer key={widget.id} page={page} config={widget} />
        ))}
      </div>
    </div>
  );
});

const StackLayout = memo(function StackLayout({ page, widgets }: LayoutRendererProps) {
  return (
    <div className="space-y-5">
      {widgets.map((widget) => (
        <WidgetRenderer key={widget.id} page={page} config={widget} />
      ))}
    </div>
  );
});

export const layoutRegistry: LayoutDefinition[] = [
  { key: "overview", component: OverviewLayout },
  { key: "split", component: SplitLayout },
  { key: "stack", component: StackLayout }
];

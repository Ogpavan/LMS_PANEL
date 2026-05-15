import type { WidgetDefinition } from "@/types/admin";

import { ChartWidget } from "@/components/widgets/chart-widget";
import { ControlsShowcaseWidget } from "@/components/widgets/controls-showcase-widget";
import { DataTableWidget } from "@/components/widgets/data-table-widget";
import { HeroWidget } from "@/components/widgets/hero-widget";
import { ListWidget } from "@/components/widgets/list-widget";
import { MetricWidget } from "@/components/widgets/metric-widget";
import { TableWidget } from "@/components/widgets/table-widget";

export const widgetRegistry: WidgetDefinition[] = [
  { key: "metric", component: MetricWidget },
  { key: "list", component: ListWidget },
  { key: "chart", component: ChartWidget },
  { key: "table", component: TableWidget },
  { key: "hero", component: HeroWidget },
  { key: "controls-showcase", component: ControlsShowcaseWidget },
  { key: "data-table", component: DataTableWidget }
];

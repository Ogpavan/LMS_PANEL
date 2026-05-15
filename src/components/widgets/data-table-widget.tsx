"use client";

import type { WidgetRendererProps } from "@/types/admin";

import {
  type RichTableColumn,
  type RichTableRow,
  RichDataTable
} from "@/components/data-table/rich-data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DataTableWidget({ config }: WidgetRendererProps) {
  const columns = (config.props?.columns as RichTableColumn[] | undefined) ?? [];
  const rows = (config.props?.rows as RichTableRow[] | undefined) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        {config.description ? (
          <p className="text-[13px] font-normal leading-[20px] text-muted-foreground">
            {config.description}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <RichDataTable columns={columns} rows={rows} />
      </CardContent>
    </Card>
  );
}

"use client";

import type { WidgetRendererProps } from "@/types/admin";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Column = {
  key: string;
  label: string;
};

type Row = Record<string, string>;

export function TableWidget({ config }: WidgetRendererProps) {
  const columns = (config.props?.columns as Column[] | undefined) ?? [];
  const rows = (config.props?.rows as Row[] | undefined) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b border-border/60 text-[13px] font-medium uppercase leading-[20px] tracking-[0.4px] text-muted-foreground">
              {columns.map((column) => (
                <th key={column.key} className="pb-3 font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${config.id}-${index}`} className="border-b border-border/40 last:border-0">
                {columns.map((column) => (
                  <td key={`${index}-${column.key}`} className="py-4 pr-4 text-[13px] font-normal leading-[20px]">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

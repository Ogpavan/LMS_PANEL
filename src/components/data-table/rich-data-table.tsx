"use client";

import { useMemo, useState } from "react";
import {
  CircleEllipsis,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Eye,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2
} from "lucide-react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export interface RichTableColumn {
  key: string;
  header: string;
  type?: "text" | "email" | "badge" | "currency" | "date";
  sortable?: boolean;
  filterable?: boolean;
}

export interface RichTableRow {
  id: string;
  [key: string]: string;
}

function RowActionsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Row actions"
      >
        <CircleEllipsis className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-36 rounded-lg border border-border/70 bg-white p-1.5 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium leading-[20px] text-foreground hover:bg-muted"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
            View
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium leading-[20px] text-foreground hover:bg-muted"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
            Edit
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium leading-[20px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TableBadge({ value }: { value: string }) {
  const tone =
    value.toLowerCase() === "active"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : value.toLowerCase() === "trial"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
        : value.toLowerCase() === "paused"
          ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          : "bg-muted text-muted-foreground";

  return <Badge className={tone}>{value}</Badge>;
}

function formatCell(type: RichTableColumn["type"], value: string) {
  if (type === "badge") {
    return <TableBadge value={value} />;
  }

  if (type === "currency") {
    return value;
  }

  return value;
}

export function RichDataTable({
  columns,
  rows
}: {
  columns: RichTableColumn[];
  rows: RichTableRow[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  const tableColumns = useMemo<ColumnDef<RichTableRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
            aria-label={`Select row ${row.id}`}
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
        size: 48
      },
      ...columns.map((column) => ({
        accessorKey: column.key,
        header: column.header,
        enableSorting: column.sortable ?? true,
        enableColumnFilter: column.filterable ?? false,
        cell: ({ row }: { row: { original: RichTableRow } }) =>
          formatCell(column.type, row.original[column.key] ?? "")
      })),
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        cell: () => <RowActionsMenu />
      }
    ],
    [columns]
  );

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex min-h-10 min-w-[260px] items-center gap-2 rounded-lg border border-border/70 bg-white px-3 text-[13px] leading-[20px] text-muted-foreground">
            <Search className="h-4 w-4" />
            <input
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              placeholder="Search rows..."
              className="w-full bg-transparent text-foreground outline-none"
            />
          </div>

          <details className="relative">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-border/70 bg-white px-3 text-[15px] font-medium leading-[22px] text-foreground">
              <Columns3 className="h-4 w-4" />
              Columns
              <ChevronDown className="h-4 w-4" />
            </summary>
            <div className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-52 rounded-lg border border-border/70 bg-white p-2 shadow-lg">
              {table
                .getAllLeafColumns()
                .filter((column) => column.id !== "select" && column.id !== "actions")
                .map((column) => (
                  <label
                    key={column.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] leading-[20px] hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    {String(column.columnDef.header)}
                  </label>
                ))}
            </div>
          </details>

          <div className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border/70 bg-white px-3 text-[13px] font-normal leading-[20px] text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            {table.getFilteredRowModel().rows.length} filtered rows
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge>{table.getSelectedRowModel().rows.length} selected</Badge>
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Button size="sm">Add Row</Button>
        </div>
      </div>

      <div className="grid gap-2.5 md:grid-cols-3">
        {columns
          .filter((column) => column.filterable)
          .slice(0, 3)
          .map((column) => {
            const tableColumn = table.getColumn(column.key);
            return (
              <div key={column.key}>
                <label className="mb-2 block text-[13px] font-normal leading-[20px] text-muted-foreground">
                  Filter {column.header}
                </label>
                <input
                  value={(tableColumn?.getFilterValue() as string) ?? ""}
                  onChange={(event) => tableColumn?.setFilterValue(event.target.value)}
                  className="min-h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-[13px] leading-[20px] outline-none"
                />
              </div>
            );
          })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-muted/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-b border-border/70 px-4 py-2.5 text-left text-[13px] font-medium uppercase leading-[20px] tracking-[0.4px] text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "flex items-center gap-2",
                            header.column.getCanSort() ? "cursor-pointer" : "cursor-default"
                          )}
                        >
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {{
                            asc: "↑",
                            desc: "↓"
                          }[header.column.getIsSorted() as string] ?? null}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2.5 text-[13px] font-normal leading-[20px] text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-[13px] font-normal leading-[20px] text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={table.getState().pagination.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            className="min-h-9 rounded-md border border-border/70 bg-white px-3 text-[13px] leading-[20px]"
          >
            {[5, 10, 20, 30].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-2 text-[13px] font-medium leading-[20px] text-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

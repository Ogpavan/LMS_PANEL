"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CircleEllipsis,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Pencil,
  Search,
  Trash2
} from "lucide-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable
} from "@tanstack/react-table";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";

export interface RichTableColumn {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  type?: "text" | "email" | "badge" | "currency" | "date" | "highlight";
  sortable?: boolean;
  filterable?: boolean;
  render?: (row: RichTableRow) => ReactNode;
}

export interface RichTableRow {
  id: string;
  [key: string]: string;
}

export interface RichTableAction {
  label: string;
  onClick: (row: RichTableRow, value?: string) => void;
  icon?: "view" | "edit" | "delete";
  tone?: "default" | "danger";
  disabled?: boolean | ((row: RichTableRow) => boolean);
  kind?: "button" | "status";
  options?: { label: string; value: string }[];
  defaultValue?: string;
}

function RowActionsMenu({
  row,
  actions
}: {
  row: RichTableRow;
  actions: RichTableAction[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusValue, setStatusValue] = useState("");
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const statusAction = actions.find((action) => action.kind === "status");
  const buttonActions = actions.filter((action) => action.kind !== "status");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStatusValue(statusAction?.defaultValue ?? row.status ?? "");
  }, [open, row, statusAction]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      setPosition({
        top: rect.bottom + 8,
        left: rect.right - 160
      });
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Row actions"
      >
        <CircleEllipsis className="h-4 w-4" />
      </button>

      {open && mounted && position
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: position.top,
                left: Math.max(12, position.left)
              }}
              className="z-[120] min-w-40 rounded-md border border-border/70 bg-card p-1.5 shadow-[0_18px_42px_rgba(75,70,92,0.16)]"
            >
              {buttonActions.map((action) => {
                const disabled =
                  typeof action.disabled === "function" ? action.disabled(row) : action.disabled;

                return (
                  <button
                    key={action.label}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) {
                        return;
                      }

                      action.onClick(row);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium leading-[20px] transition-colors",
                      action.tone === "danger"
                        ? "text-rose-600 hover:bg-rose-50 disabled:text-rose-300 dark:hover:bg-rose-500/10"
                        : "text-foreground hover:bg-muted/70 disabled:text-muted-foreground",
                      disabled ? "cursor-not-allowed opacity-60" : ""
                    )}
                  >
                    <ActionIcon icon={action.icon} tone={action.tone} />
                    {action.label}
                  </button>
                );
              })}

              {statusAction ? (
                (() => {
                  const statusDisabled =
                    typeof statusAction.disabled === "function"
                      ? statusAction.disabled(row)
                      : statusAction.disabled;
                  const confirmDisabled =
                    statusValue === (statusAction.defaultValue ?? row.status ?? "") || statusDisabled;

                  return (
                    <div className="mt-1 rounded-md border border-border/70 bg-muted/20 p-2.5">
                      <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
                        {statusAction.label}
                      </div>
                      <select
                        value={statusValue}
                        onChange={(event) => setStatusValue(event.target.value)}
                        className="mb-2 h-9 w-full rounded-md border border-border/70 bg-card px-3 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {(statusAction.options ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={confirmDisabled}
                        onClick={() => {
                          statusAction.onClick(row, statusValue);
                          setOpen(false);
                        }}
                      >
                        Confirm
                      </Button>
                    </div>
                  );
                })()
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function ActionIcon({
  icon,
  tone
}: {
  icon?: RichTableAction["icon"];
  tone?: RichTableAction["tone"];
}) {
  const className = tone === "danger" ? "h-4 w-4" : "h-4 w-4 text-muted-foreground";

  if (icon === "view") {
    return <Eye className={className} />;
  }

  if (icon === "delete") {
    return <Trash2 className={className} />;
  }

  return <Pencil className={className} />;
}

function TableBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone =
    normalized === "active" || normalized === "enabled"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : normalized === "trial" ||
          normalized === "pending" ||
          normalized === "profile only"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
        : normalized === "paused"
          ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          : normalized === "completed"
            ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
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

  if (type === "highlight") {
    return (
      <span className="font-semibold text-[hsl(var(--primary))]">
        <span className="truncate">{value}</span>
      </span>
    );
  }

  return value;
}

export function RichDataTable({
  columns,
  rows,
  rowActions,
  searchPlaceholder = "Search table...",
  enableSearch = true
}: {
  columns: RichTableColumn[];
  rows: RichTableRow[];
  rowActions?: RichTableAction[];
  searchPlaceholder?: string;
  enableSearch?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredRows = useMemo(() => {
    if (!enableSearch || !searchQuery.trim()) return rows;
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) =>
      Object.entries(row).some(([key, val]) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [rows, searchQuery, enableSearch]);

  const tableColumns = useMemo<ColumnDef<RichTableRow>[]>(
    () => [
      ...columns.map((column) => ({
        accessorKey: column.key,
        header: column.header,
        meta: { align: column.align },
        enableSorting: column.sortable ?? true,
        enableColumnFilter: column.filterable ?? false,
        cell: ({ row }: { row: { original: RichTableRow } }) =>
          column.render ? column.render(row.original) : formatCell(column.type, row.original[column.key] ?? "")
      })),
      {
        id: "actions",
        header: "Actions",
        meta: { align: "left" },
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }: { row: { original: RichTableRow } }) =>
          rowActions && rowActions.length > 0 ? <RowActionsMenu row={row.original} actions={rowActions} /> : null
      }
    ],
    [columns, rowActions]
  );

  const table = useReactTable({
    data: filteredRows,
    columns: tableColumns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  return (
    <div className="space-y-4">
      {enableSearch && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-0.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-[13px] bg-card border-border/70 focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[11px] font-semibold bg-muted/60 hover:bg-muted rounded-full h-4 w-4 flex items-center justify-center transition-colors"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <div className="text-[12px] text-muted-foreground font-medium">
              Showing <span className="font-semibold text-foreground">{filteredRows.length}</span> of {rows.length} records
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border/70 bg-card shadow-[0_10px_30px_rgba(75,70,92,0.08)]">
        <div className="overflow-x-auto">
          {filteredRows.length === 0 && searchQuery.trim() ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <p className="text-[14px] font-semibold text-foreground">No matching records found</p>
              <p className="text-[13px]">
                No records match &quot;{searchQuery.trim()}&quot;. Try a different search term.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-[12px] h-8"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <table className="w-full min-w-[980px] border-collapse">
              <thead className="bg-[linear-gradient(180deg,rgba(248,247,250,1),rgba(242,241,247,1))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const colMeta = header.column.columnDef.meta as { align?: "left" | "center" | "right" } | undefined;
                      const alignClass = colMeta?.align === "center" ? "text-center" : colMeta?.align === "right" ? "text-right" : "text-left";
                      const flexAlignClass = colMeta?.align === "center" ? "justify-center w-full" : colMeta?.align === "right" ? "justify-end w-full" : "";

                      return (
                        <th
                          key={header.id}
                          className={cn(
                            "border-b border-border/70 px-4 py-3 text-[12px] font-semibold uppercase leading-[18px] tracking-[0.45px] text-muted-foreground",
                            alignClass
                          )}
                        >
                          {header.isPlaceholder ? null : (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                "flex items-center gap-2 transition-colors",
                                header.column.getCanSort()
                                  ? "cursor-pointer hover:text-foreground"
                                  : "cursor-default",
                                flexAlignClass
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
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-card">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/50 transition-colors last:border-0 hover:bg-[rgba(115,103,240,0.04)] dark:hover:bg-white/5",
                      ""
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const colMeta = cell.column.columnDef.meta as { align?: "left" | "center" | "right" } | undefined;
                      const alignClass = colMeta?.align === "center" ? "text-center" : colMeta?.align === "right" ? "text-right" : "text-left";

                      return (
                        <td key={cell.id} className={cn("px-4 py-3 text-[13px] font-normal leading-[20px] text-foreground", alignClass)}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,247,250,0.96))] px-4 py-3 lg:flex-row lg:items-center lg:justify-between dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
        <div className="text-[13px] font-normal leading-[20px] text-muted-foreground">
          Showing {filteredRows.length > 0 ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0}-
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            filteredRows.length
          )}{" "}
          of {filteredRows.length}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={table.getState().pagination.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            className="min-h-9 rounded-md border border-border/70 bg-card px-3 text-[13px] leading-[20px] shadow-[0_1px_0_rgba(0,0,0,0.03)]"
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
          <div className="rounded-md bg-muted/50 px-3 py-1.5 text-[13px] font-medium leading-[20px] text-foreground">
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

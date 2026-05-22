"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeIndianRupee, BookOpen, CreditCard, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import type { WidgetRendererProps } from "@/types/admin";

import {
  type RichTableColumn,
  type RichTableRow,
  RichDataTable
} from "@/components/data-table/rich-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";

interface RevenueSummary {
  totalEnrollments: number;
  paidEnrollments: number;
  freeEnrollments: number;
  grossRevenue: Record<string, number>;
  thisMonthRevenue: Record<string, number>;
}

interface MonthlyRevenueRow {
  monthKey: string;
  enrollments: number;
  paidEnrollments: number;
  freeEnrollments: number;
  revenueByCurrency: Record<string, number>;
}

interface CourseRevenueRow {
  id: number;
  title: string;
  currency: string;
  price: number;
  status: string;
  enrollments: number;
  paidEnrollments: number;
  uniqueStudents: number;
  revenue: number;
}

interface RevenueReportsResponse {
  summary: RevenueSummary;
  monthlyRevenue: MonthlyRevenueRow[];
  courseRevenue: CourseRevenueRow[];
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const monthlyColumns: RichTableColumn[] = [
  { key: "month", header: "Month", type: "highlight" },
  { key: "enrollments", header: "Enrollments" },
  { key: "paidEnrollments", header: "Paid" },
  { key: "freeEnrollments", header: "Free" },
  { key: "revenue", header: "Booked Revenue" }
];

const courseColumns: RichTableColumn[] = [
  { key: "course", header: "Course", type: "highlight" },
  { key: "status", header: "Status", type: "badge" },
  { key: "listedPrice", header: "Listed Price" },
  { key: "enrollments", header: "Enrollments" },
  { key: "students", header: "Students" },
  { key: "paidEnrollments", header: "Paid" },
  { key: "revenue", header: "Booked Revenue" }
];

export function AcademyRevenueReportsWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [report, setReport] = useState<RevenueReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadReports();
  }, [accessToken]);

  const summary = useMemo(() => {
    const emptySummary: RevenueSummary = {
      totalEnrollments: 0,
      paidEnrollments: 0,
      freeEnrollments: 0,
      grossRevenue: {},
      thisMonthRevenue: {}
    };
    const current = report?.summary ?? emptySummary;

    return [
      {
        label: "Gross booked revenue",
        value: formatCurrencyTotals(current.grossRevenue),
        icon: BadgeIndianRupee,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "This month",
        value: formatCurrencyTotals(current.thisMonthRevenue),
        icon: CreditCard,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Paid enrollments",
        value: String(current.paidEnrollments),
        icon: BookOpen,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "Free enrollments",
        value: String(current.freeEnrollments),
        icon: RefreshCcw,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      }
    ];
  }, [report]);

  const monthlyRows: RichTableRow[] = useMemo(
    () =>
      (report?.monthlyRevenue ?? []).map((row) => ({
        id: row.monthKey,
        month: formatMonth(row.monthKey),
        enrollments: String(row.enrollments),
        paidEnrollments: String(row.paidEnrollments),
        freeEnrollments: String(row.freeEnrollments),
        revenue: formatCurrencyTotals(row.revenueByCurrency)
      })),
    [report]
  );

  const courseRows: RichTableRow[] = useMemo(
    () =>
      (report?.courseRevenue ?? []).map((row) => ({
        id: String(row.id),
        course: row.title,
        status: row.status,
        listedPrice: formatCurrency(row.currency, row.price),
        enrollments: String(row.enrollments),
        students: String(row.uniqueStudents),
        paidEnrollments: String(row.paidEnrollments),
        revenue: formatCurrency(row.currency, row.revenue)
      })),
    [report]
  );

  async function loadReports() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/reports/revenue", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<RevenueReportsResponse>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load revenue reports", {
          description: result.error ?? "Please try again."
        });
        setReport(null);
        return;
      }

      setReport(result.data);
    } catch {
      toast.error("Unable to load revenue reports", {
        description: "Please try again."
      });
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-0">
          <div className="grid gap-px overflow-hidden rounded-md bg-border/70 md:grid-cols-2 xl:grid-cols-4">
            {summary.map(({ label, value, icon: Icon, iconClassName, valueClassName }) => (
              <div key={label} className="flex items-center gap-4 bg-white px-5 py-3 dark:bg-card">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-md ${iconClassName}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-medium leading-[20px] text-muted-foreground">
                    {label}
                  </div>
                  <div className={`mt-0.5 text-[30px] font-semibold leading-none tracking-[-0.03em] ${valueClassName}`}>
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{config.title ?? "Revenue reports"}</CardTitle>
            <Button variant="outline" onClick={() => void loadReports()} disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading revenue reports...
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border/70 p-4">
                <div className="mb-3 text-[15px] font-medium text-foreground">Monthly revenue</div>
                <RichDataTable columns={monthlyColumns} rows={monthlyRows} />
              </div>
              <div className="rounded-md border border-border/70 p-4">
                <div className="mb-3 text-[15px] font-medium text-foreground">Revenue by course</div>
                <RichDataTable columns={courseColumns} rows={courseRows} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatCurrency(currency: string, value: number) {
  return `${currency} ${value.toLocaleString("en-IN")}`;
}

function formatCurrencyTotals(totals: Record<string, number>) {
  const entries = Object.entries(totals).filter(([, value]) => value > 0);

  if (entries.length === 0) {
    return "INR 0";
  }

  return entries.map(([currency, value]) => formatCurrency(currency, value)).join(" | ");
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map((part) => Number(part));
  const date = new Date(year, (month || 1) - 1, 1);

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long"
  });
}

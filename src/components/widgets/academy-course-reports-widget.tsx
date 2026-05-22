"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, IndianRupee, RefreshCcw, SquareLibrary } from "lucide-react";
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

interface CourseReportRecord {
  id: number;
  title: string;
  category: string;
  instructor: string;
  status: string;
  visibility: string;
  featured: boolean;
  currency: string;
  price: number;
  lessonCount: number;
  sectionCount: number;
  enrollmentCount: number;
  activeEnrollments: number;
  completedEnrollments: number;
  bookedRevenue: number;
  createdAt: string;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const tableColumns: RichTableColumn[] = [
  { key: "courseId", header: "Course ID" },
  { key: "title", header: "Course", type: "highlight" },
  { key: "category", header: "Category" },
  { key: "instructor", header: "Instructor" },
  { key: "structure", header: "Structure" },
  { key: "enrollments", header: "Enrollments" },
  { key: "completionMix", header: "Completion Mix" },
  { key: "price", header: "Price" },
  { key: "bookedRevenue", header: "Booked Revenue" },
  { key: "status", header: "Status", type: "badge" }
];

export function AcademyCourseReportsWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [records, setRecords] = useState<CourseReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadReports();
  }, [accessToken]);

  const summary = useMemo(() => {
    const published = records.filter((record) => record.status.toLowerCase() === "published").length;
    const totalLessons = records.reduce((sum, record) => sum + record.lessonCount, 0);
    const totalEnrollments = records.reduce((sum, record) => sum + record.enrollmentCount, 0);
    const projectedRevenueByCurrency = records.reduce<Record<string, number>>((totals, record) => {
      totals[record.currency] = (totals[record.currency] ?? 0) + record.bookedRevenue;
      return totals;
    }, {});

    return [
      {
        label: "Tracked courses",
        value: String(records.length),
        icon: SquareLibrary,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Published courses",
        value: String(published),
        icon: BookOpen,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Total lessons",
        value: String(totalLessons),
        icon: RefreshCcw,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "Booked revenue",
        value: formatSummaryCurrencyTotals(projectedRevenueByCurrency),
        icon: IndianRupee,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      },
      {
        label: "Total enrollments",
        value: String(totalEnrollments),
        icon: BookOpen,
        iconClassName: "bg-[#eef5ff] text-[#4b67f2]",
        valueClassName: "text-[#4b67f2]"
      }
    ];
  }, [records]);

  const rows: RichTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        id: String(record.id),
        courseId: `CRS-${String(record.id).padStart(4, "0")}`,
        title: record.title,
        category: record.category,
        instructor: record.instructor,
        structure: `${record.sectionCount} sections | ${record.lessonCount} lessons`,
        enrollments: String(record.enrollmentCount),
        completionMix: `${record.activeEnrollments} active | ${record.completedEnrollments} completed`,
        price: formatCurrency(record.currency, record.price),
        bookedRevenue: formatCurrency(record.currency, record.bookedRevenue),
        status: record.status
      })),
    [records]
  );

  async function loadReports() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/reports/courses", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<CourseReportRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load course reports", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load course reports", {
        description: "Please try again."
      });
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-0">
          <div className="grid gap-px overflow-hidden rounded-md bg-border/70 md:grid-cols-2 xl:grid-cols-5">
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
            <CardTitle>{config.title ?? "Course reports"}</CardTitle>
            <Button variant="outline" onClick={() => void loadReports()} disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading course reports...
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={rows} />
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

function formatSummaryCurrencyTotals(totals: Record<string, number>) {
  const entries = Object.values(totals).filter((value) => value > 0);

  if (entries.length === 0) {
    return "0";
  }

  return entries.map((value) => value.toLocaleString("en-IN")).join(" | ");
}

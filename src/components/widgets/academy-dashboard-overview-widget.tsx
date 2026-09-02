"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  CalendarClock,
  IndianRupee,
  RefreshCcw,
  TrendingUp,
  Users
} from "lucide-react";
import { toast } from "sonner";

import type { WidgetRendererProps } from "@/types/admin";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";

interface MetricItem {
  value: string;
  totalCourses?: number;
  totalClasses?: number;
  totalRevenue?: number;
  delta: string;
  caption: string;
}

interface PriorityItem {
  label: string;
  value: string;
  tone: string;
}

interface DashboardOverviewData {
  metrics: {
    activeCourses: MetricItem;
    liveClasses: MetricItem;
    totalStudents: MetricItem;
    totalEnrollments: MetricItem;
  };
  enrollmentTrend: {
    points: number[];
    labels: string[];
  };
  priorityItems: PriorityItem[];
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

export function AcademyDashboardOverviewWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);

  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadDashboardOverview();
  }, [accessToken]);

  async function loadDashboardOverview() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/dashboard/overview", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<DashboardOverviewData>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load dashboard overview", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      setData(result.data);
    } catch {
      toast.error("Unable to load dashboard overview", {
        description: "Please check your database connection and try again."
      });
    } finally {
      setIsLoading(false);
    }
  }

  const metricCards = useMemo(() => {
    if (!data) return [];

    return [
      {
        title: "Active courses",
        value: data.metrics.activeCourses.value,
        delta: data.metrics.activeCourses.delta,
        caption: data.metrics.activeCourses.caption,
        icon: BookOpen,
        iconBg: "bg-[#ece9ff] text-[#7367f0]"
      },
      {
        title: "Live classes",
        value: data.metrics.liveClasses.value,
        delta: data.metrics.liveClasses.delta,
        caption: data.metrics.liveClasses.caption,
        icon: CalendarClock,
        iconBg: "bg-[#dff7ff] text-[#00bad1]"
      },
      {
        title: "Total students",
        value: data.metrics.totalStudents.value,
        delta: data.metrics.totalStudents.delta,
        caption: data.metrics.totalStudents.caption,
        icon: Users,
        iconBg: "bg-[#fff1e4] text-[#ff9f43]"
      },
      {
        title: "Total enrollments",
        value: data.metrics.totalEnrollments.value,
        delta: data.metrics.totalEnrollments.delta,
        caption: data.metrics.totalEnrollments.caption,
        icon: IndianRupee,
        iconBg: "bg-[#e4f7ec] text-[#28c76f]"
      }
    ];
  }, [data]);

  const chartMax = useMemo(() => {
    if (!data?.enrollmentTrend.points.length) return 10;
    return Math.max(...data.enrollmentTrend.points, 1);
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Top Header / Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {config?.title ?? "Dashboard Overview"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time platform metrics from PostgreSQL database.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadDashboardOverview()} disabled={isLoading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`grid h-10 w-10 place-items-center rounded-md ${card.iconBg}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <TrendingUp className="h-3 w-3" />
                    {card.delta}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {isLoading ? "..." : card.value}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">
                    {card.title}
                  </div>
                  <div className="text-[12px] text-muted-foreground/80 mt-0.5">
                    {card.caption}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enrollment Trend Chart & Priority Items */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart Column (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Enrollment Trend</CardTitle>
              <span className="text-xs text-muted-foreground font-medium">Monthly enrollments</span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                Loading enrollment trend data...
              </div>
            ) : !data || !data.enrollmentTrend.points.length ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No enrollment data recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex h-56 items-end gap-3 rounded-xl bg-gradient-to-b from-primary/10 to-transparent p-5">
                  {data.enrollmentTrend.points.map((point, index) => {
                    const heightPercent = Math.max((point / chartMax) * 100, 8);
                    const label = data.enrollmentTrend.labels[index] ?? `M${index + 1}`;

                    return (
                      <div key={label} className="flex flex-1 flex-col items-center justify-end h-full group">
                        <div className="text-[11px] font-semibold text-primary mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {point}
                        </div>
                        <div
                          className="w-full rounded-t-sm bg-primary transition-all duration-300 group-hover:bg-primary/80"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <div className="mt-2 text-[11px] font-medium text-muted-foreground">
                          {label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Items Column (1 col) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Priority Items</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading priority items...
              </div>
            ) : !data?.priorityItems.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No priority items requiring attention.
              </div>
            ) : (
              <div className="space-y-4">
                {data.priorityItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/70 p-3 bg-card"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.value}</div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        item.tone === "Review" || item.tone === "Investigate"
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
                          : item.tone === "Good"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                      }`}
                    >
                      {item.tone}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

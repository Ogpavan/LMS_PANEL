"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CircleCheckBig, RefreshCcw, Users } from "lucide-react";
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

interface StudentReportRecord {
  id: number;
  name: string;
  email: string;
  program: string;
  progress: number;
  status: string;
  hasAccount: boolean;
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  attendanceRate7Days: number;
  attendanceRate30Days: number;
  todayStatus: "present" | "absent" | "no-account";
  totalSpend: number;
  lastLogin: string | null;
  createdAt: string;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const tableColumns: RichTableColumn[] = [
  { key: "studentId", header: "Student ID" },
  { key: "name", header: "Student", type: "highlight" },
  { key: "program", header: "Program" },
  { key: "courses", header: "Courses" },
  { key: "progress", header: "Progress" },
  { key: "todayStatus", header: "Today", type: "badge" },
  { key: "attendance30Days", header: "30 Days" },
  { key: "portalAccess", header: "Portal", type: "badge" },
  { key: "lastLogin", header: "Last Login" }
];

export function AcademyStudentReportsWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [records, setRecords] = useState<StudentReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadReports();
  }, [accessToken]);

  const summary = useMemo(() => {
    const enrolledStudents = records.filter((record) => record.totalCourses > 0).length;
    const averageProgress =
      records.length > 0
        ? Math.round(records.reduce((sum, record) => sum + record.progress, 0) / records.length)
        : 0;
    const presentToday = records.filter((record) => record.todayStatus === "present").length;
    const portalEnabled = records.filter((record) => record.hasAccount).length;

    return [
      {
        label: "Students tracked",
        value: String(records.length),
        icon: Users,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "With enrollments",
        value: String(enrolledStudents),
        icon: BookOpen,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Present today",
        value: String(presentToday),
        icon: CircleCheckBig,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "Portal enabled",
        value: String(portalEnabled),
        icon: RefreshCcw,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      },
      {
        label: "Avg progress",
        value: `${averageProgress}%`,
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
        studentId: `STD-${String(record.id).padStart(4, "0")}`,
        name: record.name,
        program: record.program,
        courses: `${record.totalCourses} total | ${record.completedCourses} completed`,
        progress: `${record.progress}%`,
        todayStatus: formatTodayStatus(record.todayStatus),
        attendance30Days: `${record.attendanceRate30Days}%`,
        portalAccess: record.hasAccount ? "Enabled" : "Profile only",
        lastLogin: record.lastLogin ? formatDateTime(record.lastLogin) : "No login yet"
      })),
    [records]
  );

  async function loadReports() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/reports/students", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<StudentReportRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load student reports", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load student reports", {
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
            <CardTitle>{config.title ?? "Student reports"}</CardTitle>
            <Button variant="outline" onClick={() => void loadReports()} disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading student reports...
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatTodayStatus(value: StudentReportRecord["todayStatus"]) {
  if (value === "present") {
    return "Present";
  }

  if (value === "absent") {
    return "Absent";
  }

  return "No account";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

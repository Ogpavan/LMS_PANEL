"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CircleCheckBig, Clock3, RefreshCcw } from "lucide-react";
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

interface AttendanceRecord {
  id: number;
  name: string;
  email: string;
  program: string;
  status: string;
  hasAccount: boolean;
  todayStatus: "present" | "absent" | "no-account";
  attendanceRate7Days: number;
  attendanceRate30Days: number;
  totalLoginDays: number;
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
  { key: "email", header: "Email", type: "email" },
  { key: "program", header: "Program" },
  { key: "todayStatus", header: "Today", type: "badge" },
  { key: "attendance7Days", header: "7 Days" },
  { key: "attendance30Days", header: "30 Days" },
  { key: "totalLoginDays", header: "Login Days" },
  { key: "lastLogin", header: "Last Login" }
];

export function AcademyAttendanceWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadAttendance();
  }, [accessToken]);

  const summary = useMemo(() => {
    const presentToday = records.filter((record) => record.todayStatus === "present").length;
    const absentToday = records.filter((record) => record.todayStatus === "absent").length;
    const averageWeekly =
      records.length > 0
        ? Math.round(records.reduce((sum, record) => sum + record.attendanceRate7Days, 0) / records.length)
        : 0;
    const noAccount = records.filter((record) => !record.hasAccount).length;

    return [
      {
        label: "Present today",
        value: String(presentToday),
        icon: CircleCheckBig,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Absent today",
        value: String(absentToday),
        icon: Clock3,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Avg 7-day attendance",
        value: `${averageWeekly}%`,
        icon: CalendarDays,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "No login account",
        value: String(noAccount),
        icon: RefreshCcw,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      }
    ];
  }, [records]);

  const rows: RichTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        id: String(record.id),
        studentId: `STD-${String(record.id).padStart(4, "0")}`,
        name: record.name,
        email: record.email,
        program: record.program,
        todayStatus: formatTodayStatus(record.todayStatus),
        attendance7Days: `${record.attendanceRate7Days}%`,
        attendance30Days: `${record.attendanceRate30Days}%`,
        totalLoginDays: String(record.totalLoginDays),
        lastLogin: record.lastLogin ? formatDateTime(record.lastLogin) : "No login yet"
      })),
    [records]
  );

  async function loadAttendance() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/attendance/students", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<AttendanceRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load attendance", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load attendance", {
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
            <CardTitle>{config.title ?? "Attendance"}</CardTitle>
            <Button variant="outline" onClick={() => void loadAttendance()} disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading attendance...
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatTodayStatus(value: AttendanceRecord["todayStatus"]) {
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

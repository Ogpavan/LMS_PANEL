"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CircleCheckBig, Clock3, RefreshCcw, Users } from "lucide-react";
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

interface StudentDirectoryRecord {
  id: number;
  name: string;
  email: string;
  program: string;
  progress: number;
  status: string;
  hasAccount: boolean;
  createdAt: string;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const tableColumns: RichTableColumn[] = [
  { key: "studentId", header: "Student ID" },
  { key: "name", header: "Name" },
  { key: "email", header: "Email", type: "email" },
  { key: "program", header: "Program", filterable: true },
  { key: "progress", header: "Progress" },
  { key: "status", header: "Status", type: "badge", filterable: true },
  { key: "portalAccess", header: "Portal Access", type: "badge", filterable: true },
  { key: "createdAt", header: "Added On" }
];

export function AcademyStudentsDirectoryWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [records, setRecords] = useState<StudentDirectoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadStudents();
  }, [accessToken]);

  const summary = useMemo(() => {
    const active = records.filter((record) => record.status.toLowerCase() === "active").length;
    const pending = records.filter((record) => record.status.toLowerCase() === "pending").length;
    const enabled = records.filter((record) => record.hasAccount).length;

    return [
      {
        label: "Total students",
        value: String(records.length),
        icon: Users,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Active students",
        value: String(active),
        icon: CircleCheckBig,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Pending intake",
        value: String(pending),
        icon: Clock3,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "Portal enabled",
        value: String(enabled),
        icon: BookOpen,
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
        progress: `${record.progress}%`,
        status: record.status,
        portalAccess: record.hasAccount ? "Enabled" : "Profile only",
        createdAt: formatDate(record.createdAt)
      })),
    [records]
  );

  async function loadStudents() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/students", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<StudentDirectoryRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load students", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load students", {
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>All students</CardTitle>
              <p className="mt-1 text-[14px] leading-[22px] text-muted-foreground">
                Core directory details that an admin or academic operations lead needs day to day.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void loadStudents()} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Link href="/dashboard/academy/students/create">
                <Button>Create Student</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading student directory...
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

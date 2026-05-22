"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, RefreshCcw, ShieldCheck, UserCog, Users } from "lucide-react";
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

interface InstructorDirectoryRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const tableColumns: RichTableColumn[] = [
  { key: "instructorId", header: "Instructor ID" },
  { key: "name", header: "Name" },
  { key: "email", header: "Email", type: "email" },
  { key: "role", header: "Role", type: "badge", filterable: true },
  { key: "access", header: "Portal Access", type: "badge", filterable: true },
  { key: "createdAt", header: "Added On" }
];

export function AcademyInstructorsDirectoryWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [records, setRecords] = useState<InstructorDirectoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadInstructors();
  }, [accessToken]);

  const summary = useMemo(() => {
    const thisWeek = records.filter((record) => isRecent(record.createdAt)).length;

    return [
      {
        label: "Total instructors",
        value: String(records.length),
        icon: Users,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Active access",
        value: String(records.length),
        icon: BadgeCheck,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "New this week",
        value: String(thisWeek),
        icon: UserCog,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "Role coverage",
        value: "Admin",
        icon: ShieldCheck,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      }
    ];
  }, [records]);

  const rows: RichTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        id: String(record.id),
        instructorId: `INS-${String(record.id).padStart(4, "0")}`,
        name: record.name,
        email: record.email,
        role: record.role,
        access: "Enabled",
        createdAt: formatDate(record.createdAt)
      })),
    [records]
  );

  async function loadInstructors() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/instructors", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<InstructorDirectoryRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load instructors", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load instructors", {
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
              <CardTitle>All instructors</CardTitle>
              <p className="mt-1 text-[14px] leading-[22px] text-muted-foreground">
                Track instructor identity, account readiness, and onboarding activity from the admin directory.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void loadInstructors()} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Link href="/dashboard/academy/instructors/create">
                <Button>Create Instructor</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading instructor directory...
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

function isRecent(value: string) {
  const createdAt = new Date(value).getTime();
  return createdAt >= Date.now() - 7 * 24 * 60 * 60 * 1000;
}

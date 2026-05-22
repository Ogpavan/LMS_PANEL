"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Link2, Radio, RefreshCcw, Video } from "lucide-react";
import { toast } from "sonner";

import type { WidgetRendererProps } from "@/types/admin";

import {
  type RichTableAction,
  type RichTableColumn,
  type RichTableRow,
  RichDataTable
} from "@/components/data-table/rich-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";

interface LiveClassRecord {
  id: number;
  title: string;
  courseTitle: string;
  hostName: string;
  hostEmail: string;
  description: string;
  meetUrl: string;
  startsAt: string;
  durationMinutes: number;
  status: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const tableColumns: RichTableColumn[] = [
  { key: "classId", header: "Class ID" },
  { key: "title", header: "Class title", type: "highlight" },
  { key: "courseTitle", header: "Course" },
  { key: "host", header: "Host" },
  { key: "startsAt", header: "Starts" },
  { key: "duration", header: "Duration" },
  { key: "status", header: "Status", type: "badge" }
];

export function AcademyLiveClassesWidget({ config, page }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.user);
  const [records, setRecords] = useState<LiveClassRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    courseTitle: "",
    hostName: "",
    hostEmail: "",
    startsAt: "",
    durationMinutes: "60",
    meetUrl: "",
    description: ""
  });

  const canCreate = user?.role === "admin" || user?.role === "instructor";

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadLiveClasses();
  }, [accessToken]);

  useEffect(() => {
    if (user?.role === "instructor") {
      setForm((current) => ({
        ...current,
        hostName: current.hostName || user.name,
        hostEmail: current.hostEmail || user.email
      }));
    }
  }, [user]);

  const summary = useMemo(() => {
    const liveCount = records.filter((record) => record.status === "live").length;
    const scheduledCount = records.filter((record) => record.status === "scheduled").length;
    const todayCount = records.filter((record) => isToday(record.startsAt)).length;

    return [
      {
        label: "Total live classes",
        value: String(records.length),
        icon: Video,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Currently live",
        value: String(liveCount),
        icon: Radio,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Scheduled",
        value: String(scheduledCount),
        icon: CalendarClock,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "Today",
        value: String(todayCount),
        icon: Link2,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      }
    ];
  }, [records]);

  const rows: RichTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        id: String(record.id),
        classId: `CLS-${String(record.id).padStart(4, "0")}`,
        title: record.title,
        courseTitle: record.courseTitle || "Independent session",
        host: record.hostName || record.hostEmail || "TBA",
        startsAt: formatDateTime(record.startsAt),
        duration: formatDuration(record.durationMinutes),
        status: formatStatus(record.status)
      })),
    [records]
  );

  const rowActions: RichTableAction[] = useMemo(
    () => [
      {
        label: "Join Google Meet",
        icon: "view",
        onClick: (row) => {
          const record = records.find((item) => String(item.id) === row.id);
          if (!record) return;
          window.open(record.meetUrl, "_blank", "noopener,noreferrer");
        }
      },
      {
        label: "Delete",
        icon: "delete",
        tone: "danger",
        disabled: !canCreate || isSubmitting,
        onClick: (row) => {
          const id = Number(row.id);
          if (!Number.isInteger(id)) return;
          void handleDelete(id);
        }
      }
    ],
    [canCreate, isSubmitting, records]
  );

  async function loadLiveClasses() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/live-classes", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<LiveClassRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load live classes", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load live classes", {
        description: "Please try again."
      });
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreate) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/live-classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          title: form.title,
          courseTitle: form.courseTitle,
          hostName: form.hostName,
          hostEmail: form.hostEmail,
          startsAt: new Date(form.startsAt).toISOString(),
          durationMinutes: Number(form.durationMinutes) || 60,
          meetUrl: form.meetUrl,
          description: form.description
        })
      });

      const result = (await response.json()) as ApiResponse<LiveClassRecord>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Live class could not be created", {
          description: result.error ?? "Please review the form and try again."
        });
        return;
      }

      toast.success("Live class created", {
        description: "The Google Meet session is now listed in live classes."
      });

      setForm({
        title: "",
        courseTitle: "",
        hostName: user?.role === "instructor" ? user.name : "",
        hostEmail: user?.role === "instructor" ? user.email : "",
        startsAt: "",
        durationMinutes: "60",
        meetUrl: "",
        description: ""
      });

      await loadLiveClasses();
    } catch {
      toast.error("Live class could not be created", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm("Delete this live class?");

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/live-classes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<null>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        toast.error("Live class could not be deleted", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Live class deleted", {
        description: "The session has been removed from the schedule."
      });

      await loadLiveClasses();
    } catch {
      toast.error("Live class could not be deleted", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.92fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>{config.title ?? "Live classes"}</CardTitle>
              </div>
              <Button variant="outline" onClick={() => void loadLiveClasses()} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
                Loading live classes...
              </div>
            ) : (
              <RichDataTable columns={tableColumns} rows={rows} rowActions={rowActions} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{canCreate ? "Create live class" : "Google Meet instructions"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-md border border-border/70 bg-muted/10 p-4">
              <div className="text-[14px] font-medium text-foreground">Google Meet flow</div>
              <ol className="mt-2 space-y-1 text-[13px] leading-[20px] text-muted-foreground">
                <li>1. Open Google Meet and create a meeting.</li>
                <li>2. Copy the final `meet.google.com/...` link.</li>
                <li>3. Paste that link into the live class form and save.</li>
              </ol>
              <div className="mt-3">
                <a
                  href="https://meet.google.com/new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-[hsl(var(--primary))]"
                >
                  <Link2 className="h-4 w-4" />
                  Open Google Meet
                </a>
              </div>
            </div>

            {canCreate ? (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <Field
                  label="Class title"
                  required
                  value={form.title}
                  onChange={(value) => setForm((current) => ({ ...current, title: value }))}
                />
                <Field
                  label="Course title"
                  value={form.courseTitle}
                  onChange={(value) => setForm((current) => ({ ...current, courseTitle: value }))}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Host name"
                    required
                    value={form.hostName}
                    onChange={(value) => setForm((current) => ({ ...current, hostName: value }))}
                  />
                  <Field
                    label="Host email"
                    required
                    type="email"
                    value={form.hostEmail}
                    onChange={(value) => setForm((current) => ({ ...current, hostEmail: value }))}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Start date & time"
                    required
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(value) => setForm((current) => ({ ...current, startsAt: value }))}
                  />
                  <Field
                    label="Duration (minutes)"
                    required
                    type="number"
                    value={form.durationMinutes}
                    onChange={(value) => setForm((current) => ({ ...current, durationMinutes: value }))}
                  />
                </div>
                <Field
                  label="Google Meet link"
                  required
                  value={form.meetUrl}
                  onChange={(value) => setForm((current) => ({ ...current, meetUrl: value }))}
                  placeholder="https://meet.google.com/abc-defg-hij"
                />
                <TextAreaField
                  label="Class description"
                  value={form.description}
                  onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                  rows={4}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Create Live Class"}
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-white px-3 py-3 text-[15px] text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
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

function formatDuration(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function formatStatus(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

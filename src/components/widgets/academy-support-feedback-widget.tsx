"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheckBig, MessageSquareText, RefreshCcw, Star } from "lucide-react";
import { toast } from "sonner";

import type { WidgetRendererProps } from "@/types/admin";

import {
  type RichTableAction,
  type RichTableColumn,
  type RichTableRow,
  RichDataTable
} from "@/components/data-table/rich-data-table";
import {
  Field,
  formatDate,
  SelectField,
  SupportSummaryStrip,
  TextAreaField
} from "@/components/widgets/academy-support-shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popup } from "@/components/ui/popup";
import { useAuthStore } from "@/store/auth-store";

interface FeedbackRecord {
  id: number;
  name: string;
  email: string;
  courseTitle: string;
  category: string;
  rating: number;
  message: string;
  status: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const tableColumns: RichTableColumn[] = [
  { key: "feedbackId", header: "Feedback ID" },
  { key: "name", header: "Name", type: "highlight" },
  { key: "courseTitle", header: "Course" },
  { key: "category", header: "Category" },
  { key: "rating", header: "Rating" },
  { key: "status", header: "Status", type: "badge" },
  { key: "createdAt", header: "Received" }
];

export function AcademySupportFeedbackWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    courseTitle: "",
    category: "general",
    rating: "5",
    message: ""
  });

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadFeedback();
  }, [accessToken]);

  const summary = useMemo(() => {
    const pending = records.filter((record) => record.status.toLowerCase() === "pending").length;
    const reviewed = records.filter((record) => record.status.toLowerCase() === "reviewed").length;
    const archived = records.filter((record) => record.status.toLowerCase() === "archived").length;
    const averageRating =
      records.length > 0
        ? (records.reduce((sum, record) => sum + record.rating, 0) / records.length).toFixed(1)
        : "0.0";

    return [
      {
        label: "Total feedback",
        value: String(records.length),
        icon: MessageSquareText,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Pending review",
        value: String(pending),
        icon: RefreshCcw,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Reviewed",
        value: String(reviewed),
        icon: CircleCheckBig,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "Avg rating",
        value: averageRating,
        icon: Star,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      }
    ];
  }, [records]);

  const rows: RichTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        id: String(record.id),
        feedbackId: `FDB-${String(record.id).padStart(4, "0")}`,
        name: record.name,
        courseTitle: record.courseTitle || "General",
        category: formatLabel(record.category),
        rating: `${record.rating}/5`,
        status: formatLabel(record.status),
        createdAt: formatDate(record.createdAt)
      })),
    [records]
  );

  const rowActions: RichTableAction[] = useMemo(
    () => [
      {
        label: "Mark Reviewed",
        icon: "edit",
        onClick: (row) => void updateStatus(Number(row.id), "reviewed")
      },
      {
        label: "Archive",
        icon: "edit",
        onClick: (row) => void updateStatus(Number(row.id), "archived")
      },
      {
        label: "Delete",
        icon: "delete",
        tone: "danger",
        onClick: (row) => void handleDelete(Number(row.id))
      }
    ],
    []
  );

  async function loadFeedback() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/support/feedback", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const result = (await response.json()) as ApiResponse<FeedbackRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load feedback", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load feedback", {
        description: "Please try again."
      });
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/support/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          ...form,
          rating: Number(form.rating)
        })
      });
      const result = (await response.json()) as ApiResponse<FeedbackRecord>;

      if (!response.ok || !result.success) {
        toast.error("Feedback could not be created", {
          description: result.error ?? "Please review the form and try again."
        });
        return;
      }

      toast.success("Feedback added");
      setForm({
        name: "",
        email: "",
        courseTitle: "",
        category: "general",
        rating: "5",
        message: ""
      });
      setIsPopupOpen(false);
      await loadFeedback();
    } catch {
      toast.error("Feedback could not be created", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStatus(id: number, status: string) {
    if (!Number.isInteger(id)) return;

    try {
      const response = await fetch(`/api/v1/support/feedback/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status })
      });
      const result = (await response.json()) as ApiResponse<FeedbackRecord>;

      if (!response.ok || !result.success) {
        toast.error("Feedback could not be updated", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Feedback updated");
      await loadFeedback();
    } catch {
      toast.error("Feedback could not be updated", {
        description: "Please try again."
      });
    }
  }

  async function handleDelete(id: number) {
    if (!Number.isInteger(id) || !window.confirm("Delete this feedback?")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/support/feedback/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const result = (await response.json()) as ApiResponse<null>;

      if (!response.ok || !result.success) {
        toast.error("Feedback could not be deleted", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Feedback deleted");
      await loadFeedback();
    } catch {
      toast.error("Feedback could not be deleted", {
        description: "Please try again."
      });
    }
  }

  return (
    <div className="space-y-5">
      <SupportSummaryStrip items={summary} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>{config.title ?? "Feedback"}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void loadFeedback()} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => setIsPopupOpen(true)}>Add Feedback</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading feedback...
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={rows} rowActions={rowActions} />
          )}
        </CardContent>
      </Card>

      <Popup
        open={isPopupOpen}
        onOpenChange={setIsPopupOpen}
        title="Add feedback"
        description="Record structured learner or parent feedback."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" required value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Field label="Email" required type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
            <Field label="Course" value={form.courseTitle} onChange={(value) => setForm((current) => ({ ...current, courseTitle: value }))} />
            <SelectField
              label="Category"
              value={form.category}
              options={[
                { label: "General", value: "general" },
                { label: "Course content", value: "course-content" },
                { label: "Platform UX", value: "platform-ux" },
                { label: "Live class", value: "live-class" }
              ]}
              onChange={(value) => setForm((current) => ({ ...current, category: value }))}
            />
            <SelectField
              label="Rating"
              value={form.rating}
              options={[1, 2, 3, 4, 5].map((value) => ({
                label: `${value}/5`,
                value: String(value)
              }))}
              onChange={(value) => setForm((current) => ({ ...current, rating: value }))}
            />
          </div>
          <TextAreaField label="Feedback" required value={form.message} onChange={(value) => setForm((current) => ({ ...current, message: value }))} />
          <div className="flex justify-end gap-3 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsPopupOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Feedback"}
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

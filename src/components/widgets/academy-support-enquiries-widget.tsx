"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheckBig, Clock3, MailQuestion, RefreshCcw } from "lucide-react";
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

interface EnquiryRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  topic: string;
  courseTitle: string;
  channel: string;
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
  { key: "enquiryId", header: "Enquiry ID" },
  { key: "name", header: "Name", type: "highlight" },
  { key: "topic", header: "Topic" },
  { key: "courseTitle", header: "Course" },
  { key: "channel", header: "Channel" },
  { key: "status", header: "Status", type: "badge" },
  { key: "createdAt", header: "Received" }
];

export function AcademySupportEnquiriesWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [records, setRecords] = useState<EnquiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    topic: "",
    courseTitle: "",
    channel: "email",
    message: ""
  });

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadEnquiries();
  }, [accessToken]);

  const summary = useMemo(() => {
    const open = records.filter((record) => record.status.toLowerCase() === "open").length;
    const assigned = records.filter((record) => record.status.toLowerCase() === "assigned").length;
    const resolved = records.filter((record) => record.status.toLowerCase() === "resolved").length;

    return [
      {
        label: "Total enquiries",
        value: String(records.length),
        icon: MailQuestion,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Open",
        value: String(open),
        icon: Clock3,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Assigned",
        value: String(assigned),
        icon: RefreshCcw,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "Resolved",
        value: String(resolved),
        icon: CircleCheckBig,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      }
    ];
  }, [records]);

  const rows: RichTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        id: String(record.id),
        enquiryId: `ENQ-${String(record.id).padStart(4, "0")}`,
        name: record.name,
        topic: record.topic,
        courseTitle: record.courseTitle || "General",
        channel: formatLabel(record.channel),
        status: formatLabel(record.status),
        createdAt: formatDate(record.createdAt)
      })),
    [records]
  );

  const rowActions: RichTableAction[] = useMemo(
    () => [
      {
        label: "Mark Assigned",
        icon: "edit",
        onClick: (row) => void updateStatus(Number(row.id), "assigned")
      },
      {
        label: "Mark Resolved",
        icon: "edit",
        onClick: (row) => void updateStatus(Number(row.id), "resolved")
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

  async function loadEnquiries() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/support/enquiries", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const result = (await response.json()) as ApiResponse<EnquiryRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load enquiries", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load enquiries", {
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
      const response = await fetch("/api/v1/support/enquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(form)
      });
      const result = (await response.json()) as ApiResponse<EnquiryRecord>;

      if (!response.ok || !result.success) {
        toast.error("Enquiry could not be created", {
          description: result.error ?? "Please review the form and try again."
        });
        return;
      }

      toast.success("Enquiry created");
      setForm({
        name: "",
        email: "",
        phone: "",
        topic: "",
        courseTitle: "",
        channel: "email",
        message: ""
      });
      setIsPopupOpen(false);
      await loadEnquiries();
    } catch {
      toast.error("Enquiry could not be created", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStatus(id: number, status: string) {
    if (!Number.isInteger(id)) return;

    try {
      const response = await fetch(`/api/v1/support/enquiries/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status })
      });
      const result = (await response.json()) as ApiResponse<EnquiryRecord>;

      if (!response.ok || !result.success) {
        toast.error("Enquiry could not be updated", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Enquiry updated");
      await loadEnquiries();
    } catch {
      toast.error("Enquiry could not be updated", {
        description: "Please try again."
      });
    }
  }

  async function handleDelete(id: number) {
    if (!Number.isInteger(id) || !window.confirm("Delete this enquiry?")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/support/enquiries/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const result = (await response.json()) as ApiResponse<null>;

      if (!response.ok || !result.success) {
        toast.error("Enquiry could not be deleted", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Enquiry deleted");
      await loadEnquiries();
    } catch {
      toast.error("Enquiry could not be deleted", {
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
            <CardTitle>{config.title ?? "Enquiries"}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void loadEnquiries()} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => setIsPopupOpen(true)}>New Enquiry</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading enquiries...
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={rows} rowActions={rowActions} />
          )}
        </CardContent>
      </Card>

      <Popup
        open={isPopupOpen}
        onOpenChange={setIsPopupOpen}
        title="Create enquiry"
        description="Log a new incoming student or parent enquiry."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" required value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Field label="Email" required type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
            <Field label="Phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
            <Field label="Topic" required value={form.topic} onChange={(value) => setForm((current) => ({ ...current, topic: value }))} />
            <Field label="Course" value={form.courseTitle} onChange={(value) => setForm((current) => ({ ...current, courseTitle: value }))} />
            <SelectField
              label="Channel"
              value={form.channel}
              options={[
                { label: "Email", value: "email" },
                { label: "Phone", value: "phone" },
                { label: "Chat", value: "chat" },
                { label: "Walk-in", value: "walk-in" }
              ]}
              onChange={(value) => setForm((current) => ({ ...current, channel: value }))}
            />
          </div>
          <TextAreaField label="Message" value={form.message} onChange={(value) => setForm((current) => ({ ...current, message: value }))} />
          <div className="flex justify-end gap-3 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsPopupOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Enquiry"}
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheckBig, Clock3, RefreshCcw, Ticket } from "lucide-react";
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

interface TicketRecord {
  id: number;
  ticketNumber: string;
  subject: string;
  requesterName: string;
  requesterEmail: string;
  assignedTo: string;
  priority: string;
  channel: string;
  details: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const tableColumns: RichTableColumn[] = [
  { key: "ticketNumber", header: "Ticket" },
  { key: "subject", header: "Subject", type: "highlight" },
  { key: "requesterName", header: "Requester" },
  { key: "assignedTo", header: "Assigned To" },
  { key: "priority", header: "Priority" },
  { key: "status", header: "Status", type: "badge" },
  { key: "channel", header: "Channel" },
  { key: "createdAt", header: "Created" }
];

export function AcademySupportTicketsWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [records, setRecords] = useState<TicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    requesterName: "",
    requesterEmail: "",
    assignedTo: "",
    priority: "medium",
    channel: "portal",
    details: ""
  });

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadTickets();
  }, [accessToken]);

  const summary = useMemo(() => {
    const open = records.filter((record) => record.status.toLowerCase() === "open").length;
    const inProgress = records.filter((record) => record.status.toLowerCase() === "in-progress").length;
    const resolved = records.filter((record) => record.status.toLowerCase() === "resolved").length;
    const highPriority = records.filter((record) => record.priority.toLowerCase() === "high").length;

    return [
      {
        label: "Total tickets",
        value: String(records.length),
        icon: Ticket,
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
        label: "In progress",
        value: String(inProgress),
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
      },
      {
        label: "High priority",
        value: String(highPriority),
        icon: Ticket,
        iconClassName: "bg-[#ffe8e8] text-[#ea5455]",
        valueClassName: "text-[#ea5455]"
      }
    ];
  }, [records]);

  const rows: RichTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        id: String(record.id),
        ticketNumber: record.ticketNumber,
        subject: record.subject,
        requesterName: record.requesterName,
        assignedTo: record.assignedTo || "Unassigned",
        priority: formatLabel(record.priority),
        status: formatLabel(record.status),
        channel: formatLabel(record.channel),
        createdAt: formatDate(record.createdAt)
      })),
    [records]
  );

  const rowActions: RichTableAction[] = useMemo(
    () => [
      {
        label: "Mark In Progress",
        icon: "edit",
        onClick: (row) => void updateTicket(Number(row.id), { status: "in-progress" })
      },
      {
        label: "Mark Resolved",
        icon: "edit",
        onClick: (row) => void updateTicket(Number(row.id), { status: "resolved" })
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

  async function loadTickets() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/support/tickets", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const result = (await response.json()) as ApiResponse<TicketRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load tickets", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load tickets", {
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
      const response = await fetch("/api/v1/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(form)
      });
      const result = (await response.json()) as ApiResponse<TicketRecord>;

      if (!response.ok || !result.success) {
        toast.error("Ticket could not be created", {
          description: result.error ?? "Please review the form and try again."
        });
        return;
      }

      toast.success("Ticket created");
      setForm({
        subject: "",
        requesterName: "",
        requesterEmail: "",
        assignedTo: "",
        priority: "medium",
        channel: "portal",
        details: ""
      });
      setIsPopupOpen(false);
      await loadTickets();
    } catch {
      toast.error("Ticket could not be created", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateTicket(
    id: number,
    payload: { status?: string; assignedTo?: string; priority?: string }
  ) {
    if (!Number.isInteger(id)) return;

    try {
      const response = await fetch(`/api/v1/support/tickets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as ApiResponse<TicketRecord>;

      if (!response.ok || !result.success) {
        toast.error("Ticket could not be updated", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Ticket updated");
      await loadTickets();
    } catch {
      toast.error("Ticket could not be updated", {
        description: "Please try again."
      });
    }
  }

  async function handleDelete(id: number) {
    if (!Number.isInteger(id) || !window.confirm("Delete this ticket?")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/support/tickets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const result = (await response.json()) as ApiResponse<null>;

      if (!response.ok || !result.success) {
        toast.error("Ticket could not be deleted", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Ticket deleted");
      await loadTickets();
    } catch {
      toast.error("Ticket could not be deleted", {
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
            <CardTitle>{config.title ?? "Tickets"}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void loadTickets()} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => setIsPopupOpen(true)}>Create Ticket</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading tickets...
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={rows} rowActions={rowActions} />
          )}
        </CardContent>
      </Card>

      <Popup
        open={isPopupOpen}
        onOpenChange={setIsPopupOpen}
        title="Create ticket"
        description="Create and assign a structured support ticket."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Subject" required value={form.subject} onChange={(value) => setForm((current) => ({ ...current, subject: value }))} />
            <Field label="Requester name" required value={form.requesterName} onChange={(value) => setForm((current) => ({ ...current, requesterName: value }))} />
            <Field label="Requester email" required type="email" value={form.requesterEmail} onChange={(value) => setForm((current) => ({ ...current, requesterEmail: value }))} />
            <Field label="Assigned to" value={form.assignedTo} onChange={(value) => setForm((current) => ({ ...current, assignedTo: value }))} />
            <SelectField
              label="Priority"
              value={form.priority}
              options={[
                { label: "Low", value: "low" },
                { label: "Medium", value: "medium" },
                { label: "High", value: "high" }
              ]}
              onChange={(value) => setForm((current) => ({ ...current, priority: value }))}
            />
            <SelectField
              label="Channel"
              value={form.channel}
              options={[
                { label: "Portal", value: "portal" },
                { label: "Email", value: "email" },
                { label: "Phone", value: "phone" },
                { label: "Chat", value: "chat" }
              ]}
              onChange={(value) => setForm((current) => ({ ...current, channel: value }))}
            />
          </div>
          <TextAreaField label="Details" value={form.details} onChange={(value) => setForm((current) => ({ ...current, details: value }))} />
          <div className="flex justify-end gap-3 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsPopupOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Ticket"}
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

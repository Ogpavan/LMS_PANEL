"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Award, CheckCircle, Clock, FileText, Plus, RefreshCcw } from "lucide-react";
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
import { Popup } from "@/components/ui/popup";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";

interface CourseRecord {
  id: number;
  title: string;
}

interface AssignmentRecord {
  id: number;
  title: string;
  description: string;
  courseId: number;
  dueDate: string;
  totalMarks: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  course?: CourseRecord;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

export function AcademyAssignmentsWidget({ config, page }: WidgetRendererProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [records, setRecords] = useState<AssignmentRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [popupMode, setPopupMode] = useState<"create" | "edit" | "view" | "delete" | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AssignmentRecord | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    courseId: "",
    dueDate: "",
    totalMarks: "100",
    status: "DRAFT"
  });

  const canManage = user?.role === "admin" || user?.role === "instructor";

  const loadAssignments = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/assignments", { cache: "no-store" });
      const result = (await response.json()) as ApiResponse<AssignmentRecord[]>;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "Failed to load assignments");
      }

      setRecords(result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch assignments";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await fetch("/api/v1/courses", { cache: "no-store" });
      const result = (await response.json()) as ApiResponse<CourseRecord[]>;

      if (response.ok && result.success && result.data) {
        setCourses(result.data);
      }
    } catch {
      // Ignore course loading failure silently
    }
  };

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadAssignments();
    void loadCourses();
  }, [accessToken]);

  const summary = useMemo(() => {
    const publishedCount = records.filter((r) => r.status === "PUBLISHED").length;
    const draftCount = records.filter((r) => r.status === "DRAFT").length;
    const totalPoints = records.reduce((sum, r) => sum + (r.totalMarks || 0), 0);

    return [
      {
        label: "Total assignments",
        value: String(records.length),
        icon: FileText,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Published",
        value: String(publishedCount),
        icon: CheckCircle,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      },
      {
        label: "Drafts",
        value: String(draftCount),
        icon: Clock,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "Total marks pool",
        value: `${totalPoints} pts`,
        icon: Award,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      }
    ];
  }, [records]);

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (Number.isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  const handleTogglePublish = async (record: AssignmentRecord) => {
    if (!canManage) return;

    const previousStatus = record.status;
    const nextStatus = previousStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    setTogglingId(record.id);

    // Optimistically update frontend state
    setRecords((current) =>
      current.map((r) => (r.id === record.id ? { ...r, status: nextStatus } : r))
    );

    try {
      const response = await fetch(`/api/v1/assignments/${record.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      const result = (await response.json()) as ApiResponse<AssignmentRecord>;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "Failed to update assignment status");
      }

      // Sync with server response
      setRecords((current) =>
        current.map((r) => (r.id === record.id ? result.data! : r))
      );

      const statusLabel = result.data.status === "PUBLISHED" ? "Published" : "Draft";
      toast.success(`Assignment "${record.title}" status changed to ${statusLabel}`);
    } catch (err) {
      // Revert state on failure
      setRecords((current) =>
        current.map((r) => (r.id === record.id ? { ...r, status: previousStatus } : r))
      );
      toast.error(err instanceof Error ? err.message : "Failed to update assignment status");
    } finally {
      setTogglingId(null);
    }
  };

  const tableColumns: RichTableColumn[] = useMemo(
    () => [
      { key: "asnId", header: "ID" },
      { key: "title", header: "Assignment title", type: "highlight" },
      { key: "course", header: "Course" },
      { key: "dueDate", header: "Due date" },
      { key: "totalMarks", header: "Total marks" },
      {
        key: "status",
        header: "Status",
        render: (row: RichTableRow) => {
          const record = records.find((r) => String(r.id) === row.id);
          if (!record) return row.status;

          const isPublished = record.status === "PUBLISHED";
          const isToggling = togglingId === record.id;

          return (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                role="switch"
                aria-checked={isPublished}
                aria-label={`Status toggle for ${record.title}`}
                disabled={!canManage || isToggling}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleTogglePublish(record);
                }}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                  isPublished ? "bg-[#28c76f]" : "bg-slate-300 dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    isPublished ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
              <span
                className={cn(
                  "text-[13px] font-semibold tracking-tight",
                  isPublished ? "text-[#28c76f]" : "text-slate-500 dark:text-slate-400"
                )}
              >
                {isPublished ? "Published" : "Draft"}
              </span>
            </div>
          );
        }
      }
    ],
    [canManage, records, togglingId]
  );

  const rows: RichTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        id: String(record.id),
        asnId: `#ASN-${String(record.id).padStart(4, "0")}`,
        title: record.title,
        course: record.course?.title || "N/A",
        dueDate: formatDate(record.dueDate),
        totalMarks: `${record.totalMarks} pts`,
        status: record.status === "PUBLISHED" ? "Published" : "Draft"
      })),
    [records]
  );

  const openCreatePopup = () => {
    setForm({
      title: "",
      description: "",
      courseId: courses[0] ? String(courses[0].id) : "",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      totalMarks: "100",
      status: "DRAFT"
    });
    setSelectedRecord(null);
    setPopupMode("create");
  };

  const openEditPopup = (record: AssignmentRecord) => {
    const formattedDueDate = record.dueDate
      ? new Date(record.dueDate).toISOString().split("T")[0]
      : "";

    setForm({
      title: record.title,
      description: record.description || "",
      courseId: String(record.courseId),
      dueDate: formattedDueDate,
      totalMarks: String(record.totalMarks),
      status: record.status
    });
    setSelectedRecord(record);
    setPopupMode("edit");
  };

  const openViewPopup = (record: AssignmentRecord) => {
    setSelectedRecord(record);
    setPopupMode("view");
  };

  const openDeletePopup = (record: AssignmentRecord) => {
    setSelectedRecord(record);
    setPopupMode("delete");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.courseId || !form.dueDate) {
      toast.error("Please fill in all required fields (title, course, due date).");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          courseId: Number(form.courseId),
          dueDate: form.dueDate,
          totalMarks: Number(form.totalMarks),
          status: form.status
        })
      });

      const result = (await response.json()) as ApiResponse<AssignmentRecord>;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create assignment");
      }

      toast.success("Assignment created successfully as Draft");
      setPopupMode(null);
      void loadAssignments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (!form.title.trim() || !form.courseId || !form.dueDate) {
      toast.error("Please fill in all required fields (title, course, due date).");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/assignments/${selectedRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          courseId: Number(form.courseId),
          dueDate: form.dueDate,
          totalMarks: Number(form.totalMarks),
          status: form.status
        })
      });

      const result = (await response.json()) as ApiResponse<AssignmentRecord>;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update assignment");
      }

      toast.success("Assignment updated successfully");
      setPopupMode(null);
      void loadAssignments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRecord) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/assignments/${selectedRecord.id}`, {
        method: "DELETE"
      });

      const result = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete assignment");
      }

      toast.success("Assignment deleted successfully");
      setPopupMode(null);
      void loadAssignments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const rowActions: RichTableAction[] = useMemo(
    () => [
      {
        label: "View details",
        icon: "view",
        onClick: (row) => {
          const rec = records.find((r) => String(r.id) === row.id);
          if (rec) openViewPopup(rec);
        }
      },
      ...(canManage
        ? [
            {
              label: "Edit assignment",
              icon: "edit" as const,
              onClick: (row: RichTableRow) => {
                const rec = records.find((r) => String(r.id) === row.id);
                if (rec) openEditPopup(rec);
              }
            },
            {
              label: "Toggle Publish / Draft",
              onClick: (row: RichTableRow) => {
                const rec = records.find((r) => String(r.id) === row.id);
                if (rec) void handleTogglePublish(rec);
              }
            },
            {
              label: "Delete assignment",
              icon: "delete" as const,
              tone: "danger" as const,
              onClick: (row: RichTableRow) => {
                const rec = records.find((r) => String(r.id) === row.id);
                if (rec) openDeletePopup(rec);
              }
            }
          ]
        : [])
    ],
    [canManage, records]
  );

  return (
    <div className="space-y-6">
      {/* Metric summary banner */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-border/70 shadow-sm">
              <CardContent className="flex items-center justify-between p-5">
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">{item.label}</p>
                  <p className={`text-[26px] font-semibold tracking-[-0.03em] ${item.valueClassName}`}>
                    {item.value}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconClassName}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Table Card */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 py-5">
          <div className="space-y-1">
            <CardTitle className="text-[18px] font-semibold">Assignment tracker</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              Manage course assignments, due dates, marks, and publishing status.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadAssignments()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {canManage && (
              <Button type="button" size="sm" onClick={openCreatePopup} className="gap-2">
                <Plus className="h-4 w-4" />
                Create assignment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {errorMessage ? (
            <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-[14px] text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          ) : (
            <RichDataTable
              columns={tableColumns}
              rows={rows}
              rowActions={rowActions}
            />
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Popup */}
      {(popupMode === "create" || popupMode === "edit") && (
        <Popup
          open={true}
          onOpenChange={(open) => !open && setPopupMode(null)}
          title={popupMode === "create" ? "Create New Assignment" : "Edit Assignment"}
          description={
            popupMode === "create"
              ? "Fill in assignment details to save as draft or publish."
              : "Update assignment configuration, course mapping, or due dates."
          }
        >
          <form onSubmit={popupMode === "create" ? handleCreateSubmit : handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Assignment Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Capstone Build Project"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  Associated Course <span className="text-destructive">*</span>
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Select a course...
                  </option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  Due Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">Total Marks</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="100"
                  value={form.totalMarks}
                  onChange={(e) => setForm({ ...form, totalMarks: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">Status</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Description / Instructions</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Write assignment requirements or guidelines..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/70">
              <Button type="button" variant="outline" onClick={() => setPopupMode(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? popupMode === "create"
                    ? "Creating..."
                    : "Saving..."
                  : popupMode === "create"
                  ? "Create Assignment"
                  : "Save Changes"}
              </Button>
            </div>
          </form>
        </Popup>
      )}

      {/* View Popup */}
      {popupMode === "view" && selectedRecord && (
        <Popup
          open={true}
          onOpenChange={(open) => !open && setPopupMode(null)}
          title={selectedRecord.title}
          description={`Assignment #${selectedRecord.id} • ${selectedRecord.course?.title || "No course"}`}
        >
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3 rounded-lg border border-border/70 bg-muted/30 p-4 text-[13px]">
              <div>
                <span className="text-muted-foreground block">Status</span>
                <span
                  className={`inline-block font-semibold mt-0.5 ${
                    selectedRecord.status === "PUBLISHED" ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {selectedRecord.status}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Due Date</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {formatDate(selectedRecord.dueDate)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Total Marks</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {selectedRecord.totalMarks} pts
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[14px] font-semibold text-foreground">Description & Instructions</h4>
              <p className="text-[14px] leading-relaxed text-muted-foreground whitespace-pre-wrap bg-background p-4 rounded-md border border-border/70">
                {selectedRecord.description || "No description provided for this assignment."}
              </p>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-border/70">
              <Button type="button" variant="outline" onClick={() => setPopupMode(null)}>
                Close
              </Button>
            </div>
          </div>
        </Popup>
      )}

      {/* Delete Popup */}
      {popupMode === "delete" && selectedRecord && (
        <Popup
          open={true}
          onOpenChange={(open) => !open && setPopupMode(null)}
          title="Delete Assignment"
          description="Are you sure you want to delete this assignment? This action cannot be undone."
        >
          <div className="space-y-5">
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-[14px]">
              <p className="font-semibold text-foreground">{selectedRecord.title}</p>
              <p className="text-muted-foreground text-[13px] mt-1">
                Course: {selectedRecord.course?.title || "N/A"} • Marks: {selectedRecord.totalMarks}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setPopupMode(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Delete Assignment"}
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
}

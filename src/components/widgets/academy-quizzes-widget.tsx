"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  CheckCircle,
  Clock,
  HelpCircle,
  ListChecks,
  Plus,
  RefreshCcw,
  Trash2,
  Edit2
} from "lucide-react";
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

interface QuizOption {
  id?: number;
  optionText: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id?: number;
  question: string;
  type: string;
  marks: number;
  explanation?: string;
  options: QuizOption[];
}

interface QuizRecord {
  id: number;
  title: string;
  description: string;
  courseId: number;
  totalMarks: number;
  passingMarks: number;
  dueDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  course?: CourseRecord;
  _count?: {
    questions: number;
  };
  questions?: QuizQuestion[];
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

export function AcademyQuizzesWidget({ config, page }: WidgetRendererProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [records, setRecords] = useState<QuizRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [popupMode, setPopupMode] = useState<"create" | "edit" | "view" | "delete" | "questions" | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<QuizRecord | null>(null);

  // Form for Quiz creation/editing
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    courseId: "",
    totalMarks: "0",
    passingMarks: "0",
    dueDate: "",
    status: "DRAFT"
  });

  // State for Managing Questions modal
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  // Form for single Question creation/editing
  const [questionForm, setQuestionForm] = useState({
    question: "",
    type: "multiple_choice",
    marks: "1",
    explanation: "",
    options: [
      { optionText: "", isCorrect: true },
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false }
    ]
  });

  const canManage = user?.role === "admin" || user?.role === "instructor";

  const loadQuizzes = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/quizzes", { cache: "no-store" });
      const result = (await response.json()) as ApiResponse<QuizRecord[]>;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "Failed to load quizzes");
      }

      setRecords(result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch quizzes";
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

    void loadQuizzes();
    void loadCourses();
  }, [accessToken]);

  const summary = useMemo(() => {
    const publishedCount = records.filter((r) => r.status === "PUBLISHED").length;
    const draftCount = records.filter((r) => r.status === "DRAFT").length;
    const totalQuestionsCount = records.reduce((sum, r) => sum + (r._count?.questions || 0), 0);

    return [
      {
        label: "Total quizzes",
        value: String(records.length),
        icon: HelpCircle,
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
        label: "Total questions",
        value: String(totalQuestionsCount),
        icon: ListChecks,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      }
    ];
  }, [records]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    try {
      const d = new Date(dateString);
      if (Number.isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  const handleTogglePublish = async (record: QuizRecord) => {
    if (!canManage) return;

    const previousStatus = record.status;
    const nextStatus = previousStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    setTogglingId(record.id);

    // Optimistically update status in UI
    setRecords((current) =>
      current.map((r) => (r.id === record.id ? { ...r, status: nextStatus } : r))
    );

    try {
      const response = await fetch(`/api/v1/quizzes/${record.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      const result = (await response.json()) as ApiResponse<QuizRecord>;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "Failed to update quiz status");
      }

      setRecords((current) =>
        current.map((r) => (r.id === record.id ? result.data! : r))
      );

      const statusLabel = result.data.status === "PUBLISHED" ? "Published" : "Draft";
      toast.success(`Quiz "${record.title}" status changed to ${statusLabel}`);
    } catch (err) {
      // Revert status on error
      setRecords((current) =>
        current.map((r) => (r.id === record.id ? { ...r, status: previousStatus } : r))
      );
      toast.error(err instanceof Error ? err.message : "Failed to update quiz status");
    } finally {
      setTogglingId(null);
    }
  };

  const tableColumns: RichTableColumn[] = useMemo(
    () => [
      { key: "quizId", header: "ID" },
      { key: "title", header: "Quiz title", type: "highlight" },
      { key: "course", header: "Course" },
      { key: "questionsCount", header: "Questions" },
      { key: "totalMarks", header: "Total marks" },
      { key: "passingMarks", header: "Passing marks" },
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
        quizId: `#QZ-${String(record.id).padStart(4, "0")}`,
        title: record.title,
        course: record.course?.title || "N/A",
        questionsCount: `${record._count?.questions ?? 0} Qs`,
        totalMarks: `${record.totalMarks} pts`,
        passingMarks: `${record.passingMarks} pts`,
        status: record.status === "PUBLISHED" ? "Published" : "Draft"
      })),
    [records]
  );

  const openCreatePopup = () => {
    setQuizForm({
      title: "",
      description: "",
      courseId: courses[0] ? String(courses[0].id) : "",
      totalMarks: "0",
      passingMarks: "0",
      dueDate: "",
      status: "DRAFT" // Default state MUST be DRAFT
    });
    setSelectedRecord(null);
    setPopupMode("create");
  };

  const openEditPopup = (record: QuizRecord) => {
    const formattedDueDate = record.dueDate
      ? new Date(record.dueDate).toISOString().split("T")[0]
      : "";

    setQuizForm({
      title: record.title,
      description: record.description || "",
      courseId: String(record.courseId),
      totalMarks: String(record.totalMarks),
      passingMarks: String(record.passingMarks),
      dueDate: formattedDueDate,
      status: record.status
    });
    setSelectedRecord(record);
    setPopupMode("edit");
  };

  const openViewPopup = async (record: QuizRecord) => {
    setSelectedRecord(record);
    setPopupMode("view");

    // Fetch full quiz details including questions
    try {
      const response = await fetch(`/api/v1/quizzes/${record.id}`);
      const result = (await response.json()) as ApiResponse<QuizRecord>;
      if (response.ok && result.success && result.data) {
        setSelectedRecord(result.data);
      }
    } catch {
      // Keep existing record view if fetch fails
    }
  };

  const openQuestionsModal = async (record: QuizRecord) => {
    setSelectedRecord(record);
    setPopupMode("questions");
    setIsLoadingQuestions(true);
    setEditingQuestionId(null);
    resetQuestionForm();

    try {
      const response = await fetch(`/api/v1/quizzes/${record.id}/questions`);
      const result = (await response.json()) as ApiResponse<QuizQuestion[]>;

      if (response.ok && result.success && result.data) {
        setQuizQuestions(result.data);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load quiz questions");
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const openDeletePopup = (record: QuizRecord) => {
    setSelectedRecord(record);
    setPopupMode("delete");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizForm.title.trim() || !quizForm.courseId) {
      toast.error("Please fill in required fields (title, course).");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizForm.title,
          description: quizForm.description,
          courseId: Number(quizForm.courseId),
          totalMarks: Number(quizForm.totalMarks || 0),
          passingMarks: Number(quizForm.passingMarks || 0),
          dueDate: quizForm.dueDate || null,
          status: quizForm.status // defaults to DRAFT
        })
      });

      const result = (await response.json()) as ApiResponse<QuizRecord>;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create quiz");
      }

      toast.success("Quiz created successfully as Draft");
      setPopupMode(null);
      void loadQuizzes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (!quizForm.title.trim() || !quizForm.courseId) {
      toast.error("Please fill in required fields (title, course).");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/quizzes/${selectedRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizForm.title,
          description: quizForm.description,
          courseId: Number(quizForm.courseId),
          totalMarks: Number(quizForm.totalMarks || 0),
          passingMarks: Number(quizForm.passingMarks || 0),
          dueDate: quizForm.dueDate || null,
          status: quizForm.status
        })
      });

      const result = (await response.json()) as ApiResponse<QuizRecord>;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update quiz");
      }

      toast.success("Quiz updated successfully");
      setPopupMode(null);
      void loadQuizzes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRecord) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/quizzes/${selectedRecord.id}`, {
        method: "DELETE"
      });

      const result = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete quiz");
      }

      toast.success("Quiz deleted successfully");
      setPopupMode(null);
      void loadQuizzes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Question Management Functions
  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQuestionForm({
      question: "",
      type: "multiple_choice",
      marks: "1",
      explanation: "",
      options: [
        { optionText: "", isCorrect: true },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false }
      ]
    });
  };

  const handleEditQuestion = (q: QuizQuestion) => {
    setEditingQuestionId(q.id || null);
    setQuestionForm({
      question: q.question,
      type: q.type || "multiple_choice",
      marks: String(q.marks),
      explanation: q.explanation || "",
      options: q.options.map((o) => ({
        optionText: o.optionText,
        isCorrect: o.isCorrect
      }))
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (!questionForm.question.trim()) {
      toast.error("Question text cannot be empty");
      return;
    }

    const validOptions = questionForm.options.filter((o) => o.optionText.trim());
    if (validOptions.length < 2) {
      toast.error("Please provide at least 2 options");
      return;
    }

    const hasCorrectOption = validOptions.some((o) => o.isCorrect);
    if (!hasCorrectOption) {
      toast.error("Please mark at least one correct option");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingQuestionId) {
        // Update question
        const response = await fetch(`/api/v1/quizzes/${selectedRecord.id}/questions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: editingQuestionId,
            question: questionForm.question,
            type: questionForm.type,
            marks: Number(questionForm.marks),
            explanation: questionForm.explanation,
            options: validOptions
          })
        });

        const result = (await response.json()) as ApiResponse<QuizQuestion>;

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to update question");
        }

        toast.success("Question updated successfully");
      } else {
        // Add new question
        const response = await fetch(`/api/v1/quizzes/${selectedRecord.id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: questionForm.question,
            type: questionForm.type,
            marks: Number(questionForm.marks),
            explanation: questionForm.explanation,
            options: validOptions
          })
        });

        const result = (await response.json()) as ApiResponse<QuizQuestion>;

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to add question");
        }

        toast.success("Question added successfully");
      }

      resetQuestionForm();
      // Reload questions
      const res = await fetch(`/api/v1/quizzes/${selectedRecord.id}/questions`);
      const resData = (await res.json()) as ApiResponse<QuizQuestion[]>;
      if (res.ok && resData.data) {
        setQuizQuestions(resData.data);
      }
      void loadQuizzes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save question");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!selectedRecord) return;

    try {
      const response = await fetch(
        `/api/v1/quizzes/${selectedRecord.id}/questions?questionId=${questionId}`,
        { method: "DELETE" }
      );

      const result = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete question");
      }

      toast.success("Question deleted");
      setQuizQuestions((current) => current.filter((q) => q.id !== questionId));
      void loadQuizzes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete question");
    }
  };

  const rowActions: RichTableAction[] = useMemo(
    () => [
      {
        label: "View details",
        icon: "view",
        onClick: (row) => {
          const rec = records.find((r) => String(r.id) === row.id);
          if (rec) void openViewPopup(rec);
        }
      },
      ...(canManage
        ? [
            {
              label: "Manage questions",
              onClick: (row: RichTableRow) => {
                const rec = records.find((r) => String(r.id) === row.id);
                if (rec) void openQuestionsModal(rec);
              }
            },
            {
              label: "Edit quiz",
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
              label: "Delete quiz",
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
      {/* Metric Summary Cards */}
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
            <CardTitle className="text-[18px] font-semibold">Quiz tracker</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              Manage online quizzes, multiple-choice questions, passing marks, and status.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadQuizzes()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {canManage && (
              <Button type="button" size="sm" onClick={openCreatePopup} className="gap-2">
                <Plus className="h-4 w-4" />
                Create quiz
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

      {/* Create / Edit Quiz Popup */}
      {(popupMode === "create" || popupMode === "edit") && (
        <Popup
          open={true}
          onOpenChange={(open) => !open && setPopupMode(null)}
          title={popupMode === "create" ? "Create New Quiz" : "Edit Quiz"}
          description={
            popupMode === "create"
              ? "Configure quiz settings and save as draft or published."
              : "Update quiz details, marks requirement, or assigned course."
          }
        >
          <form onSubmit={popupMode === "create" ? handleCreateSubmit : handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Quiz Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. JavaScript Async & Promises Checkpoint"
                value={quizForm.title}
                onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
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
                  value={quizForm.courseId}
                  onChange={(e) => setQuizForm({ ...quizForm, courseId: e.target.value })}
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
                <label className="text-[13px] font-medium text-foreground">Due Date (Optional)</label>
                <Input
                  type="date"
                  value={quizForm.dueDate}
                  onChange={(e) => setQuizForm({ ...quizForm, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">Total Marks</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="20"
                  value={quizForm.totalMarks}
                  onChange={(e) => setQuizForm({ ...quizForm, totalMarks: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">Passing Marks</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="14"
                  value={quizForm.passingMarks}
                  onChange={(e) => setQuizForm({ ...quizForm, passingMarks: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">Status</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={quizForm.status}
                  onChange={(e) => setQuizForm({ ...quizForm, status: e.target.value })}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Description & Instructions</label>
              <textarea
                className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Write quiz instructions, time limit, or guidelines..."
                value={quizForm.description}
                onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
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
                  ? "Create Quiz"
                  : "Save Changes"}
              </Button>
            </div>
          </form>
        </Popup>
      )}

      {/* View Quiz Popup */}
      {popupMode === "view" && selectedRecord && (
        <Popup
          open={true}
          onOpenChange={(open) => !open && setPopupMode(null)}
          title={selectedRecord.title}
          description={`Quiz #${selectedRecord.id} • ${selectedRecord.course?.title || "No course"}`}
        >
          <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-4 rounded-lg border border-border/70 bg-muted/30 p-4 text-[13px]">
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
                <span className="text-muted-foreground block">Passing Marks</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {selectedRecord.passingMarks} / {selectedRecord.totalMarks} pts
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Due Date</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {formatDate(selectedRecord.dueDate)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Questions</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {selectedRecord.questions?.length ?? selectedRecord._count?.questions ?? 0} Total
                </span>
              </div>
            </div>

            {selectedRecord.description && (
              <div className="space-y-1.5">
                <h4 className="text-[13px] font-semibold text-foreground">Description</h4>
                <p className="text-[13px] text-muted-foreground bg-background p-3 rounded-md border border-border/70">
                  {selectedRecord.description}
                </p>
              </div>
            )}

            {/* Quiz Questions List */}
            <div className="space-y-3">
              <h4 className="text-[14px] font-semibold text-foreground flex items-center justify-between">
                <span>Quiz Questions</span>
                <span className="text-[12px] font-normal text-muted-foreground">
                  {selectedRecord.questions?.length || 0} questions listed
                </span>
              </h4>

              {(!selectedRecord.questions || selectedRecord.questions.length === 0) ? (
                <div className="p-4 text-center rounded-md border border-dashed text-muted-foreground text-[13px]">
                  No questions added to this quiz yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedRecord.questions.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="rounded-md border border-border/70 p-4 space-y-2 bg-background">
                      <div className="flex items-start justify-between">
                        <p className="text-[14px] font-semibold text-foreground">
                          {qIdx + 1}. {q.question}
                        </p>
                        <span className="text-[12px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {q.marks} {q.marks === 1 ? "pt" : "pts"}
                        </span>
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div className="grid gap-1.5 pl-4 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={opt.id || oIdx}
                              className={cn(
                                "flex items-center gap-2 text-[13px] px-3 py-1.5 rounded-md border",
                                opt.isCorrect
                                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium"
                                  : "bg-muted/20 border-border/40 text-muted-foreground"
                              )}
                            >
                              <span className="w-4 text-center text-[11px] font-bold">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <span>{opt.optionText}</span>
                              {opt.isCorrect && (
                                <span className="ml-auto text-[11px] bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                                  Correct Answer
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/70">
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPopupMode(null);
                    void openQuestionsModal(selectedRecord);
                  }}
                >
                  Manage Questions
                </Button>
              ) : <div />}
              <Button type="button" variant="outline" onClick={() => setPopupMode(null)}>
                Close
              </Button>
            </div>
          </div>
        </Popup>
      )}

      {/* Manage Questions Modal */}
      {popupMode === "questions" && selectedRecord && (
        <Popup
          open={true}
          onOpenChange={(open) => !open && setPopupMode(null)}
          title={`Manage Questions - ${selectedRecord.title}`}
          description={`Add, edit, or remove questions for this quiz.`}
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* List of existing questions */}
            <div className="space-y-3">
              <h4 className="text-[14px] font-semibold text-foreground flex items-center justify-between">
                <span>Existing Questions ({quizQuestions.length})</span>
                {editingQuestionId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetQuestionForm}
                    className="text-[12px] h-7"
                  >
                    + Add New Question
                  </Button>
                )}
              </h4>

              {isLoadingQuestions ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading quiz questions...
                </div>
              ) : quizQuestions.length === 0 ? (
                <div className="p-4 text-center rounded-md border border-dashed text-muted-foreground text-[13px]">
                  No questions created yet. Use the form below to add your first question!
                </div>
              ) : (
                <div className="space-y-3">
                  {quizQuestions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className={cn(
                        "rounded-md border p-4 space-y-2 transition-colors",
                        editingQuestionId === q.id
                          ? "border-primary bg-primary/5"
                          : "border-border/70 bg-background"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-[14px] font-semibold text-foreground">
                            {idx + 1}. {q.question}
                          </p>
                          <p className="text-[12px] text-muted-foreground">
                            Marks: {q.marks} • Options: {q.options?.length || 0}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditQuestion(q)}
                            className="h-8 w-8 p-0"
                            title="Edit question"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => q.id && handleDeleteQuestion(q.id)}
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Delete question"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div className="grid gap-1 pl-3 text-[13px]">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={cn(
                                "flex items-center gap-2",
                                opt.isCorrect ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"
                              )}
                            >
                              <span>{opt.isCorrect ? "✓" : "•"}</span>
                              <span>{opt.optionText}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add / Edit Question Form */}
            <form onSubmit={handleSaveQuestion} className="space-y-4 pt-4 border-t border-border/70">
              <h4 className="text-[14px] font-semibold text-foreground">
                {editingQuestionId ? "Edit Question" : "Add New Question"}
              </h4>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  Question Text <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. What is the return value of Promise.resolve(42)?"
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Marks</label>
                  <Input
                    type="number"
                    min="1"
                    value={questionForm.marks}
                    onChange={(e) => setQuestionForm({ ...questionForm, marks: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-foreground">Explanation (Optional)</label>
                  <Input
                    placeholder="Brief explanation for correct answer..."
                    value={questionForm.explanation}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  />
                </div>
              </div>

              {/* Options Section */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground block">
                  Options (Select correct option radio)
                </label>

                <div className="space-y-2">
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={opt.isCorrect}
                        onChange={() => {
                          setQuestionForm({
                            ...questionForm,
                            options: questionForm.options.map((o, oIdx) => ({
                              ...o,
                              isCorrect: oIdx === idx
                            }))
                          });
                        }}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        title="Mark as correct answer"
                      />
                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        value={opt.optionText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestionForm({
                            ...questionForm,
                            options: questionForm.options.map((o, oIdx) =>
                              oIdx === idx ? { ...o, optionText: val } : o
                            )
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                {editingQuestionId && (
                  <Button type="button" variant="outline" onClick={resetQuestionForm}>
                    Cancel Edit
                  </Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving Question..."
                    : editingQuestionId
                    ? "Update Question"
                    : "Add Question to Quiz"}
                </Button>
              </div>
            </form>

            <div className="flex items-center justify-end pt-4 border-t border-border/70">
              <Button type="button" variant="outline" onClick={() => setPopupMode(null)}>
                Done
              </Button>
            </div>
          </div>
        </Popup>
      )}

      {/* Delete Quiz Popup */}
      {popupMode === "delete" && selectedRecord && (
        <Popup
          open={true}
          onOpenChange={(open) => !open && setPopupMode(null)}
          title="Delete Quiz"
          description="Are you sure you want to delete this quiz? All associated questions will also be removed."
        >
          <div className="space-y-5">
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-[14px]">
              <p className="font-semibold text-foreground">{selectedRecord.title}</p>
              <p className="text-muted-foreground text-[13px] mt-1">
                Course: {selectedRecord.course?.title || "N/A"} • Total Marks: {selectedRecord.totalMarks}
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
                {isSubmitting ? "Deleting..." : "Delete Quiz"}
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
}

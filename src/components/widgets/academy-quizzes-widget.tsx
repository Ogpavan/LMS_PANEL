"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  CheckCircle,
  Clock,
  ExternalLink,
  HelpCircle,
  ListChecks,
  Plus,
  PlusCircle,
  ChevronUp,
  ChevronDown,
  RefreshCcw,
  Trash2,
  Edit2,
  Globe,
  Share2,
  BarChart2,
  Unplug
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
  googleItemId?: string | null;
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
  googleFormId?: string | null;
  googleFormUrl?: string | null;
  googleResponderUri?: string | null;
  googleIntegrationStatus?: string | null;
  googleLastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  course?: CourseRecord;
  _count?: {
    questions: number;
  };
  questions?: QuizQuestion[];
}

interface QuizAttemptAnswer {
  id: number;
  questionId?: number | null;
  googleItemId?: string | null;
  selectedAnswer: string;
  marksAwarded: number;
  question?: {
    id: number;
    question: string;
    marks: number;
  } | null;
}

interface QuizAttemptRecord {
  id: number;
  quizId: number;
  studentId?: number | null;
  studentEmail: string;
  studentName: string;
  googleResponseId?: string | null;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  status: string;
  source: string;
  submittedAt: string;
  syncedAt: string;
  student?: {
    id: number;
    name: string;
    email: string;
  } | null;
  answers?: QuizAttemptAnswer[];
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
  const [googleConnected, setGoogleConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [syncingQuizId, setSyncingQuizId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [popupMode, setPopupMode] = useState<
    "create" | "edit" | "view" | "delete" | "questions" | "results" | null
  >(null);
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

  // State for Questions modal
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  // State for Unified Edit Quiz Modal questions
  const [editQuestions, setEditQuestions] = useState<QuizQuestion[]>([]);
  const [isLoadingEditQuestions, setIsLoadingEditQuestions] = useState(false);

  const calculatedTotalMarks = useMemo(() => {
    return editQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  }, [editQuestions]);

  const handleEditQuestionTextChange = (qIndex: number, text: string) => {
    setEditQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, question: text } : q))
    );
  };

  const handleEditQuestionMarksChange = (qIndex: number, marks: number) => {
    setEditQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, marks: Math.max(1, marks) } : q))
    );
  };

  const handleEditQuestionExplanationChange = (qIndex: number, explanation: string) => {
    setEditQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, explanation } : q))
    );
  };

  const handleEditAddOption = (qIndex: number) => {
    setEditQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qIndex
          ? {
              ...q,
              options: [...q.options, { optionText: "", isCorrect: false }]
            }
          : q
      )
    );
  };

  const handleEditRemoveOption = (qIndex: number, optIndex: number) => {
    setEditQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        if (q.options.length <= 2) {
          toast.error("Questions must have at least 2 options");
          return q;
        }
        const newOpts = q.options.filter((_, oIdx) => oIdx !== optIndex);
        if (!newOpts.some((o) => o.isCorrect) && newOpts[0]) {
          newOpts[0].isCorrect = true;
        }
        return { ...q, options: newOpts };
      })
    );
  };

  const handleEditOptionTextChange = (qIndex: number, optIndex: number, text: string) => {
    setEditQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const newOpts = q.options.map((o, oIdx) =>
          oIdx === optIndex ? { ...o, optionText: text } : o
        );
        return { ...q, options: newOpts };
      })
    );
  };

  const handleEditOptionCorrectChange = (qIndex: number, optIndex: number) => {
    setEditQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const newOpts = q.options.map((o, oIdx) => ({
          ...o,
          isCorrect: oIdx === optIndex
        }));
        return { ...q, options: newOpts };
      })
    );
  };

  const handleEditAddQuestion = () => {
    setEditQuestions((prev) => [
      ...prev,
      {
        question: "",
        type: "multiple_choice",
        marks: 1,
        options: [
          { optionText: "", isCorrect: true },
          { optionText: "", isCorrect: false },
          { optionText: "", isCorrect: false },
          { optionText: "", isCorrect: false }
        ]
      }
    ]);
  };

  const handleEditRemoveQuestion = (qIndex: number) => {
    setEditQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleEditMoveQuestion = (qIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? qIndex - 1 : qIndex + 1;
    if (targetIndex < 0 || targetIndex >= editQuestions.length) return;
    setEditQuestions((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(qIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  };

  // State for Results modal
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRecord[]>([]);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttemptRecord | null>(null);

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

  const checkGoogleConnection = async () => {
    try {
      const response = await fetch("/api/v1/google/oauth/status");
      const result = (await response.json()) as ApiResponse<{ connected: boolean }>;
      if (response.ok && result.success && result.data) {
        setGoogleConnected(Boolean(result.data.connected));
      }
    } catch {
      // Ignore failures
    }
  };

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
      // Ignore
    }
  };

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadQuizzes();
    void loadCourses();
    void checkGoogleConnection();

    // Check query params for Google OAuth status redirect messages
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("googleConnected") === "true") {
        setGoogleConnected(true);
        toast.success("Google account successfully connected!");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get("googleError")) {
        toast.error(`Google Connection Error: ${params.get("googleError")}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [accessToken]);

  const summary = useMemo(() => {
    const publishedCount = records.filter((r) => r.status === "PUBLISHED").length;
    const draftCount = records.filter((r) => r.status === "DRAFT").length;
    const googleSyncedCount = records.filter((r) => r.googleFormId).length;

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
        label: "Google Quizzes",
        value: String(googleSyncedCount),
        icon: Globe,
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

  const handleConnectGoogle = (quizId?: number) => {
    const redirectUrl = quizId
      ? `/api/v1/google/oauth/connect?quizId=${quizId}`
      : `/api/v1/google/oauth/connect`;
    window.location.href = redirectUrl;
  };

  const handleDisconnectGoogle = async () => {
    try {
      const response = await fetch("/api/v1/google/oauth/disconnect", { method: "POST" });
      if (response.ok) {
        setGoogleConnected(false);
        toast.success("Google account disconnected.");
      }
    } catch {
      toast.error("Failed to disconnect Google account");
    }
  };

  const handleCreateOrSyncGoogleQuiz = async (record: QuizRecord) => {
    if (!canManage) return;

    if (!googleConnected) {
      handleConnectGoogle(record.id);
      return;
    }

    setSyncingQuizId(record.id);

    try {
      const response = await fetch(`/api/v1/quizzes/${record.id}/google`, {
        method: "POST"
      });

      const result = (await response.json()) as ApiResponse<QuizRecord>;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "Failed to create Google Quiz");
      }

      toast.success(
        record.googleFormId
          ? `Google Form Quiz updated & synced!`
          : `Google Form Quiz created successfully!`
      );

      void loadQuizzes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect to Google Forms API");
    } finally {
      setSyncingQuizId(null);
    }
  };

  const handleSyncResponses = async (record: QuizRecord) => {
    if (!googleConnected) {
      handleConnectGoogle(record.id);
      return;
    }

    setSyncingQuizId(record.id);

    try {
      const response = await fetch(`/api/v1/quizzes/${record.id}/google/sync`, {
        method: "POST"
      });

      const result = (await response.json()) as ApiResponse<{
        synced: number;
        created: number;
        updated: number;
        failed: number;
        unmatched: number;
      }>;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "Failed to sync Google responses");
      }

      const d = result.data;
      toast.success(
        `Responses synced: ${d.synced} total (${d.created} created, ${d.updated} updated${
          d.unmatched > 0 ? `, ${d.unmatched} unmatched` : ""
        })`
      );

      void loadQuizzes();
      if (selectedRecord?.id === record.id && popupMode === "results") {
        void openResultsModal(record);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync responses");
    } finally {
      setSyncingQuizId(null);
    }
  };

  const handleTogglePublish = async (record: QuizRecord) => {
    if (!canManage) return;

    const previousStatus = record.status;
    const nextStatus = previousStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    setTogglingId(record.id);

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
      { key: "totalMarks", header: "Marks" },
      {
        key: "googleStatus",
        header: "Google Form",
        render: (row: RichTableRow) => {
          const record = records.find((r) => String(r.id) === row.id);
          if (!record) return "N/A";

          const hasGoogleForm = Boolean(record.googleFormId);
          const isSyncing = syncingQuizId === record.id;

          return (
            <div className="flex items-center gap-2">
              {hasGoogleForm ? (
                <>
                  <a
                    href={record.googleResponderUri || record.googleFormUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 hover:underline"
                    title="Open Google Quiz Form"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Open Form
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSyncing}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleCreateOrSyncGoogleQuiz(record);
                  }}
                  className="h-7 text-[12px] gap-1 px-2.5"
                >
                  <Share2 className="h-3.5 w-3.5 text-blue-500" />
                  Create Google Quiz
                </Button>
              )}
            </div>
          );
        }
      },
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
    [canManage, googleConnected, records, syncingQuizId, togglingId]
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

  const openEditPopup = async (record: QuizRecord) => {
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
    setEditQuestions(record.questions || []);
    setPopupMode("edit");
    setIsLoadingEditQuestions(true);

    try {
      const response = await fetch(`/api/v1/quizzes/${record.id}`);
      const result = (await response.json()) as ApiResponse<QuizRecord>;
      if (response.ok && result.success && result.data) {
        setSelectedRecord(result.data);
        if (result.data.questions) {
          setEditQuestions(result.data.questions);
        }
      }
    } catch {
      // Keep initial record questions
    } finally {
      setIsLoadingEditQuestions(false);
    }
  };

  const openViewPopup = async (record: QuizRecord) => {
    setSelectedRecord(record);
    setPopupMode("view");

    try {
      const response = await fetch(`/api/v1/quizzes/${record.id}`);
      const result = (await response.json()) as ApiResponse<QuizRecord>;
      if (response.ok && result.success && result.data) {
        setSelectedRecord(result.data);
      }
    } catch {
      // Keep existing record view
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

  const openResultsModal = async (record: QuizRecord) => {
    setSelectedRecord(record);
    setPopupMode("results");
    setIsLoadingAttempts(true);
    setSelectedAttempt(null);

    try {
      const response = await fetch(`/api/v1/quizzes/${record.id}/results`);
      const result = (await response.json()) as ApiResponse<QuizAttemptRecord[]>;

      if (response.ok && result.success && result.data) {
        setQuizAttempts(result.data);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load quiz attempts");
    } finally {
      setIsLoadingAttempts(false);
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

    // Validate editQuestions
    for (let i = 0; i < editQuestions.length; i++) {
      const q = editQuestions[i];
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} text cannot be empty.`);
        return;
      }
      const validOpts = q.options.filter((o) => o.optionText.trim());
      if (validOpts.length < 2) {
        toast.error(`Question ${i + 1} must have at least 2 non-empty options.`);
        return;
      }
      if (!validOpts.some((o) => o.isCorrect)) {
        toast.error(`Question ${i + 1} must have a correct option selected.`);
        return;
      }
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
          passingMarks: Number(quizForm.passingMarks || 0),
          dueDate: quizForm.dueDate || null,
          status: quizForm.status,
          questions: editQuestions.map((q) => ({
            id: q.id,
            question: q.question,
            type: q.type || "multiple_choice",
            marks: Number(q.marks || 1),
            explanation: q.explanation || "",
            options: q.options
              .filter((o) => o.optionText.trim())
              .map((o) => ({
                id: o.id,
                optionText: o.optionText,
                isCorrect: o.isCorrect
              }))
          }))
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
  const handleAddOption = () => {
    setQuestionForm((prev) => ({
      ...prev,
      options: [...prev.options, { optionText: "", isCorrect: false }]
    }));
  };

  const handleRemoveOption = (optIndex: number) => {
    if (questionForm.options.length <= 2) {
      toast.error("Questions must have at least 2 options");
      return;
    }
    setQuestionForm((prev) => {
      const newOptions = prev.options.filter((_, idx) => idx !== optIndex);
      if (!newOptions.some((o) => o.isCorrect) && newOptions[0]) {
        newOptions[0].isCorrect = true;
      }
      return { ...prev, options: newOptions };
    });
  };

  const handleReorderQuestion = async (index: number, direction: "up" | "down") => {
    if (!selectedRecord || quizQuestions.length < 2) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= quizQuestions.length) return;

    const updated = [...quizQuestions];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    setQuizQuestions(updated);

    try {
      const questionIds = updated.map((q) => q.id).filter((id): id is number => typeof id === "number");
      const response = await fetch(`/api/v1/quizzes/${selectedRecord.id}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds })
      });
      const result = (await response.json()) as ApiResponse<QuizQuestion[]>;
      if (response.ok && result.data) {
        setQuizQuestions(result.data);
      }
    } catch {
      toast.error("Failed to save question order");
    }
  };

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
        label: "View quiz details",
        icon: "view",
        onClick: (row) => {
          const rec = records.find((r) => String(r.id) === row.id);
          if (rec) void openViewPopup(rec);
        }
      },
      {
        label: "View responses / results",
        onClick: (row: RichTableRow) => {
          const rec = records.find((r) => String(r.id) === row.id);
          if (rec) void openResultsModal(rec);
        }
      },
      ...(canManage
        ? [
            {
              label: "Create / Sync Google Quiz",
              onClick: (row: RichTableRow) => {
                const rec = records.find((r) => String(r.id) === row.id);
                if (rec) void handleCreateOrSyncGoogleQuiz(rec);
              }
            },
            {
              label: "Sync Google Responses",
              onClick: (row: RichTableRow) => {
                const rec = records.find((r) => String(r.id) === row.id);
                if (rec) void handleSyncResponses(rec);
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
    [canManage, googleConnected, records]
  );

  return (
    <div className="space-y-6">
      {/* Google Integration Banner */}
      <div className="flex items-center justify-between rounded-lg border border-border/70 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] font-semibold text-foreground">Google Forms Integration</h4>
              <span
                className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                  googleConnected
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300"
                )}
              >
                {googleConnected ? "Connected" : "Not Connected"}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {googleConnected
                ? "Your Google account is linked. LMS quizzes can be exported to Google Forms and responses synced into LMS DB."
                : "Connect your Google account to automatically convert LMS quizzes into interactive Google Forms."}
            </p>
          </div>
        </div>

        <div>
          {googleConnected ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDisconnectGoogle}
              className="gap-2 text-[13px] text-rose-600 hover:text-rose-700"
            >
              <Unplug className="h-4 w-4" />
              Disconnect
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => handleConnectGoogle()}
              className="gap-2 text-[13px] bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Globe className="h-4 w-4" />
              Connect Google Account
            </Button>
          )}
        </div>
      </div>

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
              Manage LMS quizzes, questions, options, Google Form integration, and student results.
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

      {/* Create Quiz Popup */}
      {popupMode === "create" && (
        <Popup
          open={true}
          onOpenChange={(open) => !open && setPopupMode(null)}
          title="Create New Quiz"
          description="Configure quiz settings and save as draft or published."
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
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
                {isSubmitting ? "Creating..." : "Create Quiz"}
              </Button>
            </div>
          </form>
        </Popup>
      )}

      {/* Unified Edit Quiz Popup */}
      {popupMode === "edit" && selectedRecord && (
        <Popup
          open={true}
          onOpenChange={(open) => !open && setPopupMode(null)}
          title={`Edit Quiz - ${selectedRecord.title}`}
          description="Update quiz details, marks requirement, questions, options, and Google Quiz integration."
        >
          <form onSubmit={handleEditSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Google Integration Banner & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 p-3.5 text-[13px]">
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <span className="font-semibold text-foreground">Google Quiz Integration</span>
                  <span className="text-muted-foreground text-[12px] block">
                    {selectedRecord.googleFormId
                      ? `Linked Form ID: ${selectedRecord.googleFormId}`
                      : "Not connected to Google Forms"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedRecord.googleFormId ? (
                  <>
                    <a
                      href={selectedRecord.googleResponderUri || selectedRecord.googleFormUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800 hover:underline"
                    >
                      Open Form <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={syncingQuizId === selectedRecord.id}
                      onClick={() => void handleCreateOrSyncGoogleQuiz(selectedRecord)}
                      className="h-8 text-[12px] gap-1"
                    >
                      <RefreshCcw className={cn("h-3.5 w-3.5", syncingQuizId === selectedRecord.id && "animate-spin")} />
                      Sync to Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={syncingQuizId === selectedRecord.id}
                      onClick={() => void handleSyncResponses(selectedRecord)}
                      className="h-8 text-[12px] gap-1"
                    >
                      Sync Responses
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={syncingQuizId === selectedRecord.id}
                    onClick={() => void handleCreateOrSyncGoogleQuiz(selectedRecord)}
                    className="h-8 text-[12px] gap-1"
                  >
                    <Share2 className="h-3.5 w-3.5 text-blue-500" />
                    Create Google Quiz
                  </Button>
                )}
              </div>
            </div>

            {/* Quiz Details Section */}
            <div className="space-y-4">
              <h3 className="text-[14px] font-semibold text-foreground border-b border-border/70 pb-2">
                Quiz Details
              </h3>

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
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-medium text-foreground">Total Marks Pool</label>
                    <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Auto</span>
                  </div>
                  <Input
                    type="number"
                    value={calculatedTotalMarks}
                    readOnly
                    className="bg-muted/50 font-semibold cursor-not-allowed"
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
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Write quiz instructions, time limit, or guidelines..."
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                />
              </div>
            </div>

            {/* Questions Manager Section */}
            <div className="space-y-4 pt-4 border-t border-border/70">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-foreground">
                    Questions ({editQuestions.length})
                  </h3>
                  <p className="text-[12px] text-muted-foreground">
                    Manage question text, answer options, marks, and ordering.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleEditAddQuestion}
                  className="gap-1.5 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  <PlusCircle className="h-4 w-4" />
                  + Add Question
                </Button>
              </div>

              {isLoadingEditQuestions ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading questions...</div>
              ) : editQuestions.length === 0 ? (
                <div className="p-6 text-center rounded-lg border border-dashed text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground text-[14px]">No questions added yet</p>
                  <p className="text-[13px]">
                    Click the <span className="font-semibold text-primary">+ Add Question</span> button to create Question 1.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEditAddQuestion}
                    className="gap-1.5 text-[13px] mt-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add First Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {editQuestions.map((q, qIdx) => (
                    <div
                      key={q.id ? `q-${q.id}` : `q-temp-${qIdx}`}
                      className="rounded-lg border border-border/80 bg-background p-4 space-y-3.5 shadow-sm"
                    >
                      {/* Question Header */}
                      <div className="flex items-center justify-between gap-3 bg-muted/30 p-2.5 rounded-md border border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                            Question {qIdx + 1}
                          </span>
                          <span className="text-[12px] text-muted-foreground">
                            {q.options.length} options
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={qIdx === 0}
                            onClick={() => handleEditMoveQuestion(qIdx, "up")}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            title="Move Question Up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={qIdx === editQuestions.length - 1}
                            onClick={() => handleEditMoveQuestion(qIdx, "down")}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            title="Move Question Down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <div className="h-4 w-[1px] bg-border/70 mx-1" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRemoveQuestion(qIdx)}
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Delete question"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Question Fields */}
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-semibold text-foreground">
                            Question Text <span className="text-destructive">*</span>
                          </label>
                          <Input
                            placeholder="e.g. What is the return value of Promise.resolve(42)?"
                            value={q.question}
                            onChange={(e) => handleEditQuestionTextChange(qIdx, e.target.value)}
                            required
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-foreground">Question Marks</label>
                            <Input
                              type="number"
                              min="1"
                              value={q.marks}
                              onChange={(e) => handleEditQuestionMarksChange(qIdx, Number(e.target.value))}
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-foreground">Explanation (Optional)</label>
                            <Input
                              placeholder="Brief explanation for correct answer..."
                              value={q.explanation || ""}
                              onChange={(e) => handleEditQuestionExplanationChange(qIdx, e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Options List */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[12px] font-semibold text-foreground block">
                              Answer Options (Select radio for correct answer)
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAddOption(qIdx)}
                              className="text-[12px] h-6 px-2 gap-1 text-primary hover:text-primary/80 font-medium"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              Add Option
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {q.options.map((opt, oIdx) => (
                              <div key={opt.id ? `opt-${opt.id}` : `opt-temp-${oIdx}`} className="flex items-center gap-2.5">
                                <input
                                  type="radio"
                                  name={`correctOption-${qIdx}`}
                                  checked={opt.isCorrect}
                                  onChange={() => handleEditOptionCorrectChange(qIdx, oIdx)}
                                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                                  title="Mark as correct answer"
                                />
                                <Input
                                  placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                  value={opt.optionText}
                                  onChange={(e) => handleEditOptionTextChange(qIdx, oIdx, e.target.value)}
                                  className={cn(
                                    opt.isCorrect && "border-emerald-500 bg-emerald-50/20 font-medium text-emerald-900 dark:text-emerald-200"
                                  )}
                                />
                                {q.options.length > 2 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditRemoveOption(qIdx, oIdx)}
                                    className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                    title="Remove option"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Bottom Add Question Button */}
                  <div className="pt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleEditAddQuestion}
                      className="gap-2 text-[13px] border-dashed border-primary/50 text-primary hover:bg-primary/5"
                    >
                      <PlusCircle className="h-4 w-4" />
                      + Add Another Question
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/70 sticky bottom-0 bg-background py-2">
              <Button type="button" variant="outline" onClick={() => setPopupMode(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                {isSubmitting ? "Saving..." : "Save Changes"}
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
                <span className="text-muted-foreground block">Google Form</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {selectedRecord.googleFormId ? (
                    <a
                      href={selectedRecord.googleResponderUri || selectedRecord.googleFormUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      Created <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "Not Created"
                  )}
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
                          Question {qIdx + 1}: {q.question}
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
              <div className="flex items-center gap-2">
                {canManage && (
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
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPopupMode(null);
                    void openResultsModal(selectedRecord);
                  }}
                  className="gap-1.5"
                >
                  <BarChart2 className="h-4 w-4" />
                  View Results
                </Button>
              </div>

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
          description="Add, edit, or remove questions for this quiz."
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* List of existing questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[14px] font-semibold text-foreground">
                  Existing Questions ({quizQuestions.length})
                </h4>
                <Button
                  type="button"
                  size="sm"
                  onClick={resetQuestionForm}
                  className="gap-1.5 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Question
                </Button>
              </div>

              {isLoadingQuestions ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading quiz questions...
                </div>
              ) : quizQuestions.length === 0 ? (
                <div className="p-6 text-center rounded-md border border-dashed text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground text-[14px]">No questions added yet</p>
                  <p className="text-[13px]">
                    Click the <span className="font-semibold text-primary">+ Add Question</span> button above or use the form below to create Question 1.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quizQuestions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className={cn(
                        "rounded-md border p-4 space-y-2 transition-colors",
                        editingQuestionId === q.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/70 bg-background"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-[14px] font-semibold text-foreground">
                            Question {idx + 1}: {q.question}
                          </p>
                          <p className="text-[12px] text-muted-foreground">
                            Marks: <span className="font-semibold text-foreground">{q.marks}</span> • Options: {q.options?.length || 0}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => void handleReorderQuestion(idx, "up")}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            title="Move Question Up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === quizQuestions.length - 1}
                            onClick={() => void handleReorderQuestion(idx, "down")}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            title="Move Question Down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <div className="h-4 w-[1px] bg-border/70 mx-1" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditQuestion(q)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
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
                        <div className="grid gap-1 pl-3 text-[13px] pt-1">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={cn(
                                "flex items-center gap-2",
                                opt.isCorrect
                                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                  : "text-muted-foreground"
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
              <div className="flex items-center justify-between">
                <h4 className="text-[14px] font-semibold text-foreground">
                  {editingQuestionId ? `Edit Question` : `Question ${quizQuestions.length + 1}`}
                </h4>
                {editingQuestionId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetQuestionForm}
                    className="text-[12px] h-7 text-muted-foreground hover:text-foreground"
                  >
                    Cancel Editing
                  </Button>
                )}
              </div>

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
                  <label className="text-[13px] font-medium text-foreground">Question Marks</label>
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
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-foreground block">
                    Answer Options (Select radio to set correct answer)
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddOption}
                    className="text-[12px] h-7 gap-1 text-primary hover:text-primary/80 font-medium"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Add Option
                  </Button>
                </div>

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
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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
                      {questionForm.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(idx)}
                          className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          title="Remove option"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {isSubmitting
                    ? "Saving Question..."
                    : editingQuestionId
                    ? "Update Question"
                    : `Add Question to Quiz`}
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

      {/* View Results / Student Attempts Modal */}
      {popupMode === "results" && selectedRecord && (
        <Popup
          open={true}
          onOpenChange={(open) => !open && setPopupMode(null)}
          title={`Quiz Results - ${selectedRecord.title}`}
          description="View student submissions, scores, pass/fail status, and sync Google Form responses."
        >
          <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between bg-muted/40 p-3.5 rounded-lg border border-border/70">
              <div>
                <p className="text-[13px] font-medium text-foreground">
                  Google Form Responses Sync
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Last synced:{" "}
                  {selectedRecord.googleLastSyncedAt
                    ? new Date(selectedRecord.googleLastSyncedAt).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSyncResponses(selectedRecord)}
                disabled={syncingQuizId === selectedRecord.id}
                className="gap-2 text-[13px]"
              >
                <RefreshCcw
                  className={cn(
                    "h-3.5 w-3.5",
                    syncingQuizId === selectedRecord.id ? "animate-spin" : ""
                  )}
                />
                Sync Google Responses
              </Button>
            </div>

            {isLoadingAttempts ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Loading quiz attempt results...
              </div>
            ) : quizAttempts.length === 0 ? (
              <div className="p-8 text-center rounded-lg border border-dashed text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground text-[14px]">No attempts synced yet</p>
                <p className="text-[13px]">
                  Click "Sync Google Responses" above to fetch submitted responses from Google Forms API.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border border-border/70 overflow-hidden">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-muted/50 border-b border-border/70 font-medium text-muted-foreground">
                      <tr>
                        <th className="p-3">Student</th>
                        <th className="p-3">Score</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Submitted</th>
                        <th className="p-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70 bg-background">
                      {quizAttempts.map((attempt) => (
                        <tr key={attempt.id} className="hover:bg-muted/30">
                          <td className="p-3">
                            <p className="font-semibold text-foreground">{attempt.studentName}</p>
                            <p className="text-[12px] text-muted-foreground">{attempt.studentEmail}</p>
                          </td>
                          <td className="p-3 font-semibold text-foreground">
                            {attempt.score} / {attempt.totalMarks} pts ({Math.round(attempt.percentage)}%)
                          </td>
                          <td className="p-3">
                            <span
                              className={cn(
                                "inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                                attempt.passed
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300"
                                  : attempt.status === "UNMATCHED"
                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300"
                                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300"
                              )}
                            >
                              {attempt.status === "UNMATCHED"
                                ? "Unmatched Student"
                                : attempt.passed
                                ? "Passed"
                                : "Failed"}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground text-[12px]">
                            {new Date(attempt.submittedAt).toLocaleString()}
                          </td>
                          <td className="p-3 text-muted-foreground text-[12px]">
                            {attempt.source}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-border/70">
              <Button type="button" variant="outline" onClick={() => setPopupMode(null)}>
                Close
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
          description="Are you sure you want to delete this quiz? All associated questions and attempts will also be removed."
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

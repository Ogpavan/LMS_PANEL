"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CircleCheckBig,
  Clock3,
  Plus,
  UploadCloud,
  Users
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
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

interface EnrollmentRecord {
  id: number;
  student: {
    id: number;
    name: string;
  };
  course: {
    id: number;
    title: string;
    category: string;
    instructor: string;
  };
  status: string;
  createdAt: string;
}

interface CourseRecord {
  id: number;
  title: string;
  category: string;
  instructor: string;
  status: string;
  price: number;
  currency: string;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

export function AcademyStudentsDirectoryWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [records, setRecords] = useState<StudentDirectoryRecord[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEnrollmentsOpen, setIsEnrollmentsOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnrollmentSubmitting, setIsEnrollmentSubmitting] = useState(false);
  const [studentModalMode, setStudentModalMode] = useState<"create" | "edit">("create");
  const [selectedStudent, setSelectedStudent] = useState<StudentDirectoryRecord | null>(null);
  const [selectedEnrollmentStudent, setSelectedEnrollmentStudent] = useState<StudentDirectoryRecord | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [portalAccessDrafts, setPortalAccessDrafts] = useState<Record<string, string>>({});
  const [isPortalAccessConfirmOpen, setIsPortalAccessConfirmOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    student: StudentDirectoryRecord;
    nextStatus: string;
  } | null>(null);
  const [pendingPortalAccessChange, setPendingPortalAccessChange] = useState<{
    student: StudentDirectoryRecord;
    nextPortalAccess: string;
    temporaryPassword?: string;
  } | null>(null);
  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    password: "",
    status: "active",
    createLogin: true
  });
  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadStudents();
    void loadEnrollments();
    void loadCourses();
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

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const sortedRecords = useMemo(() => {
    if (!normalizedSearchQuery) {
      return records;
    }

    return [...records]
      .filter((record) => {
        const name = record.name.toLowerCase();
        const email = record.email.toLowerCase();
        return name.includes(normalizedSearchQuery) || email.includes(normalizedSearchQuery);
      })
      .sort((left, right) => getSearchScore(right, normalizedSearchQuery) - getSearchScore(left, normalizedSearchQuery));
  }, [normalizedSearchQuery, records]);

  const enrollmentCounts = useMemo(() => {
    return enrollments.reduce<Record<string, number>>((accumulator, enrollment) => {
      const key = String(enrollment.student.id);
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [enrollments]);

  const normalizedCourseSearchQuery = courseSearchQuery.trim().toLowerCase();
  const publishedCourses = useMemo(
    () => courses.filter((course) => course.status.toLowerCase() === "published"),
    [courses]
  );
  const publishedCourseIds = useMemo(
    () => new Set(publishedCourses.map((course) => course.id)),
    [publishedCourses]
  );
  const filteredCourses = useMemo(() => {
    if (!normalizedCourseSearchQuery) {
      return publishedCourses;
    }

    return publishedCourses.filter((course) => {
      const title = course.title.toLowerCase();
      const category = course.category.toLowerCase();
      const instructor = course.instructor.toLowerCase();

      return (
        title.includes(normalizedCourseSearchQuery) ||
        category.includes(normalizedCourseSearchQuery) ||
        instructor.includes(normalizedCourseSearchQuery)
      );
    });
  }, [publishedCourses, normalizedCourseSearchQuery]);

  const rows: RichTableRow[] = useMemo(
    () =>
      sortedRecords.map((record) => ({
        id: String(record.id),
        studentId: `STD-${String(record.id).padStart(4, "0")}`,
        name: record.name,
        email: record.email,
        enrolledCourses: String(enrollmentCounts[String(record.id)] ?? 0),
        status: record.status,
        portalAccess: record.hasAccount ? "Enabled" : "Profile only",
        createdAt: formatDate(record.createdAt)
      })),
    [enrollmentCounts, sortedRecords]
  );

  const tableColumns = useMemo<RichTableColumn[]>(
    () => [
      { key: "studentId", header: "Student ID" },
      {
        key: "name",
        header: "Name",
        render: (row) => (
          <span className="font-semibold text-[hsl(var(--primary))]">
            {renderHighlightedText(row.name, normalizedSearchQuery)}
          </span>
        )
      },
      {
        key: "email",
        header: "Email",
        type: "email",
        render: (row) => renderHighlightedText(row.email, normalizedSearchQuery)
      },
      {
        key: "enrolledCourses",
        header: "Enrolled Courses",
        render: (row) => {
          const count = Number(row.enrolledCourses ?? "0");

          if (count === 0) {
            return <span className="text-[13px] font-medium text-muted-foreground">Not enrolled</span>;
          }

          return (
            <span className="text-[13px] font-medium text-foreground">
              <span className="font-semibold text-[hsl(var(--primary))]">{count}</span>{" "}
              course{count === 1 ? "" : "s"}
            </span>
          );
        }
      },
      { key: "createdAt", header: "Added On" },
      {
        key: "status",
        header: "Status",
        filterable: true,
        render: (row) => {
          const current = row.status;
          const draft = statusDrafts[row.id] ?? current;

          return (
            <div className="flex items-center">
              <select
                value={draft}
                onChange={(event) => {
                  const nextStatus = event.target.value;
                  const student = records.find((record) => record.id === Number(row.id));

                  if (!student || nextStatus === current) {
                    setStatusDrafts((currentDrafts) => ({
                      ...currentDrafts,
                      [row.id]: current
                    }));
                    return;
                  }

                  setStatusDrafts((currentDrafts) => ({
                    ...currentDrafts,
                    [row.id]: nextStatus
                  }));
                  setSelectedStudent(student);
                  setPendingStatusChange({ student, nextStatus });
                  setIsStatusConfirmOpen(true);
                }}
                className={`h-8 w-[104px] rounded-md border border-border/70 px-2 text-[12px] font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${getStatusTone(
                  draft
                )}`}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          );
        }
      },
      {
        key: "portalAccess",
        header: "Portal Access",
        filterable: true,
        render: (row) => {
          const current = row.portalAccess;
          const draft = portalAccessDrafts[row.id] ?? current;

          return (
            <div className="flex items-center">
              <select
                value={draft}
                onChange={(event) => {
                  const nextPortalAccess = event.target.value;
                  const student = records.find((record) => record.id === Number(row.id));

                  if (!student || nextPortalAccess === current) {
                    setPortalAccessDrafts((currentDrafts) => ({
                      ...currentDrafts,
                      [row.id]: current
                    }));
                    return;
                  }

                  setPortalAccessDrafts((currentDrafts) => ({
                    ...currentDrafts,
                    [row.id]: nextPortalAccess
                  }));
                  setSelectedStudent(student);
                  setPendingPortalAccessChange({
                    student,
                    nextPortalAccess,
                    temporaryPassword: undefined
                  });
                  setIsPortalAccessConfirmOpen(true);
                }}
                className={`h-8 w-[104px] rounded-md border border-border/70 px-2 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${getPortalAccessTone(
                  draft
                )}`}
              >
                <option value="Enabled">Enabled</option>
                <option value="Profile only">Profile only</option>
              </select>
            </div>
          );
        }
      }
    ],
    [records, statusDrafts, portalAccessDrafts, normalizedSearchQuery]
  );

  const rowActions = useMemo<RichTableAction[]>(
    () => [
      {
        label: "View",
        icon: "view",
        onClick: (row) => {
          const student = records.find((record) => record.id === Number(row.id));

          if (!student) {
            return;
          }

          setSelectedStudent(student);
          setIsViewOpen(true);
        }
      },
      {
        label: "Enrollments",
        icon: "view",
        onClick: (row) => {
          const student = records.find((record) => record.id === Number(row.id));

          if (!student) {
            return;
          }

          setSelectedStudent(student);
          setSelectedEnrollmentStudent(student);
          setSelectedCourseIds(
            enrollments
              .filter(
                (enrollment) =>
                  enrollment.student.id === student.id && publishedCourseIds.has(enrollment.course.id)
              )
              .map((enrollment) => enrollment.course.id)
          );
          setIsEnrollmentsOpen(true);
        }
      },
      {
        label: "Edit",
        icon: "edit",
        onClick: (row) => {
          const student = records.find((record) => record.id === Number(row.id));

          if (!student) {
            return;
          }

          setSelectedStudent(student);
          setStudentModalMode("edit");
          setStudentForm({
            name: student.name,
            email: student.email,
            password: "",
            status: student.status,
            createLogin: student.hasAccount
          });
          setIsCreateOpen(true);
        }
      },
      {
        label: "Delete",
        icon: "delete",
        tone: "danger",
        onClick: (row) => {
          const student = records.find((record) => record.id === Number(row.id));

          if (!student) {
            return;
          }

          setSelectedStudent(student);
          setIsDeleteOpen(true);
        }
      }
    ],
    [enrollments, records]
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
      setStatusDrafts({});
      setPortalAccessDrafts({});
    } catch {
      toast.error("Unable to load students", {
        description: "Please try again."
      });
      setRecords([]);
      setPortalAccessDrafts({});
    } finally {
      setIsLoading(false);
    }
  }

  async function loadEnrollments() {
    try {
      const response = await fetch("/api/v1/enrollments", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<EnrollmentRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        setEnrollments([]);
        return;
      }

      setEnrollments(result.data);
    } catch {
      setEnrollments([]);
    }
  }

  async function loadCourses() {
    try {
      const response = await fetch("/api/v1/courses", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<CourseRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        setCourses([]);
        return;
      }

      setCourses(result.data);
    } catch {
      setCourses([]);
    }
  }

  async function handleStudentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (studentModalMode === "create") {
        const response = await fetch("/api/v1/students", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            name: studentForm.name,
            email: studentForm.email,
            status: studentForm.status,
            createLogin: studentForm.createLogin,
            password: studentForm.createLogin ? studentForm.password : undefined
          })
        });

        const result = (await response.json()) as ApiResponse<StudentDirectoryRecord>;

        if (response.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (!response.ok || !result.success) {
          toast.error("Student could not be created", {
            description: result.error ?? "Please review the form and try again."
          });
          return;
        }

        toast.success("Student created", {
          description: "The learner profile has been added to the directory."
        });
      } else if (selectedStudent) {
        const response = await fetch(`/api/v1/students/${selectedStudent.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            name: studentForm.name,
            email: studentForm.email,
            progress: selectedStudent.progress,
            status: studentForm.status
          })
        });

        const result = (await response.json()) as ApiResponse<StudentDirectoryRecord>;

        if (response.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (!response.ok || !result.success) {
          toast.error("Student could not be updated", {
            description: result.error ?? "Please review the form and try again."
          });
          return;
        }

        toast.success("Student updated", {
          description: "The student record has been saved."
        });
      }

      setStudentForm({
        name: "",
        email: "",
        password: "",
        status: "active",
        createLogin: true
      });
      setStudentModalMode("create");
      setIsCreateOpen(false);
      setSelectedStudent(null);
      setStatusDrafts({});
      setPortalAccessDrafts({});
      setPendingStatusChange(null);
      setPendingPortalAccessChange(null);
      await loadStudents();
    } catch {
      toast.error(studentModalMode === "create" ? "Student could not be created" : "Student could not be updated", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteStudent() {
    if (!selectedStudent) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/students/${selectedStudent.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as ApiResponse<null>;

      if (!response.ok || !result.success) {
        toast.error("Student could not be deleted", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Student deleted", {
        description: "The student record has been removed."
      });

      setIsDeleteOpen(false);
      setSelectedStudent(null);
      setStatusDrafts({});
      setPortalAccessDrafts({});
      setPendingStatusChange(null);
      setPendingPortalAccessChange(null);
      await loadStudents();
    } catch {
      toast.error("Student could not be deleted", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStudentStatus(student: StudentDirectoryRecord, nextStatus: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/students/${student.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: student.name,
          email: student.email,
          progress: student.progress,
          status: nextStatus
        })
      });

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as ApiResponse<StudentDirectoryRecord>;

      if (!response.ok || !result.success) {
        toast.error("Student status could not be updated", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Student status updated", {
        description: `Status changed to ${nextStatus}.`
      });

      setStatusDrafts((currentDrafts) => ({
        ...currentDrafts,
        [String(student.id)]: nextStatus
      }));
      setIsStatusConfirmOpen(false);
      setSelectedStudent(null);
      setPendingStatusChange(null);
      await loadStudents();
    } catch {
      toast.error("Student status could not be updated", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStudentPortalAccess(
    student: StudentDirectoryRecord,
    nextPortalAccess: string
  ) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/students/${student.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: student.name,
          email: student.email,
          program: student.program,
          progress: student.progress,
          status: student.status,
          portalAccess: nextPortalAccess === "Enabled"
        })
      });

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as ApiResponse<
        StudentDirectoryRecord & { temporaryPassword?: string }
      >;

      if (!response.ok || !result.success) {
        toast.error("Portal access could not be updated", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Portal access updated", {
        description:
          nextPortalAccess === "Enabled"
            ? result.data?.temporaryPassword
              ? `Access enabled. Temporary password: ${result.data.temporaryPassword}`
              : "Access enabled."
            : "Access removed."
      });

      setPortalAccessDrafts((currentDrafts) => ({
        ...currentDrafts,
        [String(student.id)]: nextPortalAccess
      }));
      setPendingPortalAccessChange(null);
      setIsPortalAccessConfirmOpen(false);
      setSelectedStudent(null);
      await loadStudents();
    } catch {
      toast.error("Portal access could not be updated", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveStudentEnrollments() {
    if (!selectedEnrollmentStudent) {
      return;
    }

    setIsEnrollmentSubmitting(true);

    try {
      const currentEnrollments = enrollments.filter(
        (enrollment) =>
          enrollment.student.id === selectedEnrollmentStudent.id &&
          publishedCourseIds.has(enrollment.course.id)
      );
      const currentCourseIds = currentEnrollments.map((enrollment) => enrollment.course.id);
      const createCourseIds = selectedCourseIds.filter((courseId) => !currentCourseIds.includes(courseId));
      const removeEnrollments = currentEnrollments.filter(
        (enrollment) => !selectedCourseIds.includes(enrollment.course.id)
      );

      if (createCourseIds.length === 0 && removeEnrollments.length === 0) {
        toast.info("No enrollment changes to save");
        setIsEnrollmentsOpen(false);
        setSelectedEnrollmentStudent(null);
        setSelectedStudent(null);
        setSelectedCourseIds([]);
        return;
      }

      if (createCourseIds.length > 0) {
        const response = await fetch("/api/v1/enrollments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            studentId: selectedEnrollmentStudent.id,
            courseIds: createCourseIds
          })
        });

        const result = (await response.json()) as ApiResponse<EnrollmentRecord[]>;

        if (response.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (!response.ok || !result.success) {
          toast.error("Enrollments could not be updated", {
            description: result.error ?? "Please try again."
          });
          return;
        }
      }

      if (removeEnrollments.length > 0) {
        const deleteResults = await Promise.all(
          removeEnrollments.map((enrollment) =>
            fetch(`/api/v1/enrollments/${enrollment.id}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }).then(async (response) => {
              const result = (await response.json()) as ApiResponse<null>;

              return {
                response,
                result
              };
            })
          )
        );

        const failedDelete = deleteResults.find(
          ({ response, result }) => !response.ok || !result.success
        );

        if (failedDelete) {
          const { response, result } = failedDelete;

          if (response.status === 401) {
            clearSession();
            router.replace("/login");
            return;
          }

          toast.error("Enrollments could not be updated", {
            description: result.error ?? "Please try again."
          });
          return;
        }
      }

      toast.success("Enrollments updated", {
        description: "The selected course list has been saved."
      });

      setIsEnrollmentsOpen(false);
      setSelectedEnrollmentStudent(null);
      setSelectedStudent(null);
      setSelectedCourseIds([]);
      await Promise.all([loadStudents(), loadEnrollments(), loadCourses()]);
    } catch {
      toast.error("Enrollments could not be updated", {
        description: "Please try again."
      });
    } finally {
      setIsEnrollmentSubmitting(false);
    }
  }

  function toggleCourse(courseId: number) {
    setSelectedCourseIds((current) =>
      current.includes(courseId)
        ? current.filter((value) => value !== courseId)
        : [...current, courseId]
    );
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
            <div className="min-w-[260px] flex-1 lg:max-w-md">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by student name or email"
                className="h-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button
                variant="outline"
                onClick={() => importInputRef.current?.click()}
                disabled={isLoading}
              >
                <UploadCloud className="h-4 w-4" />
                Import
              </Button>
              <Button
                onClick={() => {
                  setStudentModalMode("create");
                  setSelectedStudent(null);
                  setStudentForm({
                    name: "",
                    email: "",
                    password: "",
                    status: "active",
                    createLogin: true
                  });
                  setIsCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Create Student
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading student directory...
            </div>
          ) : rows.length === 0 && normalizedSearchQuery ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              No students match "{searchQuery.trim()}".
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={rows} rowActions={rowActions} />
          )}
        </CardContent>
      </Card>

      <input
        ref={importInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (!file) {
            return;
          }

          toast.info("Import file selected", {
            description: `${file.name} is ready for the import flow.`
          });

          event.currentTarget.value = "";
        }}
      />

      <Popup
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setSelectedStudent(null);
            setStudentModalMode("create");
          }
        }}
        title={studentModalMode === "create" ? "Create Student" : "Edit Student"}
        description={
          studentModalMode === "create"
            ? "Add a learner record and optionally provision portal login access."
            : "Update the learner profile. Only the directory fields below are editable."
        }
      >
        <form className="space-y-5" onSubmit={handleStudentSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Student name"
              required
              value={studentForm.name}
              onChange={(value) => setStudentForm((current) => ({ ...current, name: value }))}
            />
            <Field
              label="Email address"
              type="email"
              required
              value={studentForm.email}
              onChange={(value) => setStudentForm((current) => ({ ...current, email: value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-1">
            <SelectField
              label="Status"
              required
              value={studentForm.status}
              options={[
                { label: "Active", value: "active" },
                { label: "Pending", value: "pending" },
                { label: "Blocked", value: "blocked" }
              ]}
              onChange={(value) => setStudentForm((current) => ({ ...current, status: value }))}
            />
          </div>

          {studentModalMode === "create" ? (
            <div className="rounded-md border border-border/70 bg-muted/20 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[15px] font-medium text-foreground">Portal login access</div>
                  <div className="text-[13px] leading-[20px] text-muted-foreground">
                    Create the learner profile and a student portal account together.
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-[14px] text-foreground">
                  <input
                    type="checkbox"
                    checked={studentForm.createLogin}
                    onChange={(event) =>
                      setStudentForm((current) => ({
                        ...current,
                        createLogin: event.target.checked,
                        password: event.target.checked ? current.password : ""
                      }))
                    }
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  Enable login access
                </label>
              </div>

              {studentForm.createLogin ? (
                <div className="mt-4">
                  <Field
                    label="Temporary password"
                    type="password"
                    required
                    value={studentForm.password}
                    onChange={(value) => setStudentForm((current) => ({ ...current, password: value }))}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setStudentModalMode("create");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : studentModalMode === "create"
                  ? "Create Student"
                  : "Save Changes"}
            </Button>
          </div>
        </form>
      </Popup>

      <Popup
        open={isViewOpen}
        onOpenChange={(open) => {
          setIsViewOpen(open);
          if (!open) {
            setSelectedStudent(null);
          }
        }}
        title="Student Details"
        description="View the current student profile and directory status."
      >
        {selectedStudent ? (
          <div className="space-y-5">
            <DetailGrid
              items={[
                { label: "Name", value: selectedStudent.name },
                { label: "Email", value: selectedStudent.email },
                { label: "Status", value: selectedStudent.status },
                { label: "Portal Access", value: selectedStudent.hasAccount ? "Enabled" : "Profile only" }
              ]}
            />
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Popup>

      <Popup
        open={isEnrollmentsOpen}
        onOpenChange={(open) => {
          setIsEnrollmentsOpen(open);
          if (!open) {
            setSelectedEnrollmentStudent(null);
            setSelectedCourseIds([]);
            setCourseSearchQuery("");
          }
        }}
        title="Student Enrollments"
        className="max-w-5xl"
      >
        {selectedEnrollmentStudent ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Input
                value={courseSearchQuery}
                onChange={(event) => setCourseSearchQuery(event.target.value)}
                placeholder="Search courses"
                className="h-10"
              />
              <div className="text-[13px] text-muted-foreground">
                {filteredCourses.length} result{filteredCourses.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-border/70">
              <div className="max-h-[68vh] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                    <tr>
                      <th className="w-14 border-b border-border/70 px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
                        Select
                      </th>
                      <th className="border-b border-border/70 px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
                        Course
                      </th>
                      <th className="border-b border-border/70 px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
                        Category
                      </th>
                      <th className="border-b border-border/70 px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
                        Price
                      </th>
                      <th className="border-b border-border/70 px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
                        Assignment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((course) => {
                      const checked = selectedCourseIds.includes(course.id);

                      return (
                        <tr
                          key={course.id}
                          className={checked ? "bg-[hsl(var(--primary))]/5" : "hover:bg-muted/40"}
                        >
                          <td className="border-b border-border/50 px-3 py-3 align-top">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCourse(course.id)}
                              className="h-4 w-4 accent-[hsl(var(--primary))]"
                            />
                          </td>
                          <td className="border-b border-border/50 px-3 py-3 align-top">
                            <div className="text-[13px] font-medium text-foreground">{course.title}</div>
                          </td>
                          <td className="border-b border-border/50 px-3 py-3 align-top">
                            <div className="text-[13px] text-muted-foreground">{course.category}</div>
                          </td>
                          <td className="border-b border-border/50 px-3 py-3 align-top">
                            <div className="text-[13px] font-medium text-foreground">
                              {formatCurrency(course.price, course.currency)}
                            </div>
                          </td>
                          <td className="border-b border-border/50 px-3 py-3 align-top">
                            <span className="inline-flex rounded-md bg-muted px-2 py-1 text-[12px] font-medium text-muted-foreground">
                              {course.price > 0 ? "Auto assigned" : "Manual assigned"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCourses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-8 text-center text-[14px] text-muted-foreground"
                        >
                          No courses match your search.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[13px] text-muted-foreground">
                {selectedCourseIds.length} selected
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEnrollmentsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void saveStudentEnrollments()}
                  disabled={isEnrollmentSubmitting}
                >
                  {isEnrollmentSubmitting ? "Saving..." : "Save Enrollments"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Popup>

      <Popup
        open={isStatusConfirmOpen}
        onOpenChange={(open) => {
          setIsStatusConfirmOpen(open);

          if (open || !pendingStatusChange) {
            return;
          }

          setStatusDrafts((currentDrafts) => ({
            ...currentDrafts,
            [String(pendingStatusChange.student.id)]: pendingStatusChange.student.status
          }));
      setPendingStatusChange(null);
      setSelectedStudent(null);
    }}
        title="Confirm Status Change"
        description="Review the new status before saving it."
      >
        {pendingStatusChange ? (
          <div className="space-y-5">
            <div className="rounded-md border border-border/70 bg-muted/20 p-4">
              <div className="text-[13px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                Student
              </div>
              <div className="mt-1 text-[15px] font-medium text-foreground">
                {pendingStatusChange.student.name}
              </div>
              <div className="text-[13px] leading-[20px] text-muted-foreground">
                {pendingStatusChange.student.email}
              </div>
            </div>

            <div className="rounded-md border border-border/70 bg-muted/20 p-4">
              <div className="text-[13px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                New status
              </div>
              <div
                className={`mt-2 inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-medium capitalize ${getStatusTone(
                  pendingStatusChange.nextStatus
                )}`}
              >
                {pendingStatusChange.nextStatus}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStatusDrafts((currentDrafts) => ({
                    ...currentDrafts,
                    [String(pendingStatusChange.student.id)]: pendingStatusChange.student.status
                  }));
                  setPendingStatusChange(null);
                  setIsStatusConfirmOpen(false);
                  setSelectedStudent(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void updateStudentStatus(pendingStatusChange.student, pendingStatusChange.nextStatus)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Confirm Change"}
              </Button>
            </div>
          </div>
        ) : null}
      </Popup>

      <Popup
        open={isPortalAccessConfirmOpen}
        onOpenChange={(open) => {
          setIsPortalAccessConfirmOpen(open);

          if (open || !pendingPortalAccessChange) {
            return;
          }

          setPortalAccessDrafts((currentDrafts) => ({
            ...currentDrafts,
            [String(pendingPortalAccessChange.student.id)]: pendingPortalAccessChange.student.hasAccount
              ? "Enabled"
              : "Profile only"
          }));
          setPendingPortalAccessChange(null);
          setSelectedStudent(null);
        }}
        title="Confirm Portal Access Change"
        description="Review the portal access change before saving it."
      >
        {pendingPortalAccessChange ? (
          <div className="space-y-5">
            <div className="rounded-md border border-border/70 bg-muted/20 p-4">
              <div className="text-[13px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                Student
              </div>
              <div className="mt-1 text-[15px] font-medium text-foreground">
                {pendingPortalAccessChange.student.name}
              </div>
              <div className="text-[13px] leading-[20px] text-muted-foreground">
                {pendingPortalAccessChange.student.email}
              </div>
            </div>

            <div className="rounded-md border border-border/70 bg-muted/20 p-4">
              <div className="text-[13px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                New portal access
              </div>
              <div
                className={`mt-2 inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-medium ${getPortalAccessTone(
                  pendingPortalAccessChange.nextPortalAccess
                )}`}
              >
                {pendingPortalAccessChange.nextPortalAccess}
              </div>
              {pendingPortalAccessChange.nextPortalAccess === "Enabled" ? (
                <div className="mt-3 text-[13px] leading-[20px] text-muted-foreground">
                  If the account does not already exist, the system will create one and generate a temporary
                  password.
                </div>
              ) : (
                <div className="mt-3 text-[13px] leading-[20px] text-muted-foreground">
                  Portal login will be removed and the student will remain profile-only.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPortalAccessDrafts((currentDrafts) => ({
                    ...currentDrafts,
                    [String(pendingPortalAccessChange.student.id)]: pendingPortalAccessChange.student.hasAccount
                      ? "Enabled"
                      : "Profile only"
                  }));
                  setPendingPortalAccessChange(null);
                  setIsPortalAccessConfirmOpen(false);
                  setSelectedStudent(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() =>
                  void updateStudentPortalAccess(
                    pendingPortalAccessChange.student,
                    pendingPortalAccessChange.nextPortalAccess
                  )
                }
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Confirm Change"}
              </Button>
            </div>
          </div>
        ) : null}
      </Popup>

      <Popup
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {
            setSelectedStudent(null);
          }
        }}
        title="Delete Student"
        description="This will permanently remove the student record."
      >
        {selectedStudent ? (
          <div className="space-y-5">
            <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-[14px] leading-[22px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              You are about to delete <strong>{selectedStudent.name}</strong>. This action cannot be undone.
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleDeleteStudent()}
                disabled={isSubmitting}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {isSubmitting ? "Deleting..." : "Delete Student"}
              </Button>
            </div>
          </div>
        ) : null}
      </Popup>
    </div>
  );
}

function DetailGrid({
  items
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-border/70 bg-muted/20 p-4">
          <div className="text-[12px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
            {item.label}
          </div>
          <div className="mt-1 text-[15px] font-medium text-foreground">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  required,
  value,
  options,
  onChange,
  hideLabel
}: {
  label: string;
  required?: boolean;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  hideLabel?: boolean;
}) {
  return (
    <label className="block">
      {hideLabel ? null : (
        <span className="mb-2 block text-[14px] font-medium text-foreground">
          {label}
          {required ? <span className="ml-1 text-rose-500">*</span> : null}
        </span>
      )}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-2 text-[15px] text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/5"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "active") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (normalized === "pending") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
  }

  if (normalized === "blocked") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300";
  }

  return "bg-muted text-muted-foreground";
}

function getPortalAccessTone(value: string) {
  const normalized = value.toLowerCase();

  if (normalized === "enabled") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (normalized === "profile only") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "bg-muted text-muted-foreground";
}

function getSearchScore(record: StudentDirectoryRecord, query: string) {
  const normalizedName = record.name.toLowerCase();
  const normalizedEmail = record.email.toLowerCase();

  if (!query) {
    return 0;
  }

  const nameIndex = normalizedName.indexOf(query);
  const emailIndex = normalizedEmail.indexOf(query);

  const nameScore =
    nameIndex === -1
      ? 0
      : nameIndex === 0
        ? 300
        : 200 - nameIndex;
  const emailScore =
    emailIndex === -1
      ? 0
      : emailIndex === 0
        ? 250
        : 150 - emailIndex;

  return Math.max(nameScore, emailScore);
}

function renderHighlightedText(value: string, query: string) {
  if (!query) {
    return value;
  }

  const lowerValue = value.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerValue.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return value;
  }

  const before = value.slice(0, matchIndex);
  const match = value.slice(matchIndex, matchIndex + query.length);
  const after = value.slice(matchIndex + query.length);

  return (
    <span>
      {before}
      <mark className="rounded bg-yellow-200 px-0.5 font-semibold text-foreground dark:bg-yellow-500/30">
        {match}
      </mark>
      {after}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatCurrency(price: number, currency: string) {
  return `${currency} ${price.toLocaleString("en-IN")}`;
}

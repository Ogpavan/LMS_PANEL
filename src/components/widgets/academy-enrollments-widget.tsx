"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CircleCheckBig, RefreshCcw, Users } from "lucide-react";
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
import { Popup } from "@/components/ui/popup";
import { useAuthStore } from "@/store/auth-store";

interface EnrollmentRecord {
  id: number;
  status: string;
  createdAt: string;
  student: {
    id: number;
    name: string;
    email: string;
    program: string;
    status: string;
  };
  course: {
    id: number;
    title: string;
    category: string;
    instructor: string;
    status: string;
  };
}

interface EnrollmentOptionsResponse {
  students: {
    id: number;
    name: string;
    email: string;
    program: string;
    status: string;
  }[];
  courses: {
    id: number;
    title: string;
    category: string;
    instructor: string;
    status: string;
  }[];
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const tableColumns: RichTableColumn[] = [
  { key: "enrollmentId", header: "Enrollment ID" },
  { key: "student", header: "Student", type: "highlight" },
  { key: "program", header: "Program" },
  { key: "course", header: "Course" },
  { key: "category", header: "Category" },
  { key: "instructor", header: "Instructor" },
  { key: "status", header: "Status", type: "badge" },
  { key: "enrolledOn", header: "Enrolled On" }
];

export function AcademyEnrollmentsWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [records, setRecords] = useState<EnrollmentRecord[]>([]);
  const [options, setOptions] = useState<EnrollmentOptionsResponse>({
    students: [],
    courses: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadPageData();
  }, [accessToken]);

  const summary = useMemo(() => {
    const active = records.filter((record) => record.status.toLowerCase() === "active").length;
    const uniqueStudents = new Set(records.map((record) => record.student.id)).size;
    const uniqueCourses = new Set(records.map((record) => record.course.id)).size;

    return [
      {
        label: "Total enrollments",
        value: String(records.length),
        icon: BookOpen,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Active enrollments",
        value: String(active),
        icon: CircleCheckBig,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Students enrolled",
        value: String(uniqueStudents),
        icon: Users,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "Courses assigned",
        value: String(uniqueCourses),
        icon: RefreshCcw,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      }
    ];
  }, [records]);

  const rows: RichTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        id: String(record.id),
        enrollmentId: `ENR-${String(record.id).padStart(4, "0")}`,
        student: record.student.name,
        program: record.student.program,
        course: record.course.title,
        category: record.course.category,
        instructor: record.course.instructor,
        status: formatStatus(record.status),
        enrolledOn: formatDate(record.createdAt)
      })),
    [records]
  );

  const rowActions: RichTableAction[] = useMemo(
    () => [
      {
        label: "Mark Completed",
        icon: "edit",
        onClick: (row) => {
          const id = Number(row.id);
          if (!Number.isInteger(id)) return;
          void updateEnrollmentStatus(id, "completed");
        }
      },
      {
        label: "Remove",
        icon: "delete",
        tone: "danger",
        onClick: (row) => {
          const id = Number(row.id);
          if (!Number.isInteger(id)) return;
          void handleDelete(id);
        }
      }
    ],
    []
  );

  async function loadPageData() {
    setIsLoading(true);

    try {
      const [enrollmentResponse, optionsResponse] = await Promise.all([
        fetch("/api/v1/enrollments", {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }),
        fetch("/api/v1/enrollments/options", {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })
      ]);

      if (enrollmentResponse.status === 401 || optionsResponse.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      const enrollmentResult = (await enrollmentResponse.json()) as ApiResponse<EnrollmentRecord[]>;
      const optionsResult = (await optionsResponse.json()) as ApiResponse<EnrollmentOptionsResponse>;

      if (!enrollmentResponse.ok || !enrollmentResult.success || !enrollmentResult.data) {
        toast.error("Unable to load enrollments", {
          description: enrollmentResult.error ?? "Please try again."
        });
        setRecords([]);
      } else {
        setRecords(enrollmentResult.data);
      }

      if (!optionsResponse.ok || !optionsResult.success || !optionsResult.data) {
        toast.error("Unable to load enrollment options", {
          description: optionsResult.error ?? "Please try again."
        });
        setOptions({ students: [], courses: [] });
      } else {
        setOptions(optionsResult.data);
      }
    } catch {
      toast.error("Unable to load enrollments", {
        description: "Please try again."
      });
      setRecords([]);
      setOptions({ students: [], courses: [] });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          studentId: Number(selectedStudentId),
          courseIds: selectedCourseIds
        })
      });

      const result = (await response.json()) as ApiResponse<EnrollmentRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Enrollment could not be created", {
          description: result.error ?? "Please review the form and try again."
        });
        return;
      }

      toast.success("Student enrolled", {
        description: "The selected student has been added to the chosen courses."
      });

      setSelectedStudentId("");
      setSelectedCourseIds([]);
      setIsPopupOpen(false);
      await loadPageData();
    } catch {
      toast.error("Enrollment could not be created", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateEnrollmentStatus(id: number, status: string) {
    try {
      const response = await fetch(`/api/v1/enrollments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status })
      });

      const result = (await response.json()) as ApiResponse<EnrollmentRecord>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Enrollment could not be updated", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Enrollment updated", {
        description: "The enrollment status has been updated."
      });

      await loadPageData();
    } catch {
      toast.error("Enrollment could not be updated", {
        description: "Please try again."
      });
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm("Remove this enrollment?");

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/enrollments/${id}`, {
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
        toast.error("Enrollment could not be removed", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Enrollment removed", {
        description: "The student has been removed from that course."
      });

      await loadPageData();
    } catch {
      toast.error("Enrollment could not be removed", {
        description: "Please try again."
      });
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
            <CardTitle>{config.title ?? "Enrollments"}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void loadPageData()} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => setIsPopupOpen(true)}>Enroll in Program</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading enrollments...
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={rows} rowActions={rowActions} />
          )}
        </CardContent>
      </Card>

      <Popup
        open={isPopupOpen}
        onOpenChange={setIsPopupOpen}
        title="Enroll in Program"
        description="Select one student and assign one or more courses."
        className="max-w-3xl"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-[14px] font-medium text-foreground">
              Student<span className="ml-1 text-rose-500">*</span>
            </span>
            <select
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-[15px] text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select student</option>
              {options.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} | {student.program}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="mb-2 text-[14px] font-medium text-foreground">
              Courses<span className="ml-1 text-rose-500">*</span>
            </div>
            <div className="grid max-h-[340px] gap-3 overflow-auto rounded-md border border-border/70 bg-muted/10 p-3">
              {options.courses.map((course) => {
                const checked = selectedCourseIds.includes(course.id);

                return (
                  <label
                    key={course.id}
                    className={`flex items-start gap-3 rounded-md border px-3 py-3 ${
                      checked ? "border-[hsl(var(--primary))] bg-primary/5" : "border-border/70 bg-card"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCourse(course.id)}
                      className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{course.title}</div>
                      <div className="text-[12px] leading-[18px] text-muted-foreground">
                        {course.category} | {course.instructor}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsPopupOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedStudentId || selectedCourseIds.length === 0}>
              {isSubmitting ? "Enrolling..." : "Enroll Student"}
            </Button>
          </div>
        </form>
      </Popup>
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

function formatStatus(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

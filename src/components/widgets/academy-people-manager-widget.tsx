"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { WidgetRendererProps } from "@/types/admin";

import {
  type RichTableColumn,
  type RichTableRow,
  RichDataTable
} from "@/components/data-table/rich-data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";

type Variant = "student" | "instructor";

interface StudentRecord {
  id: number;
  name: string;
  email: string;
  program: string;
  progress: number;
  status: string;
  hasAccount: boolean;
}

interface InstructorRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

type PeopleRecord = StudentRecord | InstructorRecord;

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

export function AcademyPeopleManagerWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const variant = (config.props?.variant as Variant | undefined) ?? "student";
  const isStudent = variant === "student";
  const endpoint = isStudent ? "/api/v1/students" : "/api/v1/instructors";

  const [records, setRecords] = useState<PeopleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    program: "",
    password: "",
    status: "active",
    createLogin: true
  });
  const [instructorForm, setInstructorForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const tableColumns: RichTableColumn[] = isStudent
    ? [
        { key: "name", header: "Name" },
        { key: "email", header: "Email", type: "email" },
        { key: "program", header: "Program" },
        { key: "status", header: "Status", type: "badge" },
        { key: "portalAccess", header: "Portal Access", type: "badge" }
      ]
    : [
        { key: "name", header: "Name" },
        { key: "email", header: "Email", type: "email" },
        { key: "role", header: "Role", type: "badge" },
        { key: "createdAt", header: "Created On" }
      ];
  const tableRows: RichTableRow[] = isStudent
    ? (records as StudentRecord[]).map((record) => ({
        id: String(record.id),
        name: record.name,
        email: record.email,
        program: record.program,
        status: record.status,
        portalAccess: record.hasAccount ? "Enabled" : "Profile only"
      }))
    : (records as InstructorRecord[]).map((record) => ({
        id: String(record.id),
        name: record.name,
        email: record.email,
        role: record.role,
        createdAt: formatDate(record.createdAt)
      }));

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadRecords();
  }, [accessToken, endpoint]);

  async function loadRecords() {
    setIsLoading(true);

    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      const result = (await response.json()) as ApiResponse<PeopleRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load directory", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load directory", {
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
      const payload = isStudent
        ? {
            name: studentForm.name,
            email: studentForm.email,
            program: studentForm.program,
            status: studentForm.status,
            createLogin: studentForm.createLogin,
            password: studentForm.createLogin ? studentForm.password : undefined
          }
        : {
            name: instructorForm.name,
            email: instructorForm.email,
            password: instructorForm.password
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as ApiResponse<PeopleRecord>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        toast.error(isStudent ? "Student could not be created" : "Instructor could not be created", {
          description: result.error ?? "Please review the form and try again."
        });
        return;
      }

      if (isStudent) {
        setStudentForm({
          name: "",
          email: "",
          program: "",
          password: "",
          status: "active",
          createLogin: true
        });
      } else {
        setInstructorForm({
          name: "",
          email: "",
          password: ""
        });
      }

      toast.success(isStudent ? "Student created" : "Instructor created", {
        description: isStudent
          ? "The learner profile is ready for enrollment workflows."
          : "The instructor account is ready for LMS access."
      });

      await loadRecords();
    } catch {
      toast.error(isStudent ? "Student could not be created" : "Instructor could not be created", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{config.title ?? (isStudent ? "Student intake desk" : "Instructor onboarding")}</CardTitle>
            <p className="text-[14px] leading-[22px] text-muted-foreground">
              {isStudent
                ? "Capture learner basics, enable login access, and keep the intake list tied to the LMS directory."
                : "Create teaching accounts with a temporary password so instructors can access course, class, and assessment tools."}
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label={isStudent ? "Student name" : "Instructor name"}
                  required
                  value={isStudent ? studentForm.name : instructorForm.name}
                  onChange={(value) =>
                    isStudent
                      ? setStudentForm((current) => ({ ...current, name: value }))
                      : setInstructorForm((current) => ({ ...current, name: value }))
                  }
                />
                <Field
                  label="Email address"
                  type="email"
                  required
                  value={isStudent ? studentForm.email : instructorForm.email}
                  onChange={(value) =>
                    isStudent
                      ? setStudentForm((current) => ({ ...current, email: value }))
                      : setInstructorForm((current) => ({ ...current, email: value }))
                  }
                />
              </div>

              {isStudent ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Program"
                    required
                    value={studentForm.program}
                    onChange={(value) =>
                      setStudentForm((current) => ({ ...current, program: value }))
                    }
                  />
                  <SelectField
                    label="Status"
                    required
                    value={studentForm.status}
                    options={[
                      { label: "Active", value: "active" },
                      { label: "Pending", value: "pending" },
                      { label: "Completed", value: "completed" }
                    ]}
                    onChange={(value) =>
                      setStudentForm((current) => ({ ...current, status: value }))
                    }
                  />
                </div>
              ) : null}

              <div className="rounded-md border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[15px] font-medium text-foreground">Portal login access</div>
                    <div className="text-[13px] leading-[20px] text-muted-foreground">
                      {isStudent
                        ? "Create the learner profile and a student portal account together."
                        : "Every instructor needs a login account to manage courses and classes."}
                    </div>
                  </div>
                  {isStudent ? (
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
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-700">Required</Badge>
                  )}
                </div>

                {!isStudent || studentForm.createLogin ? (
                  <div className="mt-4">
                    <Field
                      label="Temporary password"
                      type="password"
                      required
                      value={isStudent ? studentForm.password : instructorForm.password}
                      onChange={(value) =>
                        isStudent
                          ? setStudentForm((current) => ({ ...current, password: value }))
                          : setInstructorForm((current) => ({ ...current, password: value }))
                      }
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadRecords()}
                  disabled={isLoading}
                >
                  Refresh Directory
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : isStudent
                      ? "Create Student"
                      : "Create Instructor"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isStudent ? "LMS intake rules" : "Instructor onboarding rules"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(isStudent
              ? [
                  "Students can be created by admins and instructors.",
                  "Login access is optional, but if enabled the email must be unique across the platform.",
                  "Progress is captured up front so migrated learners can enter with their current completion state."
                ]
              : [
                  "Only admins can create instructor accounts.",
                  "Instructor access is always provisioned with a temporary password.",
                  "The email becomes the unique sign-in identity for teaching operations."
                ]
            ).map((item) => (
              <div key={item} className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-[14px] leading-[22px] text-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isStudent ? "Recent students" : "Instructor directory"}</CardTitle>
          <p className="text-[14px] leading-[22px] text-muted-foreground">
            {isStudent
              ? "Use this list to verify student intake and portal access."
              : "Use this list to verify instructor access after onboarding."}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">
              Loading directory...
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">
              No records yet.
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={tableRows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  type = "text",
  min,
  max
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <Input type={type} value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  required,
  value,
  options,
  onChange
}: {
  label: string;
  required?: boolean;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-2 text-[15px] text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

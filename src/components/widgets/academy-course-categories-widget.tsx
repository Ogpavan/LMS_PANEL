"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";
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

interface CourseCategoryRecord {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: string;
  createdAt: string;
  courseCount: number;
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const tableColumns: RichTableColumn[] = [
  { key: "name", header: "Category" },
  { key: "slug", header: "Slug" },
  { key: "courseCount", header: "Courses" },
  { key: "status", header: "Status", type: "badge", filterable: true },
  { key: "createdAt", header: "Created On" }
];

const initialForm = {
  name: "",
  description: "",
  status: "active"
};

export function AcademyCourseCategoriesWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.user);
  const [records, setRecords] = useState<CourseCategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadCategories();
  }, [accessToken]);

  const rows: RichTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        id: String(record.id),
        name: record.name,
        slug: record.slug,
        courseCount: String(record.courseCount),
        status: record.status,
        createdAt: formatDate(record.createdAt)
      })),
    [records]
  );

  const rowActions: RichTableAction[] = useMemo(
    () => [
      {
        label: "Edit",
        icon: "edit",
        onClick: (row) => {
          const record = records.find((item) => String(item.id) === row.id);

          if (!record) {
            return;
          }

          setEditingId(record.id);
          setForm({
            name: record.name,
            description: record.description,
            status: record.status
          });
          setIsPopupOpen(true);
        }
      },
      {
        label: "Delete",
        icon: "delete",
        tone: "danger",
        disabled: (row) => {
          const record = records.find((item) => String(item.id) === row.id);
          return user?.role !== "admin" || !record || record.courseCount > 0 || isSubmitting;
        },
        onClick: (row) => {
          const id = Number(row.id);

          if (!Number.isInteger(id)) {
            return;
          }

          void handleDelete(id);
        }
      }
    ],
    [isSubmitting, records, user?.role]
  );

  async function loadCategories() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/course-categories", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      const result = (await response.json()) as ApiResponse<CourseCategoryRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load categories", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load categories", {
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
      const response = await fetch(
        editingId ? `/api/v1/course-categories/${editingId}` : "/api/v1/course-categories",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(form)
        }
      );

      const result = (await response.json()) as ApiResponse<CourseCategoryRecord>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        toast.error(editingId ? "Category could not be updated" : "Category could not be created", {
          description: result.error ?? "Please review the form and try again."
        });
        return;
      }

      toast.success(editingId ? "Category updated" : "Category created", {
        description: editingId
          ? "Course assignments now use the updated category details."
          : "The category is ready for course builder and catalog use."
      });

      resetForm();
      setIsPopupOpen(false);
      await loadCategories();
    } catch {
      toast.error(editingId ? "Category could not be updated" : "Category could not be created", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/course-categories/${id}`, {
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
        toast.error("Category could not be deleted", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Category deleted", {
        description: "The category has been removed from the backend catalog."
      });

      await loadCategories();
    } catch {
      toast.error("Category could not be deleted", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>{config.title ?? "Course categories"}</CardTitle>
              <p className="mt-1 text-[14px] leading-[22px] text-muted-foreground">
                Manage reusable course categories for the LMS catalog and public course creation flow.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  resetForm();
                  setIsPopupOpen(true);
                }}
              >
                Create Category
              </Button>
              <Button variant="outline" onClick={() => void loadCategories()} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading category directory...
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={rows} rowActions={rowActions} />
          )}
        </CardContent>
      </Card>

      <Popup
        open={isPopupOpen}
        onOpenChange={(open) => {
          setIsPopupOpen(open);
          if (!open) {
            resetForm();
          }
        }}
        title={editingId ? "Edit category" : "Create category"}
        description="Create and manage reusable course categories."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field
            label="Category name"
            required
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          />
          <TextAreaField
            label="Description"
            value={form.description}
            onChange={(value) => setForm((current) => ({ ...current, description: value }))}
          />
          <SelectField
            label="Status"
            value={form.status}
            options={[
              { label: "Active", value: "active" },
              { label: "Archived", value: "archived" }
            ]}
            onChange={(value) => setForm((current) => ({ ...current, status: value }))}
          />
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPopupOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingId ? "Update Category" : "Create Category"}
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-white px-3 py-3 text-[15px] text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">{label}</span>
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

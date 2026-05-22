"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Globe, RefreshCcw, Sparkles, SquareLibrary, UploadCloud } from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";

interface CourseCategoryRecord {
  id: number;
  name: string;
  status: string;
}

interface InstructorRecord {
  id: number;
  name: string;
  email: string;
}

interface CourseDirectoryRecord {
  id: number;
  title: string;
  category: string;
  instructor: string;
  shortDescription: string;
  description: string;
  thumbnailUrl: string;
  price: number;
  currency: string;
  level: string;
  durationLabel: string;
  language: string;
  status: string;
  visibility: string;
  featured: boolean;
  createdAt: string;
  sections?: {
    id: number;
    lessons?: {
      id: number;
    }[];
  }[];
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const tableColumns: RichTableColumn[] = [
  { key: "courseId", header: "Course ID" },
  { key: "title", header: "Title", type: "highlight" },
  { key: "lessonCount", header: "Lessons" },
  { key: "category", header: "Category", filterable: true },
  { key: "instructor", header: "Instructor" },
  { key: "price", header: "Price" },
  { key: "status", header: "Status", type: "badge", filterable: true },
  { key: "visibility", header: "Visibility", type: "badge", filterable: true },
  { key: "featured", header: "Featured", type: "badge", filterable: true }
];

export function AcademyCoursesDirectoryWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.user);
  const [records, setRecords] = useState<CourseDirectoryRecord[]>([]);
  const [categories, setCategories] = useState<CourseCategoryRecord[]>([]);
  const [instructors, setInstructors] = useState<InstructorRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popupMode, setPopupMode] = useState<"view" | "edit" | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CourseDirectoryRecord | null>(null);
  const [thumbnailFileName, setThumbnailFileName] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [instructorOpen, setInstructorOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    instructor: "",
    shortDescription: "",
    description: "",
    thumbnailUrl: "",
    price: "0",
    currency: "INR",
    level: "beginner",
    durationLabel: "",
    language: "English",
    status: "draft",
    visibility: "public",
    featured: false
  });

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadCourses();
    void loadCategories();
    void loadInstructors();
  }, [accessToken]);

  const summary = useMemo(() => {
    const published = records.filter((record) => record.status.toLowerCase() === "published").length;
    const publicCount = records.filter((record) => record.visibility.toLowerCase() === "public").length;
    const featured = records.filter((record) => record.featured).length;

    return [
      {
        label: "Total courses",
        value: String(records.length),
        icon: SquareLibrary,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Published",
        value: String(published),
        icon: UploadCloud,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Public catalog",
        value: String(publicCount),
        icon: Globe,
        iconClassName: "bg-[#fff1e4] text-[#ff9f43]",
        valueClassName: "text-[#ff9f43]"
      },
      {
        label: "Featured",
        value: String(featured),
        icon: Sparkles,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      }
    ];
  }, [records]);

  const rows: RichTableRow[] = useMemo(
    () =>
      records.map((record) => ({
        id: String(record.id),
        courseId: `CRS-${String(record.id).padStart(4, "0")}`,
        title: record.title,
        lessonCount: String(
          (record.sections ?? []).reduce(
            (total, section) => total + (section.lessons?.length ?? 0),
            0
          )
        ),
        category: record.category,
        instructor: record.instructor,
        price: `${record.currency} ${record.price.toLocaleString("en-IN")}`,
        status: record.status,
        visibility: record.visibility,
        featured: record.featured ? "Enabled" : "Profile only"
      })),
    [records]
  );

  const rowActions: RichTableAction[] = useMemo(
    () => [
      {
        label: "View",
        icon: "view",
        onClick: (row) => {
          const record = records.find((item) => String(item.id) === row.id);
          if (!record) return;
          setSelectedRecord(record);
          setPopupMode("view");
        }
      },
      {
        label: "Edit",
        icon: "edit",
        onClick: (row) => {
          router.push(`/dashboard/academy/courses/create?edit=${row.id}`);
        }
      },
      {
        label: "Delete",
        icon: "delete",
        tone: "danger",
        disabled: user?.role !== "admin" || isSubmitting,
        onClick: (row) => {
          const id = Number(row.id);
          if (!Number.isInteger(id)) return;
          void handleDelete(id);
        }
      }
    ],
    [isSubmitting, records, user?.role]
  );

  async function loadCourses() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/courses", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<CourseDirectoryRecord[]>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load courses", {
          description: result.error ?? "Please try again."
        });
        setRecords([]);
        return;
      }

      setRecords(result.data);
    } catch {
      toast.error("Unable to load courses", {
        description: "Please try again."
      });
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await fetch("/api/v1/course-categories", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<CourseCategoryRecord[]>;

      if (!response.ok || !result.success || !result.data) {
        return;
      }

      setCategories(result.data.filter((category) => category.status.toLowerCase() === "active"));
    } catch {
      setCategories([]);
    }
  }

  async function loadInstructors() {
    if (user?.role === "instructor") {
      setInstructors(
        user.name
          ? [
              {
                id: 0,
                name: user.name,
                email: user.email ?? ""
              }
            ]
          : []
      );
      return;
    }

    if (user?.role !== "admin") {
      setInstructors([]);
      return;
    }

    try {
      const response = await fetch("/api/v1/instructors", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<InstructorRecord[]>;

      if (!response.ok || !result.success || !result.data) {
        return;
      }

      setInstructors(result.data);
    } catch {
      setInstructors([]);
    }
  }

  function openEditPopup(record: CourseDirectoryRecord) {
    setSelectedRecord(record);
    setThumbnailFileName("");
    setEditForm({
      title: record.title,
      category: record.category,
      instructor: record.instructor,
      shortDescription: record.shortDescription,
      description: record.description,
      thumbnailUrl: record.thumbnailUrl,
      price: String(record.price),
      currency: record.currency,
      level: record.level,
      durationLabel: record.durationLabel,
      language: record.language,
      status: record.status,
      visibility: record.visibility,
      featured: record.featured
    });
    setPopupMode("edit");
  }

  function closePopup() {
    setPopupMode(null);
    setSelectedRecord(null);
    setThumbnailFileName("");
    setCategoryOpen(false);
    setInstructorOpen(false);
  }

  async function handleDelete(id: number) {
    if (user?.role !== "admin") {
      return;
    }

    const confirmed = window.confirm("Delete this course?");

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/courses/${id}`, {
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
        toast.error("Course could not be deleted", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Course deleted", {
        description: "The course has been removed from the catalog."
      });

      await loadCourses();
    } catch {
      toast.error("Course could not be deleted", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRecord) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/courses/${selectedRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          title: editForm.title,
          category: editForm.category,
          instructor: editForm.instructor,
          shortDescription: editForm.shortDescription,
          description: editForm.description,
          thumbnailUrl: editForm.thumbnailUrl,
          price: Number(editForm.price) || 0,
          currency: editForm.currency,
          level: editForm.level,
          durationLabel: editForm.durationLabel,
          language: editForm.language,
          status: editForm.status,
          visibility: editForm.visibility,
          featured: editForm.featured
        })
      });

      const result = (await response.json()) as ApiResponse<CourseDirectoryRecord>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        toast.error("Course could not be updated", {
          description: result.error ?? "Please review the form and try again."
        });
        return;
      }

      toast.success("Course updated", {
        description: "The course listing has been updated."
      });

      closePopup();
      await loadCourses();
    } catch {
      toast.error("Course could not be updated", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleThumbnailChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setThumbnailFileName("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid thumbnail", {
        description: "Please choose an image file."
      });
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setThumbnailFileName(file.name);
      setEditForm((current) => ({ ...current, thumbnailUrl: dataUrl }));
    } catch {
      toast.error("Thumbnail could not be loaded", {
        description: "Please try a different image."
      });
    }
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
            <div>
              <CardTitle>{config.title ?? "All courses"}</CardTitle>
              <p className="mt-1 text-[14px] leading-[22px] text-muted-foreground">
                Monitor catalog readiness, publishing state, and public website visibility from one place.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void loadCourses()} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Link href="/dashboard/academy/courses/create">
                <Button>Create Course</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
              Loading course directory...
            </div>
          ) : (
            <RichDataTable columns={tableColumns} rows={rows} rowActions={rowActions} />
          )}
        </CardContent>
      </Card>

      <Popup
        open={popupMode === "view" && selectedRecord !== null}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        title={selectedRecord?.title ?? "Course details"}
        description="Course listing details and publishing state."
      >
        {selectedRecord ? (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-md border border-border/70 bg-card">
              <div
                className="aspect-[16/8] bg-cover bg-center"
                style={{
                  backgroundImage: selectedRecord.thumbnailUrl
                    ? `linear-gradient(180deg, rgba(22, 24, 33, 0.08), rgba(22, 24, 33, 0.55)), url(${selectedRecord.thumbnailUrl})`
                    : "linear-gradient(135deg, rgba(115,103,240,0.18), rgba(0,186,209,0.18), rgba(255,159,67,0.18))"
                }}
              />
            </div>
            <div className="overflow-hidden rounded-md border border-border/70 bg-card">
              <div className="border-b border-border/70 px-5 py-4">
                <div className="text-[15px] font-medium text-foreground">Course details</div>
              </div>
              <div className="divide-y divide-border/70">
                <DetailRow label="Course title" value={selectedRecord.title} />
                <DetailRow label="Category" value={selectedRecord.category} />
                <DetailRow label="Instructor" value={selectedRecord.instructor} />
                <DetailRow
                  label="Price"
                  value={`${selectedRecord.currency} ${selectedRecord.price.toLocaleString("en-IN")}`}
                />
                <DetailRow label="Duration" value={selectedRecord.durationLabel} />
                <DetailRow label="Language" value={selectedRecord.language} />
                <DetailRow label="Level" value={formatLabel(selectedRecord.level)} />
                <DetailRow label="Status" value={formatLabel(selectedRecord.status)} />
                <DetailRow label="Visibility" value={formatLabel(selectedRecord.visibility)} />
              </div>
            </div>
            <div>
              <div className="mb-2 text-[14px] font-medium text-foreground">Short description</div>
              <p className="text-[14px] leading-[22px] text-muted-foreground">{selectedRecord.shortDescription}</p>
            </div>
            <div>
              <div className="mb-2 text-[14px] font-medium text-foreground">Full description</div>
              <p className="text-[14px] leading-[22px] text-muted-foreground">{selectedRecord.description}</p>
            </div>
          </div>
        ) : null}
      </Popup>

      <Popup
        open={popupMode === "edit" && selectedRecord !== null}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        title={selectedRecord ? `Edit ${selectedRecord.title}` : "Edit course"}
        description="Update the course listing directly from the catalog table."
        className="max-w-4xl"
      >
        <form className="space-y-5" onSubmit={handleEditSubmit}>
          <Field
            label="Course title"
            required
            value={editForm.title}
            onChange={(value) => setEditForm((current) => ({ ...current, title: value }))}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ComboboxField
              label="Category"
              required
              value={editForm.category}
              options={categories.map((category) => ({ label: category.name, value: category.name }))}
              open={categoryOpen}
              onOpenChange={setCategoryOpen}
              placeholder="Select category"
              searchPlaceholder="Search categories..."
              emptyLabel="No matching categories found."
              disabled={categories.length === 0}
              onChange={(value) => setEditForm((current) => ({ ...current, category: value }))}
            />
            <ComboboxField
              label="Instructor"
              required
              value={editForm.instructor}
              options={instructors.map((instructor) => ({ label: instructor.name, value: instructor.name }))}
              open={instructorOpen}
              onOpenChange={setInstructorOpen}
              placeholder="Select instructor"
              searchPlaceholder="Search instructors..."
              emptyLabel="No matching instructors found."
              disabled={instructors.length === 0 || user?.role === "instructor"}
              onChange={(value) => setEditForm((current) => ({ ...current, instructor: value }))}
            />
            <Field
              label="Duration"
              required
              value={editForm.durationLabel}
              onChange={(value) => setEditForm((current) => ({ ...current, durationLabel: value }))}
            />
            <SelectField
              label="Language"
              required
              value={editForm.language}
              options={[
                { label: "English", value: "English" },
                { label: "Hindi", value: "Hindi" }
              ]}
              onChange={(value) => setEditForm((current) => ({ ...current, language: value }))}
            />
            <Field
              label="Price"
              type="number"
              required
              value={editForm.price}
              onChange={(value) => setEditForm((current) => ({ ...current, price: value }))}
            />
            <SelectField
              label="Currency"
              required
              value={editForm.currency}
              options={[
                { label: "INR", value: "INR" },
                { label: "Dollar", value: "USD" }
              ]}
              onChange={(value) => setEditForm((current) => ({ ...current, currency: value }))}
            />
            <SelectField
              label="Level"
              required
              value={editForm.level}
              options={[
                { label: "Beginner", value: "beginner" },
                { label: "Intermediate", value: "intermediate" },
                { label: "Advanced", value: "advanced" }
              ]}
              onChange={(value) => setEditForm((current) => ({ ...current, level: value }))}
            />
            <SelectField
              label="Status"
              required
              value={editForm.status}
              options={[
                { label: "Draft", value: "draft" },
                { label: "Published", value: "published" },
                { label: "Archived", value: "archived" }
              ]}
              onChange={(value) => setEditForm((current) => ({ ...current, status: value }))}
            />
            <SelectField
              label="Visibility"
              required
              value={editForm.visibility}
              options={[
                { label: "Public", value: "public" },
                { label: "Private", value: "private" },
                { label: "Unlisted", value: "unlisted" }
              ]}
              onChange={(value) => setEditForm((current) => ({ ...current, visibility: value }))}
            />
          </div>

          <FileField
            label="Thumbnail"
            required
            value={thumbnailFileName || (editForm.thumbnailUrl ? "Current thumbnail selected" : "")}
            accept="image/*"
            onChange={handleThumbnailChange}
          />

          <TextAreaField
            label="Short description"
            required
            value={editForm.shortDescription}
            onChange={(value) => setEditForm((current) => ({ ...current, shortDescription: value }))}
            rows={3}
          />

          <TextAreaField
            label="Full description"
            required
            value={editForm.description}
            onChange={(value) => setEditForm((current) => ({ ...current, description: value }))}
            rows={6}
          />

          <div className="rounded-md border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[15px] font-medium text-foreground">Catalog prominence</div>
                <div className="text-[13px] leading-[20px] text-muted-foreground">
                  Featured courses can be prioritized on the marketing site or academy landing page.
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-[14px] text-foreground">
                <input
                  type="checkbox"
                  checked={editForm.featured}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, featured: event.target.checked }))
                  }
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                Mark as featured
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" onClick={closePopup} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
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

function FileField({
  label,
  required,
  value,
  accept,
  onChange
}: {
  label: string;
  required?: boolean;
  value?: string;
  accept?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <div className="rounded-md border border-input bg-white px-3 py-3 shadow-sm">
        <input
          type="file"
          accept={accept}
          onChange={onChange}
          className="block w-full text-[14px] text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-foreground"
        />
        <div className="mt-2 text-[12px] text-muted-foreground">
          {value || "Choose an image file for the course thumbnail."}
        </div>
      </div>
    </label>
  );
}

function ComboboxField({
  label,
  required,
  value,
  options,
  open,
  onOpenChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  onChange
}: {
  label: string;
  required?: boolean;
  value: string;
  options: { label: string; value: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-9 w-full justify-between bg-white px-3 py-2 text-[15px] font-normal shadow-sm",
              !value ? "text-muted-foreground" : "text-foreground"
            )}
          >
            <span className="truncate">
              {value ? options.find((option) => option.value === value)?.label ?? value : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.value === value ? "" : option.value);
                      onOpenChange(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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

function TextAreaField({
  label,
  required,
  value,
  onChange,
  rows
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-white px-3 py-3 text-[15px] text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-5 py-3 md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:gap-4">
      <div className="text-[12px] font-medium uppercase tracking-[0.35px] text-muted-foreground">
        {label}
      </div>
      <div className="text-[14px] font-medium leading-[20px] text-foreground">{value}</div>
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read file"));
    };

    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

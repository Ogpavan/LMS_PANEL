"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import type { WidgetRendererProps } from "@/types/admin";

import { Badge } from "@/components/ui/badge";
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

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

interface UploadResponse {
  url: string;
  name: string;
  size: number;
  type: string;
}

interface CourseBuilderRecord {
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
  contentMode: string;
  status: string;
  visibility: string;
  featured: boolean;
  sections?: {
    title: string;
    dayLabel: string;
    lessons?: {
      title: string;
      summary: string;
      videoUrl: string;
      thumbnailUrl?: string;
      durationLabel: string;
    }[];
  }[];
}

interface LessonFormState {
  title: string;
  summary: string;
  videoUrl: string;
  videoFileName: string;
  isVideoUploading: boolean;
  videoUploadProgress: number;
  thumbnailUrl: string;
  thumbnailFileName: string;
  isThumbnailUploading: boolean;
  thumbnailUploadProgress: number;
  durationLabel: string;
}

interface SectionFormState {
  title: string;
  dayLabel: string;
  lessons: LessonFormState[];
}

function createEmptyLesson(): LessonFormState {
  return {
    title: "",
    summary: "",
    videoUrl: "",
    videoFileName: "",
    isVideoUploading: false,
    videoUploadProgress: 0,
    thumbnailUrl: "",
    thumbnailFileName: "",
    isThumbnailUploading: false,
    thumbnailUploadProgress: 0,
    durationLabel: ""
  };
}

function createEmptySection(): SectionFormState {
  return {
    title: "",
    dayLabel: "",
    lessons: [createEmptyLesson()]
  };
}

export function AcademyCourseBuilderWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);
  const [categories, setCategories] = useState<CourseCategoryRecord[]>([]);
  const [instructors, setInstructors] = useState<InstructorRecord[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [instructorOpen, setInstructorOpen] = useState(false);
  const [thumbnailFileName, setThumbnailFileName] = useState("");
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [sections, setSections] = useState<SectionFormState[]>([createEmptySection()]);
  const [form, setForm] = useState({
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
    contentMode: "topic",
    status: "draft",
    visibility: "public",
    featured: false
  });
  const editCourseId = searchParams.get("edit");
  const isEditMode = Boolean(editCourseId);

  useEffect(() => {
    if (user?.role === "instructor" && !form.instructor) {
      setForm((current) => ({
        ...current,
        instructor: user.name
      }));
    }
  }, [form.instructor, user]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void loadCategories();
    void loadInstructors();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !editCourseId) {
      return;
    }

    void loadCourseForEdit(editCourseId);
  }, [accessToken, editCourseId]);

  const hasPendingUploads =
    isThumbnailUploading ||
    sections.some((section) =>
      section.lessons.some((lesson) => lesson.isVideoUploading || lesson.isThumbnailUploading)
    );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(editCourseId ? `/api/v1/courses/${editCourseId}` : "/api/v1/courses", {
        method: editCourseId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          instructor: form.instructor,
          shortDescription: form.shortDescription,
          description: form.description,
          thumbnailUrl: form.thumbnailUrl,
          price: Number(form.price) || 0,
          currency: form.currency,
          level: form.level,
          durationLabel: form.durationLabel,
          language: form.language,
          contentMode: form.contentMode,
          status: form.status,
          visibility: form.visibility,
          featured: form.featured,
          sections: sections.map((section) => ({
            title: section.title,
            dayLabel: section.dayLabel,
            lessons: section.lessons.map((lesson) => ({
              title: lesson.title,
              summary: lesson.summary,
              videoUrl: lesson.videoUrl,
              thumbnailUrl: lesson.thumbnailUrl,
              durationLabel: lesson.durationLabel
            }))
          }))
        })
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        toast.error(`Course could not be ${isEditMode ? "updated" : "created"}`, {
          description: result.error ?? "Please review the form and try again."
        });
        return;
      }

      toast.success(`Course ${isEditMode ? "updated" : "created"}`, {
        description: isEditMode
          ? "The course changes have been saved."
          : "The course record is ready for catalog and website publishing workflows."
      });

      router.push("/dashboard/academy/courses/all");
    } catch {
      toast.error(`Course could not be ${isEditMode ? "updated" : "created"}`, {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
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

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

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

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        return;
      }

      setInstructors(result.data);
    } catch {
      setInstructors([]);
    }
  }

  async function loadCourseForEdit(id: string) {
    setIsLoadingCourse(true);

    try {
      const response = await fetch(`/api/v1/courses/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<CourseBuilderRecord>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Course could not be loaded", {
          description: result.error ?? "Please try again."
        });
        router.replace("/dashboard/academy/courses/all");
        return;
      }

      const course = result.data;

      setForm({
        title: course.title,
        category: course.category,
        instructor: course.instructor,
        shortDescription: course.shortDescription,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        price: String(course.price),
        currency: course.currency,
        level: course.level,
        durationLabel: course.durationLabel,
        language: course.language,
        contentMode: course.contentMode,
        status: course.status,
        visibility: course.visibility,
        featured: course.featured
      });
      setThumbnailFileName(course.thumbnailUrl ? getUploadedAssetLabel(course.thumbnailUrl, "Current thumbnail selected") : "");
      setThumbnailUploadProgress(0);
      setIsThumbnailUploading(false);
      setSections(
        course.sections && course.sections.length > 0
          ? course.sections.map((section) => ({
              title: section.title,
              dayLabel: section.dayLabel,
              lessons:
                section.lessons && section.lessons.length > 0
                  ? section.lessons.map((lesson) => ({
                      title: lesson.title,
                      summary: lesson.summary,
                      videoUrl: lesson.videoUrl,
                      videoFileName: getUploadedAssetLabel(lesson.videoUrl, "Current video selected"),
                      isVideoUploading: false,
                      videoUploadProgress: 0,
                      thumbnailUrl: lesson.thumbnailUrl ?? "",
                      thumbnailFileName: lesson.thumbnailUrl
                        ? getUploadedAssetLabel(lesson.thumbnailUrl, "Current thumbnail selected")
                        : "",
                      isThumbnailUploading: false,
                      thumbnailUploadProgress: 0,
                      durationLabel: lesson.durationLabel
                    }))
                  : [createEmptyLesson()]
            }))
          : [createEmptySection()]
      );
    } catch {
      toast.error("Course could not be loaded", {
        description: "Please try again."
      });
      router.replace("/dashboard/academy/courses/all");
    } finally {
      setIsLoadingCourse(false);
    }
  }

  async function handleThumbnailChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setThumbnailFileName("");
      setThumbnailUploadProgress(0);
      setIsThumbnailUploading(false);
      setForm((current) => ({ ...current, thumbnailUrl: "" }));
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
      setThumbnailFileName(file.name);
      setIsThumbnailUploading(true);
      setThumbnailUploadProgress(0);

      const upload = await uploadFile({
        accessToken,
        file,
        kind: "course-thumbnail",
        onProgress: setThumbnailUploadProgress
      });

      setForm((current) => ({ ...current, thumbnailUrl: upload.url }));
    } catch {
      toast.error("Thumbnail could not be loaded", {
        description: "Please try a different image."
      });
      event.target.value = "";
      setThumbnailFileName("");
      setForm((current) => ({ ...current, thumbnailUrl: "" }));
    } finally {
      setIsThumbnailUploading(false);
    }
  }

  async function handleLessonVideoChange(
    event: React.ChangeEvent<HTMLInputElement>,
    sectionIndex: number,
    lessonIndex: number
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("video/")) {
      toast.error("Invalid lesson video", {
        description: "Please choose a video file."
      });
      event.target.value = "";
      return;
    }

    try {
      setSections((current) =>
        updateLesson(current, sectionIndex, lessonIndex, {
          ...current[sectionIndex].lessons[lessonIndex],
          videoFileName: file.name,
          isVideoUploading: true,
          videoUploadProgress: 0
        })
      );

      const [upload, durationLabel] = await Promise.all([
        uploadFile({
          accessToken,
          file,
          kind: "lesson-video",
          onProgress: (progress) =>
            setSections((current) =>
              updateLesson(current, sectionIndex, lessonIndex, {
                ...current[sectionIndex].lessons[lessonIndex],
                videoUploadProgress: progress
              })
            ),
        }),
        readVideoDurationLabel(file)
      ]);

      setSections((current) =>
        updateLesson(current, sectionIndex, lessonIndex, {
          ...current[sectionIndex].lessons[lessonIndex],
          videoUrl: upload.url,
          videoFileName: file.name,
          isVideoUploading: false,
          videoUploadProgress: 100,
          durationLabel
        })
      );
    } catch {
      toast.error("Lesson video could not be loaded", {
        description: "Please try a different video."
      });
      event.target.value = "";
      setSections((current) =>
        updateLesson(current, sectionIndex, lessonIndex, {
          ...current[sectionIndex].lessons[lessonIndex],
          videoUrl: "",
          videoFileName: "",
          isVideoUploading: false,
          videoUploadProgress: 0,
          durationLabel: ""
        })
      );
    }
  }

  async function handleLessonThumbnailChange(
    event: React.ChangeEvent<HTMLInputElement>,
    sectionIndex: number,
    lessonIndex: number
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      setSections((current) =>
        updateLesson(current, sectionIndex, lessonIndex, {
          ...current[sectionIndex].lessons[lessonIndex],
          thumbnailUrl: "",
          thumbnailFileName: "",
          isThumbnailUploading: false,
          thumbnailUploadProgress: 0
        })
      );
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid lesson thumbnail", {
        description: "Please choose an image file."
      });
      event.target.value = "";
      return;
    }

    try {
      setSections((current) =>
        updateLesson(current, sectionIndex, lessonIndex, {
          ...current[sectionIndex].lessons[lessonIndex],
          thumbnailFileName: file.name,
          isThumbnailUploading: true,
          thumbnailUploadProgress: 0
        })
      );

      const upload = await uploadFile({
        accessToken,
        file,
        kind: "lesson-thumbnail",
        onProgress: (progress) =>
          setSections((current) =>
            updateLesson(current, sectionIndex, lessonIndex, {
              ...current[sectionIndex].lessons[lessonIndex],
              thumbnailUploadProgress: progress
            })
          ),
      });

      setSections((current) =>
        updateLesson(current, sectionIndex, lessonIndex, {
          ...current[sectionIndex].lessons[lessonIndex],
          thumbnailUrl: upload.url,
          thumbnailFileName: file.name,
          isThumbnailUploading: false,
          thumbnailUploadProgress: 100
        })
      );
    } catch {
      toast.error("Lesson thumbnail could not be loaded", {
        description: "Please try a different image."
      });
      event.target.value = "";
      setSections((current) =>
        updateLesson(current, sectionIndex, lessonIndex, {
          ...current[sectionIndex].lessons[lessonIndex],
          thumbnailUrl: "",
          thumbnailFileName: "",
          isThumbnailUploading: false,
          thumbnailUploadProgress: 0
        })
      );
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? "Edit Course" : config.title ?? "Course builder"}</CardTitle>
            <p className="text-[14px] leading-[22px] text-muted-foreground">
              Capture the fields needed for both the LMS catalog and the public-facing website listing.
            </p>
          </CardHeader>
          <CardContent>
            {isEditMode && isLoadingCourse ? (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
                Loading course details...
              </div>
            ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <Field
                label="Course title"
                required
                value={form.title}
                onChange={(value) => setForm((current) => ({ ...current, title: value }))}
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ComboboxField
                  label="Category"
                  required
                  value={form.category}
                  options={categories.map((category) => ({
                    label: category.name,
                    value: category.name
                  }))}
                  open={categoryOpen}
                  onOpenChange={setCategoryOpen}
                  placeholder={categories.length > 0 ? "Select category" : "No categories available"}
                  searchPlaceholder="Search categories..."
                  emptyLabel="No matching categories found."
                  disabled={categories.length === 0}
                  onChange={(value) => setForm((current) => ({ ...current, category: value }))}
                />
                <ComboboxField
                  label="Instructor"
                  required
                  value={form.instructor}
                  options={instructors.map((instructor) => ({
                    label: instructor.name,
                    value: instructor.name
                  }))}
                  open={instructorOpen}
                  onOpenChange={setInstructorOpen}
                  placeholder={instructors.length > 0 ? "Select instructor" : "No instructors available"}
                  searchPlaceholder="Search instructors..."
                  emptyLabel="No matching instructors found."
                  disabled={instructors.length === 0 || user?.role === "instructor"}
                  onChange={(value) => setForm((current) => ({ ...current, instructor: value }))}
                />
                <Field
                  label="Duration"
                  required
                  value={form.durationLabel}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, durationLabel: value }))
                  }
                />
                <SelectField
                  label="Language"
                  required
                  value={form.language}
                  options={[
                    { label: "English", value: "English" },
                    { label: "Hindi", value: "Hindi" }
                  ]}
                  onChange={(value) => setForm((current) => ({ ...current, language: value }))}
                />
                <SelectField
                  label="Content layout"
                  required
                  value={form.contentMode}
                  options={[
                    { label: "Topic wise", value: "topic" },
                    { label: "Day wise", value: "day" }
                  ]}
                  onChange={(value) => setForm((current) => ({ ...current, contentMode: value }))}
                />
                <Field
                  label="Price"
                  type="number"
                  required
                  value={form.price}
                  onChange={(value) => setForm((current) => ({ ...current, price: value }))}
                />
                <SelectField
                  label="Currency"
                  required
                  value={form.currency}
                  options={[
                    { label: "INR", value: "INR" },
                    { label: "Dollar", value: "USD" }
                  ]}
                  onChange={(value) => setForm((current) => ({ ...current, currency: value }))}
                />
                <SelectField
                  label="Level"
                  required
                  value={form.level}
                  options={[
                    { label: "Beginner", value: "beginner" },
                    { label: "Intermediate", value: "intermediate" },
                    { label: "Advanced", value: "advanced" }
                  ]}
                  onChange={(value) => setForm((current) => ({ ...current, level: value }))}
                />
                <SelectField
                  label="Status"
                  required
                  value={form.status}
                  options={[
                    { label: "Draft", value: "draft" },
                    { label: "Published", value: "published" },
                    { label: "Archived", value: "archived" }
                  ]}
                  onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                />
                <SelectField
                  label="Visibility"
                  required
                  value={form.visibility}
                  options={[
                    { label: "Public", value: "public" },
                    { label: "Private", value: "private" },
                    { label: "Unlisted", value: "unlisted" }
                  ]}
                  onChange={(value) => setForm((current) => ({ ...current, visibility: value }))}
                />
              </div>

              <FileField
                label="Thumbnail"
                required
                value={thumbnailFileName}
                accept="image/*"
                isUploading={isThumbnailUploading}
                uploadProgress={thumbnailUploadProgress}
                helperText="Choose an image file. Upload starts immediately."
                onChange={handleThumbnailChange}
              />

              <TextAreaField
                label="Short description"
                required
                value={form.shortDescription}
                onChange={(value) =>
                  setForm((current) => ({ ...current, shortDescription: value }))
                }
                rows={3}
              />

              <TextAreaField
                label="Full description"
                required
                value={form.description}
                onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                rows={6}
              />

              <div className="space-y-4 rounded-md border border-border/70 bg-muted/10 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[15px] font-medium text-foreground">Course content</div>
                    <div className="text-[13px] leading-[20px] text-muted-foreground">
                      Build the syllabus {form.contentMode === "day" ? "day wise" : "topic wise"} and upload lesson videos.
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSections((current) => [...current, createEmptySection()])}
                  >
                    Add Section
                  </Button>
                </div>

                <div className="space-y-4">
                  {sections.map((section, sectionIndex) => (
                    <div key={`section-${sectionIndex}`} className="rounded-md border border-border/70 bg-card p-4">
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="text-[14px] font-medium text-foreground">
                          Section {sectionIndex + 1}
                        </div>
                        {sections.length > 1 ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setSections((current) => current.filter((_, index) => index !== sectionIndex))
                            }
                          >
                            Remove Section
                          </Button>
                        ) : null}
                      </div>

                      <div className={cn("grid gap-4", form.contentMode === "day" ? "md:grid-cols-2" : "")}>
                        <Field
                          label={form.contentMode === "day" ? "Section title / topic" : "Section title"}
                          required
                          value={section.title}
                          onChange={(value) =>
                            setSections((current) =>
                              current.map((item, index) =>
                                index === sectionIndex ? { ...item, title: value } : item
                              )
                            )
                          }
                        />
                        {form.contentMode === "day" ? (
                          <Field
                            label="Day label"
                            required
                            value={section.dayLabel}
                            onChange={(value) =>
                              setSections((current) =>
                                current.map((item, index) =>
                                  index === sectionIndex ? { ...item, dayLabel: value } : item
                                )
                              )
                            }
                          />
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-4">
                        {section.lessons.map((lesson, lessonIndex) => (
                          <div
                            key={`section-${sectionIndex}-lesson-${lessonIndex}`}
                            className="rounded-md border border-border/70 bg-muted/10 p-4"
                          >
                            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="text-[14px] font-medium text-foreground">
                                Lesson {lessonIndex + 1}
                              </div>
                              {section.lessons.length > 1 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() =>
                                    setSections((current) =>
                                      current.map((item, index) =>
                                        index === sectionIndex
                                          ? {
                                              ...item,
                                              lessons: item.lessons.filter((_, innerIndex) => innerIndex !== lessonIndex)
                                            }
                                          : item
                                      )
                                    )
                                  }
                                >
                                  Remove Lesson
                                </Button>
                              ) : null}
                            </div>

                            <Field
                              label="Lesson title"
                              required
                              value={lesson.title}
                              onChange={(value) =>
                                setSections((current) =>
                                  updateLesson(current, sectionIndex, lessonIndex, {
                                    ...lesson,
                                    title: value
                                  })
                                )
                              }
                            />

                            <div className="mt-4">
                              <FileField
                                label="Lesson video"
                                required
                                value={lesson.videoFileName}
                                accept="video/*"
                                isUploading={lesson.isVideoUploading}
                                uploadProgress={lesson.videoUploadProgress}
                                helperText="Choose a video file. Upload starts immediately."
                                onChange={(event) => void handleLessonVideoChange(event, sectionIndex, lessonIndex)}
                              />
                            </div>

                            <div className="mt-4">
                              <FileField
                                label="Lesson thumbnail"
                                value={lesson.thumbnailFileName}
                                accept="image/*"
                                isUploading={lesson.isThumbnailUploading}
                                uploadProgress={lesson.thumbnailUploadProgress}
                                helperText={
                                  form.thumbnailUrl
                                    ? "Optional. If not uploaded, the course thumbnail will be used."
                                    : "Optional. Upload a lesson image or the course thumbnail will be used when available."
                                }
                                onChange={(event) =>
                                  void handleLessonThumbnailChange(event, sectionIndex, lessonIndex)
                                }
                              />
                            </div>

                            <div className="mt-4">
                              <TextAreaField
                                label="Lesson summary"
                                value={lesson.summary}
                                onChange={(value) =>
                                  setSections((current) =>
                                    updateLesson(current, sectionIndex, lessonIndex, {
                                      ...lesson,
                                      summary: value
                                    })
                                  )
                                }
                                rows={3}
                              />
                            </div>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setSections((current) =>
                              current.map((item, index) =>
                                index === sectionIndex
                                  ? { ...item, lessons: [...item.lessons, createEmptyLesson()] }
                                  : item
                              )
                            )
                          }
                        >
                          Add Lesson
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[15px] font-medium text-foreground">Catalog prominence</div>
                    <div className="text-[13px] leading-[20px] text-muted-foreground">
                      Featured courses can be prioritized on the marketing site or in the academy landing page.
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-[14px] text-foreground">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, featured: event.target.checked }))
                      }
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    Mark as featured
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="mr-auto text-[13px] leading-[20px] text-muted-foreground">
                  {categories.length > 0
                    ? `Using ${categories.length} backend-managed categories.`
                    : "No saved categories yet. You can still type a category manually."}
                </div>
                <Button type="submit" disabled={isSubmitting || hasPendingUploads || isLoadingCourse}>
                  {isSubmitting
                    ? "Saving..."
                    : hasPendingUploads
                      ? "Upload in progress..."
                      : isEditMode
                        ? "Update Course"
                        : "Create Course"}
                </Button>
              </div>
            </form>
            )}
          </CardContent>
        </Card>

        <Card className="xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-3rem)] xl:overflow-auto">
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <p className="text-[14px] leading-[22px] text-muted-foreground">
              This is the course card and detail surface your public website will reflect in real time.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-md border border-border/70 bg-card shadow-[0_10px_28px_rgba(75,70,92,0.12)]">
              <div
                className="relative aspect-[16/9] bg-cover bg-center"
                style={{
                  backgroundImage: form.thumbnailUrl
                    ? `linear-gradient(180deg, rgba(22, 24, 33, 0.08), rgba(22, 24, 33, 0.55)), url(${form.thumbnailUrl})`
                    : "linear-gradient(135deg, rgba(115,103,240,0.18), rgba(0,186,209,0.18), rgba(255,159,67,0.18))"
                }}
              >
                <div className="absolute inset-0 flex items-end justify-between p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-white/90 text-foreground">{formatLabel(form.level)}</Badge>
                    <Badge className="bg-white/90 text-foreground">{form.visibility}</Badge>
                    {form.featured ? <Badge className="bg-emerald-500 text-white">Featured</Badge> : null}
                  </div>
                  <Badge className="bg-[hsl(var(--primary))] text-white">{formatLabel(form.status)}</Badge>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="space-y-2">
                  <div className="text-[12px] uppercase tracking-[0.35px] text-muted-foreground">
                    {form.category || "Course category"}
                  </div>
                  <h3 className="inline-flex max-w-full rounded-md bg-[hsl(var(--primary))]/10 px-3 py-2 text-[22px] font-semibold leading-[30px] tracking-[-0.03em] text-[hsl(var(--primary))]">
                    <span className="truncate">{form.title || "Course title appears here"}</span>
                  </h3>
                  <p className="text-[14px] leading-[22px] text-muted-foreground">
                    {form.shortDescription || "Short description appears here and is used for the public course card."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <PreviewStat label="Instructor" value={form.instructor || "TBA"} />
                  <PreviewStat label="Duration" value={form.durationLabel || "TBA"} />
                  <PreviewStat
                    label="Price"
                    value={formatPrice(form.price, form.currency)}
                  />
                  <PreviewStat label="Language" value={form.language || "TBA"} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  type = "text",
  list
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  list?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <Input type={type} list={list} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FileField({
  label,
  required,
  value,
  accept,
  isUploading,
  uploadProgress,
  disabled,
  helperText,
  onChange
}: {
  label: string;
  required?: boolean;
  value?: string;
  accept?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  disabled?: boolean;
  helperText?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const progressLabel =
    isUploading && typeof uploadProgress === "number"
      ? `${value || "File"} uploading... ${uploadProgress}%`
      : value || helperText || "Choose a file.";

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
          disabled={disabled || isUploading}
          onChange={onChange}
          className="block w-full text-[14px] text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-foreground"
        />
        {isUploading ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-200"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
        ) : null}
        <div className="mt-2 text-[12px] text-muted-foreground">
          {progressLabel}
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

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.35px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-[14px] font-medium leading-[20px] text-foreground">{value}</div>
    </div>
  );
}

function formatPrice(value: string, currency: string) {
  const amount = Number(value) || 0;
  return `${currency} ${amount.toLocaleString("en-IN")}`;
}

function formatLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getUploadedAssetLabel(value: string, fallback: string) {
  const parts = value.split("/");
  const label = parts[parts.length - 1];
  return label || fallback;
}

function uploadFile({
  accessToken,
  file,
  kind,
  onProgress
}: {
  accessToken: string | null;
  file: File;
  kind: "course-thumbnail" | "lesson-thumbnail" | "lesson-video";
  onProgress?: (progress: number) => void;
}) {
  return new Promise<UploadResponse>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", file);
    formData.append("kind", kind);

    request.open("POST", "/api/v1/uploads");

    if (accessToken) {
      request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    request.onerror = () => reject(new Error("Upload failed"));
    request.onabort = () => reject(new Error("Upload cancelled"));
    request.onload = () => {
      try {
        const response = JSON.parse(request.responseText) as ApiResponse<UploadResponse>;

        if (request.status === 401) {
          reject(new Error("Unauthorized"));
          return;
        }

        if (request.status < 200 || request.status >= 300 || !response.success || !response.data) {
          reject(new Error(response.error ?? "Upload failed"));
          return;
        }

        onProgress?.(100);
        resolve(response.data);
      } catch {
        reject(new Error("Upload failed"));
      }
    };

    request.send(formData);
  });
}

function readVideoDurationLabel(file: File) {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const durationInSeconds = Number.isFinite(video.duration) ? Math.round(video.duration) : 0;
      cleanup();

      if (durationInSeconds <= 0) {
        reject(new Error("Unable to read video duration"));
        return;
      }

      resolve(formatDurationLabel(durationInSeconds));
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Unable to read video duration"));
    };
    video.src = objectUrl;
  });
}

function formatDurationLabel(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function updateLesson(
  sections: SectionFormState[],
  sectionIndex: number,
  lessonIndex: number,
  nextLesson: LessonFormState
) {
  return sections.map((section, currentSectionIndex) =>
    currentSectionIndex === sectionIndex
      ? {
          ...section,
          lessons: section.lessons.map((lesson, currentLessonIndex) =>
            currentLessonIndex === lessonIndex ? nextLesson : lesson
          )
        }
      : section
  );
}

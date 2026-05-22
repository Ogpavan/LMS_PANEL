"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, Clock3, Globe2, Layers3, PencilLine, User2 } from "lucide-react";

import type { PageDefinition } from "@/types/admin";

import { AppShell } from "@/components/layouts/app-shell";
import { NotFoundPage } from "@/components/layouts/not-found-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";

interface CourseDetailRecord {
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
  sections?: {
    id: number;
    title: string;
    dayLabel: string;
    lessons?: {
      id: number;
      title: string;
      summary: string;
      durationLabel: string;
    }[];
  }[];
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

const pageDefinition: PageDefinition = {
  key: "academy.courses.view",
  title: "Course Details",
  href: "/dashboard/academy/courses/view",
  moduleKey: "academy",
  layoutKey: "stack"
};

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const clearSession = useAuthStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.user);
  const [course, setCourse] = useState<CourseDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMissing, setIsMissing] = useState(false);

  const isExpired = !expiresAt || Date.parse(expiresAt) <= Date.now();
  const courseId = Number(params?.id);

  useEffect(() => {
    if (hydrated && (!accessToken || isExpired)) {
      if (accessToken && isExpired) {
        clearSession();
      }

      router.replace("/login");
    }
  }, [accessToken, clearSession, hydrated, isExpired, router]);

  useEffect(() => {
    if (!hydrated || !accessToken || isExpired || !Number.isInteger(courseId) || courseId <= 0) {
      if (hydrated && (!Number.isInteger(courseId) || courseId <= 0)) {
        setIsMissing(true);
        setIsLoading(false);
      }

      return;
    }

    let active = true;

    async function loadCourse() {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/v1/courses/${courseId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        const result = (await response.json()) as ApiResponse<CourseDetailRecord>;

        if (!active) {
          return;
        }

        if (response.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (response.status === 404 || !response.ok || !result.success || !result.data) {
          setCourse(null);
          setIsMissing(true);
          return;
        }

        setCourse(result.data);
        setIsMissing(false);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadCourse();

    return () => {
      active = false;
    };
  }, [accessToken, clearSession, courseId, hydrated, isExpired, router]);

  const breadcrumbs = useMemo(
    () => [
      { title: "Courses", href: "/dashboard/academy/courses/all" },
      { title: "Browse Courses", href: "/dashboard/academy/courses/all" },
      { title: course?.title ?? "Course Details", href: "#" }
    ],
    [course?.title]
  );

  if (!hydrated || !accessToken || isExpired) {
    return null;
  }

  return (
    <AppShell page={pageDefinition} breadcrumbs={breadcrumbs} section="Learning Management">
      {isLoading ? (
        <Card>
          <CardContent className="px-5 py-10 text-center text-[14px] text-muted-foreground">
            Loading course details...
          </CardContent>
        </Card>
      ) : isMissing || !course ? (
        <NotFoundPage />
      ) : (
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div
              className="relative aspect-[16/6] bg-cover bg-center"
              style={{
                backgroundImage: course.thumbnailUrl
                  ? `linear-gradient(180deg, rgba(22,24,33,0.1), rgba(22,24,33,0.68)), url(${course.thumbnailUrl})`
                  : "linear-gradient(135deg, rgba(115,103,240,0.22), rgba(0,186,209,0.18), rgba(255,159,67,0.22))"
              }}
            >
              <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-5">
                <Badge className="bg-white/90 text-foreground">{formatLabel(course.level)}</Badge>
                {course.featured ? <Badge className="bg-emerald-500 text-white">Featured</Badge> : null}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="text-[12px] font-medium uppercase tracking-[0.3px] text-white/80">
                  {course.category}
                </div>
                <h1 className="mt-1 text-[32px] font-semibold leading-[40px]">{course.title}</h1>
                <p className="mt-3 max-w-3xl text-[15px] leading-[24px] text-white/88">
                  {course.shortDescription}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>About this course</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <MetaPill icon={User2} value={course.instructor} />
                    <MetaPill icon={Globe2} value={course.language} />
                    <MetaPill icon={Clock3} value={course.durationLabel || "TBA"} />
                    <MetaPill icon={Layers3} value={`${course.sections?.length ?? 0} sections`} />
                    <MetaPill icon={BookOpen} value={`${countLessons(course)} lessons`} />
                  </div>
                  <p className="text-[14px] leading-[24px] text-muted-foreground">
                    {course.description}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Curriculum</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(course.sections ?? []).map((section, index) => (
                    <div key={section.id} className="rounded-md border border-border/70 bg-card">
                      <div className="border-b border-border/70 px-4 py-3">
                        <div className="text-[15px] font-medium text-foreground">
                          {index + 1}. {section.title}
                        </div>
                        {section.dayLabel ? (
                          <div className="mt-1 text-[12px] uppercase tracking-[0.28px] text-muted-foreground">
                            {section.dayLabel}
                          </div>
                        ) : null}
                      </div>
                      <div className="divide-y divide-border/70">
                        {(section.lessons ?? []).map((lesson, lessonIndex) => (
                          <div key={lesson.id} className="px-4 py-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-[14px] font-medium text-foreground">
                                  {lessonIndex + 1}. {lesson.title}
                                </div>
                                {lesson.summary ? (
                                  <div className="mt-1 text-[13px] leading-[20px] text-muted-foreground">
                                    {lesson.summary}
                                  </div>
                                ) : null}
                              </div>
                              <div className="shrink-0 text-[12px] text-muted-foreground">
                                {lesson.durationLabel || "TBA"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Course info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Price" value={`${course.currency} ${course.price.toLocaleString("en-IN")}`} />
                  <InfoRow label="Status" value={formatLabel(course.status)} />
                  <InfoRow label="Visibility" value={formatLabel(course.visibility)} />
                  <InfoRow label="Language" value={course.language} />
                  <InfoRow label="Duration" value={course.durationLabel || "TBA"} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 p-5">
                  {user?.role !== "student" ? (
                    <Link href={`/dashboard/academy/courses/create?edit=${course.id}`}>
                      <Button className="w-full">
                        <PencilLine className="h-4 w-4" />
                        Edit Course
                      </Button>
                    </Link>
                  ) : null}
                  <Link href="/dashboard/academy/courses/all">
                    <Button variant="outline" className="w-full">
                      Back to Browse Courses
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MetaPill({ icon: Icon, value }: { icon: typeof Clock3; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-muted/30 px-3 py-2 text-[13px] font-medium text-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-muted/20 px-4 py-3">
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      <span className="text-[13px] text-muted-foreground">{value}</span>
    </div>
  );
}

function countLessons(course: CourseDetailRecord) {
  return (course.sections ?? []).reduce(
    (total, section) => total + (section.lessons?.length ?? 0),
    0
  );
}

function formatLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

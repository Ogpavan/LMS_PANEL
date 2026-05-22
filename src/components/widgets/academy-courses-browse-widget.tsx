"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Globe2, RefreshCcw, User2, Video } from "lucide-react";
import { toast } from "sonner";

import type { WidgetRendererProps } from "@/types/admin";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

interface CourseBrowseRecord {
  id: number;
  title: string;
  category: string;
  instructor: string;
  shortDescription: string;
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

export function AcademyCoursesBrowseWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.user);
  const [records, setRecords] = useState<CourseBrowseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadCourses();
  }, [accessToken]);

  const visibleCourses = useMemo(() => {
    return records.filter((record) => {
      if (user?.role === "student") {
        return record.status.toLowerCase() === "published" && record.visibility.toLowerCase() === "public";
      }

      return true;
    });
  }, [records, user?.role]);

  async function loadCourses() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/courses", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<CourseBrowseRecord[]>;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[24px] font-medium leading-[32px] text-foreground">
            {config.title ?? "Browse courses"}
          </h2>
          <p className="mt-1 text-[14px] leading-[22px] text-muted-foreground">
            Browse the academy catalog in the same card-driven format learners experience.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void loadCourses()} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          {user?.role !== "student" ? (
            <Link href="/dashboard/academy/courses/create">
              <Button>Create Course</Button>
            </Link>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
          Loading course catalog...
        </div>
      ) : visibleCourses.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[14px] text-muted-foreground">
          No courses are available in the catalog yet.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleCourses.map((record) => {
            const lessonCount = (record.sections ?? []).reduce(
              (total, section) => total + (section.lessons?.length ?? 0),
              0
            );

            return (
              <article
                key={record.id}
                className="overflow-hidden rounded-md border border-border/80 bg-card shadow-shell"
              >
                <div
                  className="relative aspect-[16/10] bg-cover bg-center"
                  style={{
                    backgroundImage: record.thumbnailUrl
                      ? `linear-gradient(180deg, rgba(22, 24, 33, 0.08), rgba(22, 24, 33, 0.62)), url(${record.thumbnailUrl})`
                      : "linear-gradient(135deg, rgba(115,103,240,0.22), rgba(0,186,209,0.18), rgba(255,159,67,0.22))"
                  }}
                >
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-4">
                    <Badge className="bg-white/90 text-foreground">{formatLabel(record.level)}</Badge>
                    {record.featured ? (
                      <Badge className="bg-emerald-500 text-white">Featured</Badge>
                    ) : null}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="text-[12px] font-medium uppercase tracking-[0.3px] text-white/80">
                      {record.category}
                    </div>
                    <h3 className="mt-1 text-[20px] font-semibold leading-[28px]">
                      {record.title}
                    </h3>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <p className="text-[14px] leading-[22px] text-muted-foreground">
                    {record.shortDescription}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <CatalogMeta icon={User2} value={record.instructor} />
                    <CatalogMeta icon={Globe2} value={record.language} />
                    <CatalogMeta icon={Clock3} value={record.durationLabel || "TBA"} />
                    <CatalogMeta icon={Video} value={`${lessonCount} lessons`} />
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                    <div>
                      <div className="text-[12px] uppercase tracking-[0.3px] text-muted-foreground">
                        Price
                      </div>
                      <div className="text-[22px] font-semibold leading-[30px] text-foreground">
                        {formatPrice(record.price, record.currency)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {user?.role !== "student" ? (
                        <Link href={`/dashboard/academy/courses/create?edit=${record.id}`}>
                          <Button variant="outline">Edit</Button>
                        </Link>
                      ) : null}
                      <Link href={`/dashboard/academy/courses/view/${record.id}`}>
                        <Button>View Course</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CatalogMeta({
  icon: Icon,
  value
}: {
  icon: typeof Clock3;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-muted/30 px-3 py-2 text-[13px] font-medium text-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{value}</span>
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

function formatPrice(price: number, currency: string) {
  return `${currency} ${price.toLocaleString("en-IN")}`;
}

import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { normalizeCoursePayload } from "@/server/course";
import { prisma } from "@/server/prisma";

interface CoursePayload {
  title?: string;
  slug?: string;
  category?: string;
  instructor?: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  price?: number;
  currency?: string;
  level?: string;
  durationLabel?: string;
  language?: string;
  contentMode?: string;
  status?: string;
  visibility?: string;
  featured?: boolean;
  sections?: {
    title?: string;
    dayLabel?: string;
    lessons?: {
      title?: string;
      summary?: string;
      videoUrl?: string;
      thumbnailUrl?: string;
      durationLabel?: string;
    }[];
  }[];
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR", "STUDENT"], {
    requiredPermission: "academy.courses.create"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid course id", 422);
  }

  await ensureDatabaseSetup();

  const result = await prisma.course.findUnique({
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" }
          }
        }
      }
    },
    where: { id }
  });

  if (!result) {
    return apiError("Course not found", 404);
  }

  if (
    auth.user.role === "STUDENT" &&
    (result.status.toLowerCase() !== "published" || result.visibility.toLowerCase() !== "public")
  ) {
    return apiError("Course not found", 404);
  }

  return apiResponse({
    success: true,
    data: result
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.courses.create"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  const payload = await readJson<CoursePayload>(request);

  if (!id) {
    return apiError("Invalid course id", 422);
  }

  if (!payload?.title || !payload.category || !payload.instructor || !payload.status) {
    return apiError("Title, category, instructor, and status are required", 422);
  }

  await ensureDatabaseSetup();

  const data = normalizeCoursePayload(payload);

  if (!data.slug) {
    return apiError("Slug could not be generated for this course", 422);
  }

  if (!data.shortDescription || !data.description) {
    return apiError("Short description and full description are required", 422);
  }

  const existing = await prisma.course.findUnique({
    where: { id },
    select: { id: true, slug: true }
  });

  if (!existing) {
    return apiError("Course not found", 404);
  }

  const conflictingCourse =
    data.slug !== existing.slug
      ? await prisma.course.findUnique({
          where: { slug: data.slug },
          select: { id: true }
        })
      : null;

  if (conflictingCourse) {
    return apiError("Another course already uses this slug", 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    if (payload.sections) {
      if (data.sections.length === 0) {
        throw new Error("__EMPTY_SECTIONS__");
      }

      await tx.courseLesson.deleteMany({
        where: {
          section: {
            courseId: id
          }
        }
      });

      await tx.courseSection.deleteMany({
        where: {
          courseId: id
        }
      });
    }

    return tx.course.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        category: data.category,
        instructor: data.instructor,
        shortDescription: data.shortDescription,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        price: data.price,
        currency: data.currency,
        level: data.level,
        durationLabel: data.durationLabel,
        language: data.language,
        contentMode: data.contentMode,
        status: data.status,
        visibility: data.visibility,
        featured: data.featured,
        ...(payload.sections
          ? {
              sections: {
                create: data.sections.map((section) => ({
                  title: section.title,
                  dayLabel: section.dayLabel,
                  orderIndex: section.orderIndex,
                  lessons: {
                    create: section.lessons.map((lesson) => ({
                      title: lesson.title,
                      summary: lesson.summary,
                      videoUrl: lesson.videoUrl,
                      thumbnailUrl: lesson.thumbnailUrl,
                      durationLabel: lesson.durationLabel,
                      orderIndex: lesson.orderIndex
                    }))
                  }
                }))
              }
            }
          : {})
      },
      include: {
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" }
            }
          }
        }
      }
    });
  }).catch((error: Error) => {
    if (error.message === "__EMPTY_SECTIONS__") {
      return null;
    }

    throw error;
  });

  if (!result) {
    return apiError("At least one course section is required", 422);
  }

  return apiResponse({
    success: true,
    data: result
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.courses.all"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid course id", 422);
  }

  await ensureDatabaseSetup();

  const existing = await prisma.course.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Course not found", 404);
  }

  await prisma.course.delete({
    where: { id }
  });

  return apiResponse({
    success: true
  });
}

export const OPTIONS = handleOptions;

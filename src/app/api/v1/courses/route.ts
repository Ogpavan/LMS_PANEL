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

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR", "STUDENT"], {
    requiredPermission: "academy.courses.all"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const result = await prisma.course.findMany({
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
    orderBy: { id: "desc" }
  });

  return apiResponse({
    success: true,
    data: result
  });
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.courses.create"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const payload = await readJson<CoursePayload>(request);

  if (!payload?.title || !payload.category || !payload.instructor) {
    return apiError("Title, category, and instructor are required", 422);
  }

  await ensureDatabaseSetup();

  const data = normalizeCoursePayload(payload);

  if (!data.slug) {
    return apiError("Slug could not be generated for this course", 422);
  }

  if (!data.shortDescription || !data.description) {
    return apiError("Short description and full description are required", 422);
  }

  if (!payload.sections || data.sections.length === 0) {
    return apiError("At least one course section is required", 422);
  }

  const existingCourse = await prisma.course.findUnique({
    where: { slug: data.slug },
    select: { id: true }
  });

  if (existingCourse) {
    return apiError("A course already exists with this slug", 409);
  }

  const result = await prisma.course.create({
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

  return apiResponse(
    {
      success: true,
      data: result
    },
    { status: 201 }
  );
}

export const OPTIONS = handleOptions;

import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { normalizeCourseCategoryPayload, type CourseCategoryPayloadInput } from "@/server/course";
import { prisma } from "@/server/prisma";

async function getCourseCountsByCategory() {
  const counts = await prisma.course.groupBy({
    by: ["category"],
    _count: {
      _all: true
    }
  });

  return new Map(counts.map((entry) => [entry.category.toLowerCase(), entry._count._all]));
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR", "STUDENT"], {
    requiredPermission: "academy.courses.categories"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const [categories, countsByCategory] = await Promise.all([
    prisma.courseCategory.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }]
    }),
    getCourseCountsByCategory()
  ]);

  return apiResponse({
    success: true,
    data: categories.map((category) => ({
      ...category,
      courseCount: countsByCategory.get(category.name.toLowerCase()) ?? 0
    }))
  });
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.courses.categories"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const payload = await readJson<CourseCategoryPayloadInput>(request);

  if (!payload?.name) {
    return apiError("Category name is required", 422);
  }

  await ensureDatabaseSetup();

  const data = normalizeCourseCategoryPayload(payload);

  if (!data.slug) {
    return apiError("Slug could not be generated for this category", 422);
  }

  const existing = await prisma.courseCategory.findFirst({
    where: {
      OR: [{ name: data.name }, { slug: data.slug }]
    },
    select: { id: true }
  });

  if (existing) {
    return apiError("A category already exists with this name", 409);
  }

  const result = await prisma.courseCategory.create({
    data
  });

  return apiResponse(
    {
      success: true,
      data: {
        ...result,
        courseCount: 0
      }
    },
    { status: 201 }
  );
}

export const OPTIONS = handleOptions;

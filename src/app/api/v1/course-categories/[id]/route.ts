import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { normalizeCourseCategoryPayload, type CourseCategoryPayloadInput } from "@/server/course";
import { prisma } from "@/server/prisma";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getCourseCountByName(name: string) {
  return prisma.course.count({
    where: {
      category: name
    }
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR", "STUDENT"], {
    requiredPermission: "academy.courses.categories"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid category id", 422);
  }

  await ensureDatabaseSetup();

  const category = await prisma.courseCategory.findUnique({
    where: { id }
  });

  if (!category) {
    return apiError("Category not found", 404);
  }

  const courseCount = await getCourseCountByName(category.name);

  return apiResponse({
    success: true,
    data: {
      ...category,
      courseCount
    }
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.courses.categories"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  const payload = await readJson<CourseCategoryPayloadInput>(request);

  if (!id) {
    return apiError("Invalid category id", 422);
  }

  if (!payload?.name) {
    return apiError("Category name is required", 422);
  }

  await ensureDatabaseSetup();

  const existing = await prisma.courseCategory.findUnique({
    where: { id }
  });

  if (!existing) {
    return apiError("Category not found", 404);
  }

  const data = normalizeCourseCategoryPayload(payload);

  if (!data.slug) {
    return apiError("Slug could not be generated for this category", 422);
  }

  const conflictingCategory =
    data.slug !== existing.slug || data.name !== existing.name
      ? await prisma.courseCategory.findFirst({
          where: {
            id: { not: id },
            OR: [{ name: data.name }, { slug: data.slug }]
          },
          select: { id: true }
        })
      : null;

  if (conflictingCategory) {
    return apiError("Another category already uses this name", 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.courseCategory.update({
      where: { id },
      data
    });

    if (existing.name !== data.name) {
      await tx.course.updateMany({
        where: {
          category: existing.name
        },
        data: {
          category: data.name
        }
      });
    }

    return updated;
  });

  const courseCount = await getCourseCountByName(result.name);

  return apiResponse({
    success: true,
    data: {
      ...result,
      courseCount
    }
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.courses.categories"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid category id", 422);
  }

  await ensureDatabaseSetup();

  const existing = await prisma.courseCategory.findUnique({
    where: { id }
  });

  if (!existing) {
    return apiError("Category not found", 404);
  }

  const courseCount = await getCourseCountByName(existing.name);

  if (courseCount > 0) {
    return apiError("This category is assigned to active courses and cannot be deleted", 409);
  }

  await prisma.courseCategory.delete({
    where: { id }
  });

  return apiResponse({
    success: true
  });
}

export const OPTIONS = handleOptions;

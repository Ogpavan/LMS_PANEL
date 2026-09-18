import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { prisma } from "@/server/prisma";

interface UpdateAssignmentPayload {
  title?: string;
  description?: string;
  courseId?: number | string;
  dueDate?: string;
  totalMarks?: number | string;
  status?: string;
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR", "STUDENT"], {
      requiredPermission: "academy.assessments.assignments"
    });

    if ("error" in auth) {
      return auth.error;
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return apiError("Invalid assignment id", 422);
    }

    await ensureDatabaseSetup();

    const result = await prisma.assignment.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true }
        }
      }
    });

    if (!result) {
      return apiError("Assignment not found", 404);
    }

    return apiResponse({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("GET /api/v1/assignments/[id] error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to fetch assignment",
      500
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
      requiredPermission: "academy.assessments.assignments"
    });

    if ("error" in auth) {
      return auth.error;
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return apiError("Invalid assignment id", 422);
    }

    const payload = await readJson<UpdateAssignmentPayload>(request);

    await ensureDatabaseSetup();

    const existing = await prisma.assignment.findUnique({
      where: { id },
      select: { id: true, courseId: true }
    });

    if (!existing) {
      return apiError("Assignment not found", 404);
    }

    const updateData: {
      title?: string;
      description?: string;
      courseId?: number;
      dueDate?: Date;
      totalMarks?: number;
      status?: string;
    } = {};

    if (payload?.title !== undefined) {
      const title = payload.title.trim();
      if (!title) {
        return apiError("Assignment title cannot be empty", 422);
      }
      updateData.title = title;
    }

    if (payload?.description !== undefined) {
      updateData.description = payload.description.trim();
    }

    if (payload?.courseId !== undefined) {
      const courseId = Number(payload.courseId);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return apiError("Invalid course selected", 422);
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true }
      });

      if (!course) {
        return apiError("Selected course does not exist", 404);
      }

      updateData.courseId = courseId;
    }

    if (payload?.dueDate !== undefined) {
      const dueDate = new Date(payload.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return apiError("Invalid due date", 422);
      }
      updateData.dueDate = dueDate;
    }

    if (payload?.totalMarks !== undefined) {
      const totalMarks = Number(payload.totalMarks);
      if (!Number.isInteger(totalMarks) || totalMarks <= 0) {
        return apiError("Total marks must be a positive integer", 422);
      }
      updateData.totalMarks = totalMarks;
    }

    if (payload?.status !== undefined) {
      updateData.status = payload.status.toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    }

    const result = await prisma.assignment.update({
      where: { id },
      data: updateData,
      include: {
        course: {
          select: { id: true, title: true }
        }
      }
    });

    return apiResponse({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("PUT /api/v1/assignments/[id] error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to update assignment",
      500
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
      requiredPermission: "academy.assessments.assignments"
    });

    if ("error" in auth) {
      return auth.error;
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return apiError("Invalid assignment id", 422);
    }

    await ensureDatabaseSetup();

    const existing = await prisma.assignment.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      return apiError("Assignment not found", 404);
    }

    await prisma.assignment.delete({
      where: { id }
    });

    return apiResponse({
      success: true
    });
  } catch (err) {
    console.error("DELETE /api/v1/assignments/[id] error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to delete assignment",
      500
    );
  }
}

export const OPTIONS = handleOptions;

import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { prisma } from "@/server/prisma";

interface AssignmentPayload {
  title?: string;
  description?: string;
  courseId?: number | string;
  dueDate?: string;
  totalMarks?: number | string;
  status?: string;
}

export async function GET(request: Request) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR", "STUDENT"], {
      requiredPermission: "academy.assessments.assignments"
    });

    if ("error" in auth) {
      return auth.error;
    }

    await ensureDatabaseSetup();

    const { searchParams } = new URL(request.url);
    const courseIdParam = searchParams.get("courseId");
    const statusParam = searchParams.get("status");

    const courseId = courseIdParam ? Number(courseIdParam) : null;

    const result = await prisma.assignment.findMany({
      where: {
        ...(courseId && courseId > 0 ? { courseId } : {}),
        ...(statusParam ? { status: statusParam.toUpperCase() } : {})
      },
      include: {
        course: {
          select: { id: true, title: true }
        }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });

    return apiResponse({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("GET /api/v1/assignments error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to fetch assignments",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
      requiredPermission: "academy.assessments.assignments"
    });

    if ("error" in auth) {
      return auth.error;
    }

    const payload = await readJson<AssignmentPayload>(request);

    if (!payload?.title?.trim()) {
      return apiError("Assignment title is required", 422);
    }

    if (!payload.courseId) {
      return apiError("Course is required", 422);
    }

    const courseId = Number(payload.courseId);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      return apiError("Invalid course selected", 422);
    }

    if (!payload.dueDate) {
      return apiError("Due date is required", 422);
    }

    const dueDate = new Date(payload.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return apiError("Invalid due date", 422);
    }

    let totalMarks = 100;
    if (payload.totalMarks !== undefined && payload.totalMarks !== null && payload.totalMarks !== "") {
      totalMarks = Number(payload.totalMarks);
      if (!Number.isInteger(totalMarks) || totalMarks <= 0) {
        return apiError("Total marks must be a positive integer", 422);
      }
    }

    const status = payload.status?.toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

    await ensureDatabaseSetup();

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true }
    });

    if (!course) {
      return apiError("Selected course does not exist", 404);
    }

    const result = await prisma.assignment.create({
      data: {
        title: payload.title.trim(),
        description: payload.description?.trim() ?? "",
        courseId,
        dueDate,
        totalMarks,
        status
      },
      include: {
        course: {
          select: { id: true, title: true }
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
  } catch (err) {
    console.error("POST /api/v1/assignments error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to create assignment",
      500
    );
  }
}

export const OPTIONS = handleOptions;

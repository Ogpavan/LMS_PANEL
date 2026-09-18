import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { prisma } from "@/server/prisma";

interface CreateQuizPayload {
  title?: string;
  description?: string;
  courseId?: number | string;
  totalMarks?: number | string;
  passingMarks?: number | string;
  dueDate?: string;
  status?: string;
}

export async function GET(request: Request) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR", "STUDENT"], {
      requiredPermission: "academy.assessments.quizzes"
    });

    if ("error" in auth) {
      return auth.error;
    }

    await ensureDatabaseSetup();

    const { searchParams } = new URL(request.url);
    const courseIdParam = searchParams.get("courseId");
    const statusParam = searchParams.get("status");

    const courseId = courseIdParam ? Number(courseIdParam) : null;

    const result = await prisma.quiz.findMany({
      where: {
        ...(courseId && courseId > 0 ? { courseId } : {}),
        ...(statusParam ? { status: statusParam.toUpperCase() } : {})
      },
      include: {
        course: {
          select: { id: true, title: true }
        },
        _count: {
          select: { questions: true }
        }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });

    return apiResponse({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("GET /api/v1/quizzes error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to fetch quizzes",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
      requiredPermission: "academy.assessments.quizzes"
    });

    if ("error" in auth) {
      return auth.error;
    }

    const payload = await readJson<CreateQuizPayload>(request);

    if (!payload?.title?.trim()) {
      return apiError("Quiz title is required", 422);
    }

    if (!payload.courseId) {
      return apiError("Course is required", 422);
    }

    const courseId = Number(payload.courseId);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      return apiError("Invalid course selected", 422);
    }

    let totalMarks = 0;
    if (payload.totalMarks !== undefined && payload.totalMarks !== null && payload.totalMarks !== "") {
      totalMarks = Number(payload.totalMarks);
      if (Number.isNaN(totalMarks) || totalMarks < 0) {
        return apiError("Total marks must be a non-negative number", 422);
      }
    }

    let passingMarks = 0;
    if (payload.passingMarks !== undefined && payload.passingMarks !== null && payload.passingMarks !== "") {
      passingMarks = Number(payload.passingMarks);
      if (Number.isNaN(passingMarks) || passingMarks < 0) {
        return apiError("Passing marks must be a non-negative number", 422);
      }
    }

    let dueDate: Date | null = null;
    if (payload.dueDate) {
      const parsedDate = new Date(payload.dueDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        dueDate = parsedDate;
      }
    }

    // Default status MUST be DRAFT
    const status = payload.status?.toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

    await ensureDatabaseSetup();

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true }
    });

    if (!course) {
      return apiError("Selected course does not exist", 404);
    }

    const result = await prisma.quiz.create({
      data: {
        title: payload.title.trim(),
        description: payload.description?.trim() ?? "",
        courseId,
        totalMarks,
        passingMarks,
        dueDate,
        status
      },
      include: {
        course: {
          select: { id: true, title: true }
        },
        _count: {
          select: { questions: true }
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
    console.error("POST /api/v1/quizzes error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to create quiz",
      500
    );
  }
}

export const OPTIONS = handleOptions;

import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { prisma } from "@/server/prisma";

interface PublishPayload {
  status?: string;
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
      requiredPermission: "academy.assessments.quizzes"
    });

    if ("error" in auth) {
      return auth.error;
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return apiError("Invalid quiz id", 422);
    }

    const payload = await readJson<PublishPayload>(request).catch(() => null);

    await ensureDatabaseSetup();

    const existing = await prisma.quiz.findUnique({
      where: { id },
      select: { id: true, status: true }
    });

    if (!existing) {
      return apiError("Quiz not found", 404);
    }

    let nextStatus: string;
    if (payload?.status) {
      nextStatus = payload.status.toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    } else {
      nextStatus = existing.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    }

    const result = await prisma.quiz.update({
      where: { id },
      data: { status: nextStatus },
      include: {
        course: {
          select: { id: true, title: true }
        },
        _count: {
          select: { questions: true }
        }
      }
    });

    return apiResponse({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("PATCH /api/v1/quizzes/[id]/publish error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to update quiz status",
      500
    );
  }
}

export const OPTIONS = handleOptions;

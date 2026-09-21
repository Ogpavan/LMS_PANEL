import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions } from "@/server/api";
import { getQuizAttempts } from "@/server/google/forms";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/v1/quizzes/[id]/results
export async function GET(
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
    const quizId = parseId(rawId);

    if (!quizId) {
      return apiError("Invalid quiz id", 422);
    }

    await ensureDatabaseSetup();

    const attempts = await getQuizAttempts(quizId);

    return apiResponse({
      success: true,
      data: attempts
    });
  } catch (err) {
    console.error("GET /api/v1/quizzes/[id]/results error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to fetch quiz results",
      500
    );
  }
}

export const OPTIONS = handleOptions;

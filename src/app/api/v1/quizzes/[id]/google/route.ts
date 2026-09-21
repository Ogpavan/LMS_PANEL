import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions } from "@/server/api";
import { createOrSyncGoogleQuiz, GoogleIntegrationError } from "@/server/google/forms";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/v1/quizzes/[id]/google
export async function POST(
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
      return apiError("Invalid quiz id", 400);
    }

    await ensureDatabaseSetup();

    const result = await createOrSyncGoogleQuiz(quizId, auth.user.id);

    return apiResponse({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("[Google Quiz Creation Error]", err instanceof Error ? err.message : err);

    if (err instanceof GoogleIntegrationError) {
      return apiError(err.message, err.statusCode);
    }

    return apiError(
      err instanceof Error ? err.message : "Failed to create/sync Google Quiz",
      500
    );
  }
}

export const OPTIONS = handleOptions;

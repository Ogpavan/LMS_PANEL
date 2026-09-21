import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions } from "@/server/api";
import { syncGoogleQuizResponses, GoogleIntegrationError } from "@/server/google/forms";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/v1/quizzes/[id]/google/sync
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

    const summary = await syncGoogleQuizResponses(quizId, auth.user.id);

    return apiResponse({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error("[Google Sync Error]", err instanceof Error ? err.message : err);

    if (err instanceof GoogleIntegrationError) {
      return apiError(err.message, err.statusCode);
    }

    return apiError(
      err instanceof Error ? err.message : "Failed to sync Google Form responses",
      500
    );
  }
}

export const OPTIONS = handleOptions;

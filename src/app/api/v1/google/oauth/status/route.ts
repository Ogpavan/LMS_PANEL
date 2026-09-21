import { authorizeRequest } from "@/server/auth";
import { checkGoogleAuthStatus, disconnectGoogleAuth } from "@/server/google/oauth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions } from "@/server/api";

export async function GET(request: Request) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
      requiredPermission: "academy.assessments.quizzes"
    });

    if ("error" in auth) {
      return auth.error;
    }

    await ensureDatabaseSetup();

    const status = await checkGoogleAuthStatus(auth.user.id);

    return apiResponse({
      success: true,
      data: status
    });
  } catch (err) {
    console.error("GET /api/v1/google/oauth/status error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to check Google OAuth status",
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

    await ensureDatabaseSetup();

    await disconnectGoogleAuth(auth.user.id);

    return apiResponse({
      success: true
    });
  } catch (err) {
    console.error("POST /api/v1/google/oauth/disconnect error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to disconnect Google account",
      500
    );
  }
}

export const OPTIONS = handleOptions;

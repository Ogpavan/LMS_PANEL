import { authorizeRequest } from "@/server/auth";
import { getGoogleAuthUrl } from "@/server/google/oauth";
import { apiError, handleOptions } from "@/server/api";

export async function GET(request: Request) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
      requiredPermission: "academy.assessments.quizzes"
    });

    if ("error" in auth) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId") || "";
    const state = JSON.stringify({ userId: auth.user.id, quizId });

    const googleUrl = getGoogleAuthUrl(state);

    return Response.redirect(googleUrl, 302);
  } catch (err) {
    console.error("GET /api/v1/google/oauth/connect error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to initiate Google OAuth",
      500
    );
  }
}

export const OPTIONS = handleOptions;

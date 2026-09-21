import { exchangeCodeForTokens } from "@/server/google/oauth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { authenticateRequest } from "@/server/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateRaw = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("Google OAuth error parameter:", error);
      return Response.redirect(
        new URL("/dashboard/academy/assessments/quizzes?googleError=" + encodeURIComponent(error), request.url),
        302
      );
    }

    if (!code) {
      return Response.redirect(
        new URL("/dashboard/academy/assessments/quizzes?googleError=missing_code", request.url),
        302
      );
    }

    // Try to get authenticated LMS session user first
    const sessionAuth = await authenticateRequest(request);
    let userId: number | null = "user" in sessionAuth && sessionAuth.user ? sessionAuth.user.id : null;
    let quizId = "";

    if (stateRaw) {
      try {
        let raw = stateRaw;
        if (raw.startsWith("%")) {
          try {
            raw = decodeURIComponent(raw);
          } catch {
            // Keep original if decoding fails
          }
        }
        const decoded = JSON.parse(raw);
        if (!userId && decoded.userId) {
          userId = Number(decoded.userId);
        }
        if (decoded.quizId) {
          quizId = String(decoded.quizId);
        }
      } catch (err) {
        console.warn("Failed to parse state parameter in OAuth callback:", err);
      }
    }

    const finalUserId = userId || 1;

    await ensureDatabaseSetup();

    await exchangeCodeForTokens(code, finalUserId);

    const redirectPath = quizId
      ? `/dashboard/academy/assessments/quizzes?googleConnected=true&quizId=${quizId}`
      : `/dashboard/academy/assessments/quizzes?googleConnected=true`;

    return Response.redirect(new URL(redirectPath, request.url), 302);
  } catch (err) {
    console.error("GET /api/v1/google/oauth/callback error:", err);
    const msg = err instanceof Error ? err.message : "Failed to complete Google OAuth";
    return Response.redirect(
      new URL("/dashboard/academy/assessments/quizzes?googleError=" + encodeURIComponent(msg), request.url),
      302
    );
  }
}

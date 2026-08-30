import { apiResponse, handleOptions, readJson, requireTrustedOrigin } from "@/server/api";
import { normalizeEmail, validateEmail } from "@/server/account-validation";
import { createAuthActionToken } from "@/server/auth-action-token";
import { actionRateLimitKey, checkRateLimit, recordRateLimitFailure, requestIp } from "@/server/auth-rate-limit";
import { serverConfig } from "@/server/config";
import { sendPasswordResetEmail } from "@/server/email";
import { prisma } from "@/server/prisma";

interface ForgotPasswordPayload {
  email?: string;
}

const genericMessage = "If an active account exists for that email, a reset link has been sent.";

export async function POST(request: Request) {
  const originError = requireTrustedOrigin(request);
  if (originError) return originError;

  const payload = await readJson<ForgotPasswordPayload>(request);
  const email = normalizeEmail(payload?.email ?? "");
  const key = actionRateLimitKey("forgot-password", `${requestIp(request)}:${email}`);
  const retryAfter = await checkRateLimit([key]);
  if (retryAfter) return apiResponse({ success: true, message: genericMessage });
  await recordRateLimitFailure([key]);

  if (validateEmail(email)) {
    const user = await prisma.apiUser.findUnique({ where: { email } });

    if (user?.isActive) {
      const token = await createAuthActionToken(
        user.id,
        "RESET_PASSWORD",
        serverConfig.auth.passwordResetTtlSeconds
      );
      try {
        await sendPasswordResetEmail(user.name, user.email, token);
      } catch (error) {
        console.error("Password reset email delivery failed", error);
      }
    }
  }

  return apiResponse({ success: true, message: genericMessage });
}

export const OPTIONS = handleOptions;

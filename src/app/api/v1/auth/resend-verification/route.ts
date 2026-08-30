import { apiResponse, handleOptions, readJson, requireTrustedOrigin } from "@/server/api";
import { normalizeEmail, validateEmail } from "@/server/account-validation";
import { createAuthActionToken } from "@/server/auth-action-token";
import { actionRateLimitKey, checkRateLimit, recordRateLimitFailure, requestIp } from "@/server/auth-rate-limit";
import { serverConfig } from "@/server/config";
import { sendVerificationEmail } from "@/server/email";
import { prisma } from "@/server/prisma";

interface ResendPayload {
  email?: string;
}

const message = "If the account requires verification, a new email has been sent.";

export async function POST(request: Request) {
  const originError = requireTrustedOrigin(request);
  if (originError) return originError;

  const payload = await readJson<ResendPayload>(request);
  const email = normalizeEmail(payload?.email ?? "");
  const key = actionRateLimitKey("resend-verification", `${requestIp(request)}:${email}`);
  const retryAfter = await checkRateLimit([key]);
  if (retryAfter) return apiResponse({ success: true, message });
  await recordRateLimitFailure([key]);

  if (validateEmail(email)) {
    const user = await prisma.apiUser.findUnique({ where: { email } });
    if (user?.isActive && !user.emailVerifiedAt) {
      const token = await createAuthActionToken(
        user.id,
        "VERIFY_EMAIL",
        serverConfig.auth.emailVerificationTtlSeconds
      );
      try {
        await sendVerificationEmail(user.name, user.email, token);
      } catch (error) {
        console.error("Verification email delivery failed", error);
      }
    }
  }

  return apiResponse({ success: true, message });
}

export const OPTIONS = handleOptions;

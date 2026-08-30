import { apiError, apiResponse, handleOptions, readJson, requireTrustedOrigin } from "@/server/api";
import { normalizeEmail, passwordValidationError, validateEmail, validateName } from "@/server/account-validation";
import { actionRateLimitKey, checkRateLimit, recordRateLimitFailure, requestIp } from "@/server/auth-rate-limit";
import { createAuthActionToken } from "@/server/auth-action-token";
import { serverConfig } from "@/server/config";
import { sendVerificationEmail } from "@/server/email";
import { hashPassword } from "@/server/password";
import { prisma } from "@/server/prisma";

interface SignupPayload {
  name?: string;
  email?: string;
  password?: string;
  termsAccepted?: boolean;
}

export async function POST(request: Request) {
  const originError = requireTrustedOrigin(request);
  if (originError) return originError;

  const rateLimitKey = actionRateLimitKey("signup", requestIp(request));
  const retryAfter = await checkRateLimit([rateLimitKey]);
  if (retryAfter) return apiError("Too many signup attempts. Please try again later", 429);
  await recordRateLimitFailure([rateLimitKey]);

  const payload = await readJson<SignupPayload>(request);
  const name = payload?.name?.trim() ?? "";
  const email = normalizeEmail(payload?.email ?? "");
  const password = payload?.password ?? "";

  if (!validateName(name)) return apiError("Name must contain between 2 and 100 characters", 422);
  if (!validateEmail(email)) return apiError("Invalid email address", 422);
  if (!payload?.termsAccepted) return apiError("You must accept the terms and privacy policy", 422);

  const passwordError = passwordValidationError(password);
  if (passwordError) return apiError(passwordError, 422);

  const existingUser = await prisma.apiUser.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) return apiError("An account already exists for this email", 409);

  const user = await prisma.$transaction(async (tx) => {
    const account = await tx.apiUser.create({
      data: {
        name,
        email,
        password: hashPassword(password),
        role: "STUDENT",
        emailVerifiedAt: serverConfig.auth.emailVerificationRequired ? null : new Date()
      }
    });

    await tx.student.upsert({
      where: { email },
      update: { name },
      create: { name, email, program: "", status: "active" }
    });

    return account;
  });

  if (serverConfig.auth.emailVerificationRequired) {
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

  return apiResponse(
    {
      success: true,
      message: serverConfig.auth.emailVerificationRequired
        ? "Account created. Check your email to verify your account."
        : "Account created. You can now sign in."
    },
    { status: 201 }
  );
}

export const OPTIONS = handleOptions;

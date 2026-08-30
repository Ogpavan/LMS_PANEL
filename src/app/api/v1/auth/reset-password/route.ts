import { apiError, apiResponse, handleOptions, readJson, requireTrustedOrigin } from "@/server/api";
import { passwordValidationError } from "@/server/account-validation";
import { findUsableAuthActionToken, hashAuthActionToken } from "@/server/auth-action-token";
import { hashPassword } from "@/server/password";
import { prisma } from "@/server/prisma";

interface ResetPasswordPayload {
  token?: string;
  password?: string;
}

export async function POST(request: Request) {
  const originError = requireTrustedOrigin(request);
  if (originError) return originError;

  const payload = await readJson<ResetPasswordPayload>(request);
  if (!payload?.token || !payload.password) return apiError("Token and password are required", 422);

  const passwordError = passwordValidationError(payload.password);
  if (passwordError) return apiError(passwordError, 422);

  const actionToken = await findUsableAuthActionToken(payload.token, "RESET_PASSWORD");
  if (!actionToken) return apiError("This password reset link is invalid or expired", 400);

  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.authActionToken.updateMany({
        where: {
          tokenHash: hashAuthActionToken(payload.token!),
          type: "RESET_PASSWORD",
          consumedAt: null,
          expiresAt: { gt: now }
        },
        data: { consumedAt: now }
      });

      if (consumed.count !== 1) throw new Error("RESET_TOKEN_ALREADY_CONSUMED");

      await tx.apiUser.update({
        where: { id: actionToken.userId },
        data: { password: hashPassword(payload.password!), passwordChangedAt: now }
      });

      await tx.authSession.updateMany({
        where: { userId: actionToken.userId, revokedAt: null },
        data: { revokedAt: now }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RESET_TOKEN_ALREADY_CONSUMED") {
      return apiError("This password reset link is invalid or expired", 400);
    }
    throw error;
  }

  return apiResponse({ success: true, message: "Password updated. You can now sign in." });
}

export const OPTIONS = handleOptions;

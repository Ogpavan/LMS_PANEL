import { apiError, apiResponse, handleOptions, readJson, requireTrustedOrigin } from "@/server/api";
import { findUsableAuthActionToken, hashAuthActionToken } from "@/server/auth-action-token";
import { prisma } from "@/server/prisma";

interface VerifyEmailPayload {
  token?: string;
}

export async function POST(request: Request) {
  const originError = requireTrustedOrigin(request);
  if (originError) return originError;

  const payload = await readJson<VerifyEmailPayload>(request);
  if (!payload?.token) return apiError("Verification token is required", 422);

  const actionToken = await findUsableAuthActionToken(payload.token, "VERIFY_EMAIL");
  if (!actionToken) return apiError("This verification link is invalid or expired", 400);

  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.authActionToken.updateMany({
        where: {
          tokenHash: hashAuthActionToken(payload.token!),
          type: "VERIFY_EMAIL",
          consumedAt: null,
          expiresAt: { gt: now }
        },
        data: { consumedAt: now }
      });

      if (consumed.count !== 1) throw new Error("VERIFY_TOKEN_ALREADY_CONSUMED");

      await tx.apiUser.update({
        where: { id: actionToken.userId },
        data: { emailVerifiedAt: now }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "VERIFY_TOKEN_ALREADY_CONSUMED") {
      return apiError("This verification link is invalid or expired", 400);
    }
    throw error;
  }

  return apiResponse({ success: true, message: "Email verified. You can now sign in." });
}

export const OPTIONS = handleOptions;

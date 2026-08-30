import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { serverConfig } from "@/server/config";
import { isPasswordHash, verifyPassword, hashPassword } from "@/server/password";
import { prisma } from "@/server/prisma";
import { normalizeEmail, validateEmail } from "@/server/account-validation";
import {
  checkRateLimit,
  clearRateLimits,
  loginRateLimitKeys,
  recordRateLimitFailure
} from "@/server/auth-rate-limit";
import { createSession, sessionCookie } from "@/server/session";
import { requireTrustedOrigin } from "@/server/api";

interface LoginPayload {
  email?: string;
  password?: string;
  remember?: boolean;
}

const dummyPasswordHash = hashPassword("Invalid-password-only-for-timing-1!");

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const permissions = value.filter((item): item is string => typeof item === "string");
  return permissions.length > 0 ? permissions : [];
}

export async function POST(request: Request) {
  const originError = requireTrustedOrigin(request);
  if (originError) return originError;

  const payload = await readJson<LoginPayload>(request);

  if (!payload?.email || !payload.password) {
    return apiError("Email and password are required", 422);
  }

  const email = normalizeEmail(payload.email);
  if (!validateEmail(email)) return apiError("Invalid email address", 422);

  const rateLimitKeys = loginRateLimitKeys(request, email);
  const retryAfter = await checkRateLimit(rateLimitKeys);
  if (retryAfter) {
    return apiError("Too many login attempts. Please try again later", 429);
  }

  await ensureDatabaseSetup();

  const user = await prisma.apiUser.findFirst({
    where: {
      email
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      password: true,
      emailVerifiedAt: true,
      isActive: true
    }
  });

  const passwordMatches = verifyPassword(payload.password, user?.password ?? dummyPasswordHash);

  if (!user || !passwordMatches) {
    await recordRateLimitFailure(rateLimitKeys);
    return apiError("Invalid credentials", 401);
  }

  if (!user.isActive) return apiError("This account has been disabled", 403);

  if (serverConfig.auth.emailVerificationRequired && !user.emailVerifiedAt) {
    return apiError("Please verify your email before signing in", 403);
  }

  if (!isPasswordHash(user.password)) {
    await prisma.apiUser.update({
      where: { id: user.id },
      data: {
        password: hashPassword(payload.password)
      }
    });
  }

  await clearRateLimits(rateLimitKeys);

  const [session] = await Promise.all([
    createSession(user.id, payload.remember === true),
    prisma.apiLoginEvent.create({
      data: {
        userId: user.id,
        email: user.email,
        role: user.role
      }
    })
  ]);

  const expiresAt = session.expiresAt.toISOString();

  const responseUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: normalizePermissions(user.permissions)
  };

  return apiResponse(
    {
      success: true,
      user: responseUser,
      expiresAt
    },
    {
      headers: {
        "Set-Cookie": sessionCookie(session.token, session.ttlSeconds)
      }
    }
  );
}

export const OPTIONS = handleOptions;

import { createHash, randomBytes } from "crypto";

import { prisma } from "@/server/prisma";
import { serverConfig } from "@/server/config";

export const SESSION_COOKIE_NAME = "lms_session";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  for (const part of cookie.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }

  return null;
}

export async function createSession(userId: number, remember: boolean) {
  const token = randomBytes(32).toString("base64url");
  const ttlSeconds = remember
    ? serverConfig.api.rememberedSessionTtlSeconds
    : serverConfig.api.sessionTtlSeconds;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });

  return { token, expiresAt, ttlSeconds };
}

export function sessionCookie(token: string, ttlSeconds: number) {
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    serverConfig.isProduction ? "Secure" : "",
    `Max-Age=${ttlSeconds}`
  ]
    .filter(Boolean)
    .join("; ");
}

export function expiredSessionCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    serverConfig.isProduction ? "Secure" : "",
    "Max-Age=0"
  ]
    .filter(Boolean)
    .join("; ");
}

export async function findSession(request: Request) {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) {
    return null;
  }

  return session;
}

export async function revokeSession(request: Request) {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!token) return;

  await prisma.authSession.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function revokeAllUserSessions(userId: number) {
  await prisma.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

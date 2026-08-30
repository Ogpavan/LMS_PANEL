import { createHmac } from "crypto";

import { prisma } from "@/server/prisma";
import { serverConfig } from "@/server/config";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function identifierKey(kind: string, value: string) {
  const digest = createHmac("sha256", serverConfig.api.authSecret)
    .update(`${kind}:${value}`)
    .digest("hex");
  return `${kind}:${digest}`;
}

export function requestIp(request: Request) {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function loginRateLimitKeys(request: Request, email: string) {
  return [identifierKey("login-ip", requestIp(request)), identifierKey("login-email", email)];
}

export function actionRateLimitKey(action: string, identifier: string) {
  return identifierKey(action, identifier);
}

export async function checkRateLimit(keys: string[]) {
  const now = new Date();
  const rows = await prisma.authRateLimit.findMany({ where: { key: { in: keys } } });
  const blocked = rows.find((row) => row.blockedUntil && row.blockedUntil > now);

  if (!blocked?.blockedUntil) return null;
  return Math.max(1, Math.ceil((blocked.blockedUntil.getTime() - now.getTime()) / 1000));
}

export async function recordRateLimitFailure(keys: string[]) {
  const now = new Date();

  await prisma.$transaction(
    keys.map((key) =>
      prisma.authRateLimit.upsert({
        where: { key },
        create: { key, attempts: 0, windowStartedAt: now },
        update: {},
        select: { key: true }
      })
    )
  );

  for (const key of keys) {
    const row = await prisma.authRateLimit.findUnique({ where: { key } });
    if (!row) continue;

    const windowExpired = now.getTime() - row.windowStartedAt.getTime() >= WINDOW_MS;
    const attempts = windowExpired ? 1 : row.attempts + 1;

    await prisma.authRateLimit.update({
      where: { key },
      data: {
        attempts,
        windowStartedAt: windowExpired ? now : row.windowStartedAt,
        blockedUntil: attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_MS) : null
      }
    });
  }
}

export async function clearRateLimits(keys: string[]) {
  await prisma.authRateLimit.deleteMany({ where: { key: { in: keys } } });
}

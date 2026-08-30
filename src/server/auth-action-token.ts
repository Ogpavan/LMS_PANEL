import { createHash, randomBytes } from "crypto";

import type { AuthActionType } from "@prisma/client";

import { prisma } from "@/server/prisma";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthActionToken(
  userId: number,
  type: AuthActionType,
  ttlSeconds: number
) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await prisma.$transaction([
    prisma.authActionToken.deleteMany({
      where: { userId, type, consumedAt: null }
    }),
    prisma.authActionToken.create({
      data: { userId, type, tokenHash: tokenHash(token), expiresAt }
    })
  ]);

  return token;
}

export async function findUsableAuthActionToken(token: string, type: AuthActionType) {
  return prisma.authActionToken.findFirst({
    where: {
      tokenHash: tokenHash(token),
      type,
      consumedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });
}

export function hashAuthActionToken(token: string) {
  return tokenHash(token);
}

import { createAccessToken } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { serverConfig } from "@/server/config";
import { isPasswordHash, verifyPassword, hashPassword } from "@/server/password";
import { prisma } from "@/server/prisma";

interface LoginPayload {
  email?: string;
  password?: string;
}

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const permissions = value.filter((item): item is string => typeof item === "string");
  return permissions.length > 0 ? permissions : [];
}

export async function POST(request: Request) {
  const payload = await readJson<LoginPayload>(request);

  if (!payload?.email || !payload.password) {
    return apiError("Email and password are required", 422);
  }

  await ensureDatabaseSetup();

  const user = await prisma.apiUser.findFirst({
    where: {
      email: payload.email
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      password: true
    }
  });

  if (!user || !verifyPassword(payload.password, user.password)) {
    return apiError("Invalid credentials", 401);
  }

  if (!isPasswordHash(user.password)) {
    await prisma.apiUser.update({
      where: { id: user.id },
      data: {
        password: hashPassword(payload.password)
      }
    });
  }

  const expiresAt = new Date(
    Date.now() + serverConfig.api.accessTokenTtlSeconds * 1000
  ).toISOString();

  await prisma.apiLoginEvent.create({
    data: {
      userId: user.id,
      email: user.email,
      role: user.role
    }
  });

  const responseUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: normalizePermissions(user.permissions)
  };

  return apiResponse({
    success: true,
    user: responseUser,
    accessToken: createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + serverConfig.api.accessTokenTtlSeconds
    }),
    expiresAt
  });
}

export const OPTIONS = handleOptions;

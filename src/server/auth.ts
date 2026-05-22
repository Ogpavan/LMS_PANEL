import { createHmac, timingSafeEqual } from "crypto";

import type { UserRole } from "@prisma/client";

import { apiError } from "@/server/api";
import { prisma } from "@/server/prisma";
import { serverConfig } from "@/server/config";

interface AuthTokenPayload {
  sub: number;
  email: string;
  role: UserRole;
  exp: number;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[] | null;
}

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const permissions = value.filter((item): item is string => typeof item === "string");
  return permissions.length > 0 ? permissions : [];
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(unsignedToken: string) {
  return createHmac("sha256", serverConfig.api.authSecret)
    .update(unsignedToken)
    .digest("base64url");
}

export function createAccessToken(payload: AuthTokenPayload) {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encodeBase64Url(JSON.stringify(payload));
  const unsignedToken = `${header}.${body}`;
  const signature = sign(unsignedToken);

  return `${unsignedToken}.${signature}`;
}

function verifyAccessToken(token: string): AuthTokenPayload | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [header, body, signature] = parts;
  const unsignedToken = `${header}.${body}`;
  const expectedSignature = sign(unsignedToken);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body)) as AuthTokenPayload;

    if (
      typeof payload.sub !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function authenticateRequest(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      error: apiError("Missing bearer token", 401)
    };
  }

  const token = authorization.slice("Bearer ".length).trim();
  const payload = verifyAccessToken(token);

  if (!payload) {
    return {
      error: apiError("Invalid access token", 401)
    };
  }

  const user = await prisma.apiUser.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true
    }
  });

  if (!user) {
    return {
      error: apiError("Authenticated user not found", 401)
    };
  }

  return { user };
}

export async function authorizeRequest(
  request: Request,
  allowedRoles: UserRole[],
  options?: {
    allowStudentSelfByEmail?: string | null;
    requiredPermission?: string;
  }
) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return auth;
  }

  const user = {
    ...auth.user,
    permissions: normalizePermissions(auth.user.permissions)
  };

  if (user.role === "INSTRUCTOR" && options?.requiredPermission && Array.isArray(user.permissions)) {
    if (user.permissions.includes(options.requiredPermission)) {
      return { user };
    }

    return {
      error: apiError("You do not have permission to access this resource", 403)
    };
  }

  if (allowedRoles.includes(user.role)) {
    return { user };
  }

  if (
    user.role === "STUDENT" &&
    options?.allowStudentSelfByEmail &&
    user.email.toLowerCase() === options.allowStudentSelfByEmail.toLowerCase()
  ) {
    return { user };
  }

  return {
    error: apiError("You do not have permission to access this resource", 403)
  };
}

import { Prisma } from "@prisma/client";

import { authorizeRequest } from "@/server/auth";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { prisma } from "@/server/prisma";

interface AccessPayload {
  role?: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  permissions?: string[] | null;
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const permissions = [...new Set(value.filter((item): item is string => typeof item === "string"))];
  return permissions.length > 0 ? permissions : [];
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.administration.roles-permissions"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  const payload = await readJson<AccessPayload>(request);

  if (!id) {
    return apiError("Invalid user id", 422);
  }

  if (!payload?.role || !["ADMIN", "INSTRUCTOR", "STUDENT"].includes(payload.role)) {
    return apiError("A valid role is required", 422);
  }

  if (auth.user.id === id) {
    return apiError("You cannot change your own role or permissions from this page", 403);
  }

  await ensureDatabaseSetup();

  const existing = await prisma.apiUser.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  if (!existing) {
    return apiError("User not found", 404);
  }

  let permissions = normalizePermissions(payload.permissions);

  if (payload.role === "INSTRUCTOR") {
    const nextPermissions = Array.isArray(permissions) ? [...permissions] : [];

    if (!nextPermissions.includes("academy.dashboard")) {
      nextPermissions.unshift("academy.dashboard");
    }

    permissions = [...new Set(nextPermissions)];
  } else {
    permissions = null;
  }

  const result = await prisma.apiUser.update({
    where: { id },
    data: {
      role: payload.role,
      permissions: permissions === null ? Prisma.DbNull : permissions
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      createdAt: true
    }
  });

  return apiResponse({
    success: true,
    data: {
      ...result,
      permissions: normalizePermissions(result.permissions)
    }
  });
}

export const OPTIONS = handleOptions;

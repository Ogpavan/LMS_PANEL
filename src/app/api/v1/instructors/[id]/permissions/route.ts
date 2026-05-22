import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { prisma } from "@/server/prisma";

interface PermissionPayload {
  permissions?: string[];
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter((item): item is string => typeof item === "string");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN"]);

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid instructor id", 422);
  }

  await ensureDatabaseSetup();

  const instructor = await prisma.apiUser.findFirst({
    where: { id, role: "INSTRUCTOR" },
    select: {
      id: true,
      name: true,
      email: true,
      permissions: true
    }
  });

  if (!instructor) {
    return apiError("Instructor not found", 404);
  }

  return apiResponse({
    success: true,
    data: {
      ...instructor,
      permissions: normalizePermissions(instructor.permissions)
    }
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN"]);

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  const payload = await readJson<PermissionPayload>(request);

  if (!id) {
    return apiError("Invalid instructor id", 422);
  }

  if (!Array.isArray(payload?.permissions)) {
    return apiError("Permissions array is required", 422);
  }

  const permissions = [...new Set(payload.permissions.filter((item) => typeof item === "string"))];

  if (!permissions.includes("academy.dashboard")) {
    permissions.unshift("academy.dashboard");
  }

  await ensureDatabaseSetup();

  const existing = await prisma.apiUser.findFirst({
    where: { id, role: "INSTRUCTOR" },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Instructor not found", 404);
  }

  const result = await prisma.apiUser.update({
    where: { id },
    data: {
      permissions
    },
    select: {
      id: true,
      name: true,
      email: true,
      permissions: true
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

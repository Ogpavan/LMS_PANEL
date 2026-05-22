import { authorizeRequest } from "@/server/auth";
import { apiResponse, handleOptions } from "@/server/api";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { prisma } from "@/server/prisma";

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const permissions = value.filter((item): item is string => typeof item === "string");
  return permissions.length > 0 ? permissions : [];
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.administration.roles-permissions"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const result = await prisma.apiUser.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }, { id: "asc" }],
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
    data: result.map((record) => ({
      ...record,
      permissions: normalizePermissions(record.permissions)
    }))
  });
}

export const OPTIONS = handleOptions;

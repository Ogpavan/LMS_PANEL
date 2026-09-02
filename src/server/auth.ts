import type { UserRole } from "@prisma/client";

import { apiError, requireTrustedOrigin } from "@/server/api";
import { findSession } from "@/server/session";
import { hasInstructorPermission } from "@/server/permissions";

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

export async function authenticateRequest(request: Request) {
  const session = await findSession(request);

  if (session) {
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        permissions: session.user.permissions
      }
    };
  }

  return {
    error: apiError("Missing or invalid session", 401)
  };
}

export async function authorizeRequest(
  request: Request,
  allowedRoles: UserRole[],
  options?: {
    allowStudentSelfByEmail?: string | null;
    requiredPermission?: string;
  }
) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    const originError = requireTrustedOrigin(request);
    if (originError) return { error: originError };
  }

  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return auth;
  }

  const user = {
    ...auth.user,
    role: (auth.user.role ? String(auth.user.role).toUpperCase() : "ADMIN") as UserRole,
    permissions: normalizePermissions(auth.user.permissions)
  };

  if (user.role === "INSTRUCTOR" && options?.requiredPermission) {
    if (hasInstructorPermission(user.permissions, options.requiredPermission)) {
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

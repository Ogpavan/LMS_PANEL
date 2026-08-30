import { apiError, apiResponse, handleOptions } from "@/server/api";
import { findSession } from "@/server/session";

export async function GET(request: Request) {
  const session = await findSession(request);
  if (!session) return apiError("Invalid session", 401);

  return apiResponse({
    success: true,
    expiresAt: session.expiresAt.toISOString(),
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      permissions: session.user.permissions
    }
  });
}

export const OPTIONS = handleOptions;

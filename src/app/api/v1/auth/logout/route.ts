import { apiResponse, handleOptions, requireTrustedOrigin } from "@/server/api";
import { expiredSessionCookie, revokeSession } from "@/server/session";

export async function POST(request: Request) {
  const originError = requireTrustedOrigin(request);
  if (originError) return originError;

  await revokeSession(request);

  return apiResponse(
    { success: true },
    { headers: { "Set-Cookie": expiredSessionCookie() } }
  );
}

export const OPTIONS = handleOptions;

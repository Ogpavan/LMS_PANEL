import { googleConfig } from "./config";
import { prisma } from "@/server/prisma";

export function getGoogleAuthUrl(stateParam?: string): string {
  if (!googleConfig.clientId) {
    throw new Error("GOOGLE_CLIENT_ID environment variable is not configured");
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", googleConfig.clientId);
  url.searchParams.set("redirect_uri", googleConfig.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleConfig.scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  if (stateParam) {
    url.searchParams.set("state", stateParam);
  }

  return url.toString();
}

export async function exchangeCodeForTokens(code: string, userId: number) {
  if (!googleConfig.clientId || !googleConfig.clientSecret) {
    throw new Error("Google OAuth credentials are not properly configured");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleConfig.clientId,
      client_secret: googleConfig.clientSecret,
      redirect_uri: googleConfig.redirectUri,
      grant_type: "authorization_code"
    })
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    throw new Error(
      tokenData.error_description || tokenData.error || "Failed to exchange authorization code for Google tokens"
    );
  }

  const accessToken = tokenData.access_token as string;
  const refreshToken = (tokenData.refresh_token as string) || null;
  const expiresIn = (tokenData.expires_in as number) || 3600;
  const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000);
  const scope = tokenData.scope as string || googleConfig.scopes.join(" ");

  // Save tokens in database securely against userId
  const existing = await prisma.googleAuthToken.findUnique({
    where: { userId }
  });

  if (existing) {
    await prisma.googleAuthToken.update({
      where: { userId },
      data: {
        accessToken,
        ...(refreshToken ? { refreshToken } : {}),
        expiresAt,
        scope
      }
    });
  } else {
    await prisma.googleAuthToken.create({
      data: {
        userId,
        accessToken,
        refreshToken,
        expiresAt,
        scope
      }
    });
  }

  return { accessToken, expiresAt };
}

export async function getValidGoogleAccessToken(userId: number): Promise<string> {
  const storedToken = await prisma.googleAuthToken.findUnique({
    where: { userId }
  });

  if (!storedToken) {
    throw new Error("Google account is not connected for this user. Please connect Google account.");
  }

  // If token is still valid (with 2 min buffer), return it
  if (storedToken.expiresAt > new Date(Date.now() + 120 * 1000)) {
    return storedToken.accessToken;
  }

  // Otherwise, refresh the token using refreshToken
  if (!storedToken.refreshToken) {
    throw new Error("Google session expired and refresh token is missing. Please reconnect Google account.");
  }

  if (!googleConfig.clientId || !googleConfig.clientSecret) {
    throw new Error("Google OAuth credentials are not configured");
  }

  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleConfig.clientId,
      client_secret: googleConfig.clientSecret,
      refresh_token: storedToken.refreshToken,
      grant_type: "refresh_token"
    })
  });

  const refreshData = await refreshRes.json();

  if (!refreshRes.ok || refreshData.error) {
    throw new Error("Google authorization expired. Please reconnect your Google account.");
  }

  const newAccessToken = refreshData.access_token as string;
  const expiresIn = (refreshData.expires_in as number) || 3600;
  const newExpiresAt = new Date(Date.now() + (expiresIn - 60) * 1000);

  await prisma.googleAuthToken.update({
    where: { userId },
    data: {
      accessToken: newAccessToken,
      expiresAt: newExpiresAt
    }
  });

  return newAccessToken;
}

export async function checkGoogleAuthStatus(userId: number) {
  const storedToken = await prisma.googleAuthToken.findUnique({
    where: { userId }
  });

  if (!storedToken) {
    return { connected: false };
  }

  return {
    connected: true,
    expiresAt: storedToken.expiresAt
  };
}

export async function disconnectGoogleAuth(userId: number) {
  await prisma.googleAuthToken.deleteMany({
    where: { userId }
  });
  return { success: true };
}

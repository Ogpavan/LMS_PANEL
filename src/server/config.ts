const requiredEnv = ["DATABASE_URL"] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const serverConfig = {
  api: {
    corsOrigin: process.env.API_CORS_ORIGIN ?? "*",
    authSecret: process.env.AUTH_SECRET ?? "change-me-in-production",
    accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 60 * 60 * 8)
  }
};

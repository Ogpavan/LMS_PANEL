const requiredEnv = ["DATABASE_URL"] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const isProduction = process.env.NODE_ENV === "production";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const authSecret = process.env.AUTH_SECRET ?? "development-only-auth-secret";
const configuredCorsOrigin = process.env.API_CORS_ORIGIN ?? appUrl;
const corsOrigin = !isProduction && configuredCorsOrigin === "*" ? appUrl : configuredCorsOrigin;
const emailVerificationRequired =
  process.env.EMAIL_VERIFICATION_REQUIRED === "true" || isProduction;

if (isProduction && authSecret.length < 32) {
  throw new Error("AUTH_SECRET must be at least 32 characters in production");
}

if (isProduction) {
  const databaseUrl = new URL(process.env.DATABASE_URL!);
  const sslMode = databaseUrl.searchParams.get("sslmode");
  if (!sslMode || ["disable", "allow", "prefer"].includes(sslMode)) {
    throw new Error("DATABASE_URL must require TLS in production (for example, sslmode=require)");
  }
}

if (isProduction && (corsOrigin === "*" || !corsOrigin.startsWith("https://"))) {
  throw new Error("API_CORS_ORIGIN must be an explicit HTTPS origin in production");
}

const smtp = {
  host: process.env.SMTP_HOST ?? "",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER ?? "",
  password: process.env.SMTP_PASSWORD ?? "",
  from: process.env.SMTP_FROM ?? ""
};

if (
  isProduction &&
  emailVerificationRequired &&
  (!smtp.host || !smtp.user || !smtp.password || !smtp.from)
) {
  throw new Error("SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM are required in production");
}

export const serverConfig = {
  appUrl,
  isProduction,
  api: {
    corsOrigin,
    authSecret,
    accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 60 * 60 * 8),
    sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 8),
    rememberedSessionTtlSeconds: Number(
      process.env.REMEMBERED_SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 30
    )
  },
  auth: {
    emailVerificationRequired,
    passwordResetTtlSeconds: Number(process.env.PASSWORD_RESET_TTL_SECONDS ?? 60 * 30),
    emailVerificationTtlSeconds: Number(
      process.env.EMAIL_VERIFICATION_TTL_SECONDS ?? 60 * 60 * 24
    )
  },
  smtp
};

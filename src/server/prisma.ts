import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  var __lmsPrisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

export function getFreshPrisma(): PrismaClient {
  const cached = global.__lmsPrisma as unknown as Record<string, unknown> | undefined;
  if (cached && typeof cached.certificateTemplate !== "undefined") {
    return global.__lmsPrisma!;
  }

  if (typeof require !== "undefined" && require.cache) {
    Object.keys(require.cache).forEach((key) => {
      if (key.includes("@prisma") || key.includes(".prisma")) {
        delete require.cache[key];
      }
    });
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    global.__lmsPrisma = client;
  }

  return client;
}

export const prisma = getFreshPrisma();

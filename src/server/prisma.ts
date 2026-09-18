import "dotenv/config";
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
  let Client = PrismaClient;

  // If the cached PrismaClient module lacks the assignment model delegate, purge require.cache and reload from disk
  if (
    typeof require !== "undefined" &&
    require.cache &&
    !("assignment" in Client.prototype)
  ) {
    try {
      Object.keys(require.cache).forEach((key) => {
        if (key.includes("@prisma") || key.includes(".prisma")) {
          delete require.cache[key];
        }
      });
      const reloaded = require("@prisma/client");
      if (reloaded?.PrismaClient) {
        Client = reloaded.PrismaClient;
      }
    } catch {
      // Fallback to imported PrismaClient if dynamic reload is unavailable
    }
  }

  return new Client({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

export function getFreshPrisma(): PrismaClient {
  if (
    global.__lmsPrisma &&
    (global.__lmsPrisma as unknown as Record<string, unknown>).assignment != null
  ) {
    return global.__lmsPrisma;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    global.__lmsPrisma = client;
  }

  return client;
}

export const prisma = getFreshPrisma();

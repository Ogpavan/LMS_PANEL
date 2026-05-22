import { apiError, apiResponse, handleOptions } from "@/server/api";
import { prisma } from "@/server/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return apiResponse({
      success: true,
      status: "ok"
    });
  } catch {
    return apiError("Database connection failed", 500);
  }
}

export const OPTIONS = handleOptions;

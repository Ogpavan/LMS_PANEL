import { apiResponse, handleOptions } from "@/server/api";

export async function GET() {
  return apiResponse({
    success: true,
    service: "LMS Admin API",
    version: "v1",
    endpoints: [
      "/api/v1/health",
      "/api/v1/auth/login",
      "/api/v1/courses",
      "/api/v1/courses/:id",
      "/api/v1/instructors",
      "/api/v1/students",
      "/api/v1/students/:id"
    ]
  });
}

export const OPTIONS = handleOptions;

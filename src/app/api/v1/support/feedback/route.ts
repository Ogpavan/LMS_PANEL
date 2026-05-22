import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { supportFeedbackModel } from "@/server/support-prisma";

interface FeedbackPayload {
  name?: string;
  email?: string;
  courseTitle?: string;
  category?: string;
  rating?: number;
  message?: string;
  status?: string;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.support.feedback"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const result = await supportFeedbackModel.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  return apiResponse({
    success: true,
    data: result
  });
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.support.feedback"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const payload = await readJson<FeedbackPayload>(request);

  if (!payload?.name || !payload.email || !payload.message) {
    return apiError("Name, email, and feedback message are required", 422);
  }

  const rating = Number(payload.rating);

  await ensureDatabaseSetup();

  const result = await supportFeedbackModel.create({
    data: {
      name: payload.name,
      email: payload.email,
      courseTitle: payload.courseTitle ?? "",
      category: payload.category ?? "general",
      rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 5,
      message: payload.message,
      status: payload.status ?? "pending"
    }
  });

  return apiResponse(
    {
      success: true,
      data: result
    },
    { status: 201 }
  );
}

export const OPTIONS = handleOptions;

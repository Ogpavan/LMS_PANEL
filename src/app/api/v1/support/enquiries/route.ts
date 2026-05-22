import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { supportEnquiryModel } from "@/server/support-prisma";

interface EnquiryPayload {
  name?: string;
  email?: string;
  phone?: string;
  topic?: string;
  courseTitle?: string;
  channel?: string;
  message?: string;
  status?: string;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.support.enquiries"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const result = await supportEnquiryModel.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  return apiResponse({
    success: true,
    data: result
  });
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.support.enquiries"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const payload = await readJson<EnquiryPayload>(request);

  if (!payload?.name || !payload.email || !payload.topic) {
    return apiError("Name, email, and topic are required", 422);
  }

  await ensureDatabaseSetup();

  const result = await supportEnquiryModel.create({
    data: {
      name: payload.name,
      email: payload.email,
      phone: payload.phone ?? "",
      topic: payload.topic,
      courseTitle: payload.courseTitle ?? "",
      channel: payload.channel ?? "email",
      message: payload.message ?? "",
      status: payload.status ?? "open"
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

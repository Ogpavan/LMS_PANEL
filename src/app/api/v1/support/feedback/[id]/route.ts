import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { supportFeedbackModel } from "@/server/support-prisma";

interface FeedbackUpdatePayload {
  status?: string;
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.support.feedback"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid feedback id", 422);
  }

  const payload = await readJson<FeedbackUpdatePayload>(request);

  if (!payload?.status) {
    return apiError("Status is required", 422);
  }

  await ensureDatabaseSetup();

  const existing = await supportFeedbackModel.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Feedback not found", 404);
  }

  const result = await supportFeedbackModel.update({
    where: { id },
    data: {
      status: payload.status
    }
  });

  return apiResponse({
    success: true,
    data: result
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.support.feedback"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid feedback id", 422);
  }

  await ensureDatabaseSetup();

  const existing = await supportFeedbackModel.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Feedback not found", 404);
  }

  await supportFeedbackModel.delete({
    where: { id }
  });

  return apiResponse({
    success: true
  });
}

export const OPTIONS = handleOptions;

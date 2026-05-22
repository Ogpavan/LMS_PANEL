import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { supportEnquiryModel } from "@/server/support-prisma";

interface EnquiryUpdatePayload {
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
    requiredPermission: "academy.support.enquiries"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid enquiry id", 422);
  }

  const payload = await readJson<EnquiryUpdatePayload>(request);

  if (!payload?.status) {
    return apiError("Status is required", 422);
  }

  await ensureDatabaseSetup();

  const existing = await supportEnquiryModel.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Enquiry not found", 404);
  }

  const result = await supportEnquiryModel.update({
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
    requiredPermission: "academy.support.enquiries"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid enquiry id", 422);
  }

  await ensureDatabaseSetup();

  const existing = await supportEnquiryModel.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Enquiry not found", 404);
  }

  await supportEnquiryModel.delete({
    where: { id }
  });

  return apiResponse({
    success: true
  });
}

export const OPTIONS = handleOptions;

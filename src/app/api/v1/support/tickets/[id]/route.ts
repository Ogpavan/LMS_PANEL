import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { supportTicketModel } from "@/server/support-prisma";

interface TicketUpdatePayload {
  status?: string;
  assignedTo?: string;
  priority?: string;
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
    requiredPermission: "academy.support.tickets"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid ticket id", 422);
  }

  const payload = await readJson<TicketUpdatePayload>(request);

  if (!payload || (!payload.status && payload.assignedTo === undefined && !payload.priority)) {
    return apiError("At least one ticket update field is required", 422);
  }

  await ensureDatabaseSetup();

  const existing = await supportTicketModel.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Ticket not found", 404);
  }

  const result = await supportTicketModel.update({
    where: { id },
    data: {
      status: payload.status,
      assignedTo: payload.assignedTo,
      priority: payload.priority
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
    requiredPermission: "academy.support.tickets"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid ticket id", 422);
  }

  await ensureDatabaseSetup();

  const existing = await supportTicketModel.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Ticket not found", 404);
  }

  await supportTicketModel.delete({
    where: { id }
  });

  return apiResponse({
    success: true
  });
}

export const OPTIONS = handleOptions;

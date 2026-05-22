import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { supportTicketModel } from "@/server/support-prisma";

interface TicketPayload {
  subject?: string;
  requesterName?: string;
  requesterEmail?: string;
  assignedTo?: string;
  priority?: string;
  channel?: string;
  details?: string;
  status?: string;
}

async function nextTicketNumber() {
  const latest = await supportTicketModel.findFirst({
    orderBy: { id: "desc" },
    select: { id: true }
  });

  const nextId = (latest?.id ?? 0) + 1;
  return `TKT-${String(nextId).padStart(4, "0")}`;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.support.tickets"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const result = await supportTicketModel.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  return apiResponse({
    success: true,
    data: result
  });
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.support.tickets"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const payload = await readJson<TicketPayload>(request);

  if (!payload?.subject || !payload.requesterName || !payload.requesterEmail) {
    return apiError("Subject, requester name, and requester email are required", 422);
  }

  await ensureDatabaseSetup();

  const result = await supportTicketModel.create({
    data: {
      ticketNumber: await nextTicketNumber(),
      subject: payload.subject,
      requesterName: payload.requesterName,
      requesterEmail: payload.requesterEmail,
      assignedTo: payload.assignedTo ?? "",
      priority: payload.priority ?? "medium",
      channel: payload.channel ?? "portal",
      details: payload.details ?? "",
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

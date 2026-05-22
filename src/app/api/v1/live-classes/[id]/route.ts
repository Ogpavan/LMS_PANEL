import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions } from "@/server/api";
import { prisma } from "@/server/prisma";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.classes.live"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid live class id", 422);
  }

  await ensureDatabaseSetup();

  const existing = await prisma.liveClass.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Live class not found", 404);
  }

  await prisma.liveClass.delete({
    where: { id }
  });

  return apiResponse({
    success: true
  });
}

export const OPTIONS = handleOptions;

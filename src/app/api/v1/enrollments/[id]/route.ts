import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { prisma } from "@/server/prisma";

interface EnrollmentUpdatePayload {
  status?: string;
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.enrollments"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  const payload = await readJson<EnrollmentUpdatePayload>(request);

  if (!id) {
    return apiError("Invalid enrollment id", 422);
  }

  if (!payload?.status?.trim()) {
    return apiError("Enrollment status is required", 422);
  }

  await ensureDatabaseSetup();

  const existing = await prisma.enrollment.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Enrollment not found", 404);
  }

  const result = await prisma.enrollment.update({
    where: { id },
    data: {
      status: payload.status.trim().toLowerCase()
    },
    include: {
      student: true,
      course: true
    }
  });

  return apiResponse({
    success: true,
    data: result
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.enrollments"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid enrollment id", 422);
  }

  await ensureDatabaseSetup();

  const existing = await prisma.enrollment.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Enrollment not found", 404);
  }

  await prisma.enrollment.delete({
    where: { id }
  });

  return apiResponse({
    success: true
  });
}

export const OPTIONS = handleOptions;

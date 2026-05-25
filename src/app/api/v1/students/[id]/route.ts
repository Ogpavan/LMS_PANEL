import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { hashPassword } from "@/server/password";
import { prisma } from "@/server/prisma";
import { randomBytes } from "crypto";

interface StudentPayload {
  name?: string;
  email?: string;
  program?: string;
  progress?: number;
  status?: string;
  portalAccess?: boolean;
  password?: string;
  createLogin?: boolean;
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function createTemporaryPassword() {
  return `portal-${randomBytes(6).toString("hex")}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid student id", 422);
  }

  await ensureDatabaseSetup();

  const result = await prisma.student.findUnique({
    where: { id }
  });

  if (!result) {
    return apiError("Student not found", 404);
  }

  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.students.all",
    allowStudentSelfByEmail: result.email
  });

  if ("error" in auth) {
    return auth.error;
  }

  const account = await prisma.apiUser.findUnique({
    where: { email: result.email },
    select: { id: true, role: true }
  });

  return apiResponse({
    success: true,
    data: {
      ...result,
      hasAccount: account?.role === "STUDENT"
    }
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.students.all"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  const payload = await readJson<StudentPayload>(request);

  if (!id) {
    return apiError("Invalid student id", 422);
  }

  if (!payload?.name || !payload.email || typeof payload.progress !== "number" || !payload.status) {
    return apiError("Name, email, progress, and status are required", 422);
  }

  const name = payload.name;
  const email = payload.email;
  const program = payload.program?.trim();
  const progress = payload.progress;
  const status = payload.status;

  await ensureDatabaseSetup();

  const existing = await prisma.student.findUnique({
    where: { id },
    select: { id: true, email: true, program: true }
  });

  if (!existing) {
    return apiError("Student not found", 404);
  }

  const conflictingStudent = await prisma.student.findFirst({
    where: {
      email,
      NOT: { id }
    },
    select: { id: true }
  });

  if (conflictingStudent) {
    return apiError("Another student already uses this email", 409);
  }

  const existingUser = await prisma.apiUser.findUnique({
    where: { email: existing.email },
    select: { id: true, role: true }
  });

  const nextPortalAccess = payload.portalAccess ?? payload.createLogin ?? (existingUser?.role === "STUDENT");

  const conflictingUser =
    email !== existing.email
      ? await prisma.apiUser.findUnique({
          where: { email },
          select: { id: true, role: true }
        })
      : null;

  if (conflictingUser && (!existingUser || conflictingUser.id !== existingUser.id)) {
    return apiError("An account already exists for the updated email", 409);
  }

  const shouldCreateLogin = nextPortalAccess;
  const temporaryPassword = shouldCreateLogin && !existingUser && !payload.password
    ? createTemporaryPassword()
    : null;
  const passwordToUse = payload.password ?? temporaryPassword;

  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { id },
      data: {
        name,
        email,
        program: program ?? existing.program,
        progress,
        status
      }
    });

    if (!shouldCreateLogin && existingUser?.role === "STUDENT") {
      await tx.apiUser.delete({
        where: { id: existingUser.id }
      });
    } else if (existingUser?.role === "STUDENT") {
      await tx.apiUser.update({
        where: { id: existingUser.id },
        data: {
          name,
          email,
          ...(passwordToUse ? { password: hashPassword(passwordToUse) } : {})
        }
      });
    } else if (shouldCreateLogin && passwordToUse) {
      await tx.apiUser.create({
        data: {
          name,
          email,
          password: hashPassword(passwordToUse),
          role: "STUDENT"
        }
      });
    }

    return {
      ...student,
      hasAccount: shouldCreateLogin,
      temporaryPassword: temporaryPassword ?? undefined
    };
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
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.students.all"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return apiError("Invalid student id", 422);
  }

  await ensureDatabaseSetup();

  const existing = await prisma.student.findUnique({
    where: { id },
    select: { id: true, email: true }
  });

  if (!existing) {
    return apiError("Student not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.student.delete({
      where: { id }
    });

    const account = await tx.apiUser.findUnique({
      where: { email: existing.email },
      select: { id: true, role: true }
    });

    if (account?.role === "STUDENT") {
      await tx.apiUser.delete({
        where: { id: account.id }
      });
    }
  });

  return apiResponse({
    success: true
  });
}

export const OPTIONS = handleOptions;

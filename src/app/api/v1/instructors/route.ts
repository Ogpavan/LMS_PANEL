import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { hashPassword } from "@/server/password";
import { prisma } from "@/server/prisma";

interface InstructorPayload {
  name?: string;
  email?: string;
  password?: string;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.instructors.all"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const result = await prisma.apiUser.findMany({
    where: { role: "INSTRUCTOR" },
    orderBy: { id: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      createdAt: true
    }
  });

  return apiResponse({
    success: true,
    data: result
  });
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.instructors.create"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const payload = await readJson<InstructorPayload>(request);

  if (!payload?.name || !payload.email || !payload.password) {
    return apiError("Name, email, and temporary password are required", 422);
  }

  const name = payload.name;
  const email = payload.email;
  const password = payload.password;

  await ensureDatabaseSetup();

  const existingUser = await prisma.apiUser.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser) {
    return apiError("An account already exists for this email", 409);
  }

  const result = await prisma.apiUser.create({
    data: {
      name,
      email,
      password: hashPassword(password),
      role: "INSTRUCTOR"
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      createdAt: true
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

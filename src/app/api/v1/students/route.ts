import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { hashPassword } from "@/server/password";
import { prisma } from "@/server/prisma";
import { normalizeEmail, passwordValidationError, validateEmail, validateName } from "@/server/account-validation";

interface StudentPayload {
  name?: string;
  email?: string;
  program?: string;
  progress?: number;
  status?: string;
  password?: string;
  createLogin?: boolean;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.students.all"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const [students, studentAccounts] = await Promise.all([
    prisma.student.findMany({
      orderBy: { id: "desc" }
    }),
    prisma.apiUser.findMany({
      where: { role: "STUDENT" },
      select: { email: true }
    })
  ]);

  const accountEmails = new Set(studentAccounts.map((account) => account.email.toLowerCase()));
  const result = students.map((student) => ({
    ...student,
    hasAccount: accountEmails.has(student.email.toLowerCase())
  }));

  return apiResponse({
    success: true,
    data: result
  });
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.students.create"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const payload = await readJson<StudentPayload>(request);

  if (!payload?.name || !payload.email) {
    return apiError("Name and email are required", 422);
  }

  const shouldCreateLogin = payload.createLogin ?? Boolean(payload.password);
  const name = payload.name.trim();
  const email = normalizeEmail(payload.email);
  const program = payload.program?.trim() || "";

  if (!validateName(name)) return apiError("Name must contain between 2 and 100 characters", 422);
  if (!validateEmail(email)) return apiError("Invalid email address", 422);

  if (shouldCreateLogin && !payload.password) {
    return apiError("Temporary password is required when login access is enabled", 422);
  }

  if (payload.password) {
    const passwordError = passwordValidationError(payload.password);
    if (passwordError) return apiError(passwordError, 422);
  }

  await ensureDatabaseSetup();

  const [existingStudent, existingUser] = await Promise.all([
    prisma.student.findUnique({
      where: { email },
      select: { id: true }
    }),
    prisma.apiUser.findUnique({
      where: { email },
      select: { id: true, role: true }
    })
  ]);

  if (existingStudent) {
    return apiError("A student already exists for this email", 409);
  }

  if (existingUser) {
    return apiError("An account already exists for this email", 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        name,
        email,
        program,
        progress: payload.progress ?? 0,
        status: payload.status ?? "active"
      }
    });

    if (shouldCreateLogin && payload.password) {
      await tx.apiUser.create({
        data: {
          name,
          email,
          password: hashPassword(payload.password),
          role: "STUDENT",
          emailVerifiedAt: new Date()
        }
      });
    }

    return {
      ...student,
      hasAccount: shouldCreateLogin
    };
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

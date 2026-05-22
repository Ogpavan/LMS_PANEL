import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { prisma } from "@/server/prisma";

interface EnrollmentPayload {
  studentId?: number;
  courseIds?: number[];
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.enrollments"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const result = await prisma.enrollment.findMany({
    include: {
      student: true,
      course: true
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  return apiResponse({
    success: true,
    data: result
  });
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.enrollments"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const payload = await readJson<EnrollmentPayload>(request);
  const studentId = Number(payload?.studentId);
  const courseIds = [...new Set((payload?.courseIds ?? []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];

  if (!Number.isInteger(studentId) || studentId <= 0 || courseIds.length === 0) {
    return apiError("Student and at least one course are required", 422);
  }

  await ensureDatabaseSetup();

  const [student, courses] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true }
    }),
    prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true }
    })
  ]);

  if (!student) {
    return apiError("Student not found", 404);
  }

  if (courses.length !== courseIds.length) {
    return apiError("One or more selected courses were not found", 404);
  }

  const existing = await prisma.enrollment.findMany({
    where: {
      studentId,
      courseId: { in: courseIds }
    },
    select: { courseId: true }
  });

  const existingCourseIds = new Set(existing.map((item) => item.courseId));
  const createCourseIds = courseIds.filter((courseId) => !existingCourseIds.has(courseId));

  if (createCourseIds.length === 0) {
    return apiError("This student is already enrolled in the selected courses", 409);
  }

  await prisma.enrollment.createMany({
    data: createCourseIds.map((courseId) => ({
      studentId,
      courseId,
      status: "active"
    }))
  });

  const result = await prisma.enrollment.findMany({
    where: {
      studentId,
      courseId: { in: createCourseIds }
    },
    include: {
      student: true,
      course: true
    },
    orderBy: { id: "desc" }
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

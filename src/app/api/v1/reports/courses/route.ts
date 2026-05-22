import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiResponse, handleOptions } from "@/server/api";
import { prisma } from "@/server/prisma";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.analytics.course-reports"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const courses = await prisma.course.findMany({
    include: {
      sections: {
        include: {
          lessons: {
            select: {
              id: true
            }
          }
        }
      },
      enrollments: {
        select: {
          id: true,
          status: true,
          createdAt: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  const data = courses.map((course) => {
    const lessonCount = course.sections.reduce(
      (total, section) => total + section.lessons.length,
      0
    );
    const enrollmentCount = course.enrollments.length;
    const activeEnrollments = course.enrollments.filter(
      (enrollment) => enrollment.status.toLowerCase() === "active"
    ).length;
    const completedEnrollments = course.enrollments.filter(
      (enrollment) => enrollment.status.toLowerCase() === "completed"
    ).length;

    return {
      id: course.id,
      title: course.title,
      category: course.category,
      instructor: course.instructor,
      status: course.status,
      visibility: course.visibility,
      featured: course.featured,
      currency: course.currency,
      price: course.price,
      lessonCount,
      sectionCount: course.sections.length,
      enrollmentCount,
      activeEnrollments,
      completedEnrollments,
      bookedRevenue: enrollmentCount * course.price,
      createdAt: course.createdAt.toISOString()
    };
  });

  return apiResponse({
    success: true,
    data
  });
}

export const OPTIONS = handleOptions;

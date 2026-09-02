import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiResponse, handleOptions } from "@/server/api";
import { prisma } from "@/server/prisma";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR", "STUDENT"], {
    requiredPermission: "academy.dashboard"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  // 1. Fetch metric counts
  const [activeCoursesCount, totalCoursesCount] = await Promise.all([
    prisma.course.count({ where: { status: "published" } }),
    prisma.course.count()
  ]);

  const [upcomingClassesCount, totalClassesCount] = await Promise.all([
    prisma.liveClass.count({ where: { status: { in: ["scheduled", "live"] } } }),
    prisma.liveClass.count()
  ]);

  const totalStudentsCount = await prisma.student.count();

  // 2. Enrollments and revenue calculation
  const enrollments = await prisma.enrollment.findMany({
    select: {
      id: true,
      createdAt: true,
      course: {
        select: {
          price: true,
          currency: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  const totalEnrollments = enrollments.length;
  const totalRevenue = enrollments.reduce((sum, e) => sum + (e.course?.price ?? 0), 0);

  // 3. Monthly Enrollment Trend points (past 8 months)
  const now = new Date();
  const monthKeys: string[] = [];
  const monthLabels: string[] = [];
  const monthCountsMap: Record<string, number> = {};

  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });
    monthKeys.push(key);
    monthLabels.push(label);
    monthCountsMap[key] = 0;
  }

  enrollments.forEach((e) => {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthCountsMap) {
      monthCountsMap[key] += 1;
    }
  });

  const enrollmentTrendPoints = monthKeys.map((key) => monthCountsMap[key] ?? 0);

  // 4. Priority items from real DB
  const [openTicketsCount, openEnquiriesCount] = await Promise.all([
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.supportEnquiry.count({ where: { status: "open" } })
  ]);

  return apiResponse({
    success: true,
    data: {
      metrics: {
        activeCourses: {
          value: String(activeCoursesCount > 0 ? activeCoursesCount : totalCoursesCount),
          totalCourses: totalCoursesCount,
          delta: "+12%",
          caption: `${activeCoursesCount} published of ${totalCoursesCount} total courses`
        },
        liveClasses: {
          value: String(upcomingClassesCount > 0 ? upcomingClassesCount : totalClassesCount),
          totalClasses: totalClassesCount,
          delta: "+5%",
          caption: `${upcomingClassesCount} scheduled / live sessions`
        },
        totalStudents: {
          value: String(totalStudentsCount),
          delta: "+9%",
          caption: `${totalStudentsCount} registered learners`
        },
        totalEnrollments: {
          value: String(totalEnrollments),
          totalRevenue,
          delta: "+15%",
          caption: `₹${totalRevenue.toLocaleString()} booked revenue`
        }
      },
      enrollmentTrend: {
        points: enrollmentTrendPoints,
        labels: monthLabels
      },
      priorityItems: [
        {
          label: "Support tickets",
          value: `${openTicketsCount} unresolved ticket${openTicketsCount === 1 ? "" : "s"}`,
          tone: openTicketsCount > 0 ? "Review" : "Good"
        },
        {
          label: "Student enquiries",
          value: `${openEnquiriesCount} pending enquiry${openEnquiriesCount === 1 ? "" : "ies"}`,
          tone: openEnquiriesCount > 0 ? "Investigate" : "Good"
        },
        {
          label: "Live classes schedule",
          value: `${upcomingClassesCount} active or upcoming session${upcomingClassesCount === 1 ? "" : "s"}`,
          tone: "Monitor"
        }
      ]
    }
  });
}

export const OPTIONS = handleOptions;

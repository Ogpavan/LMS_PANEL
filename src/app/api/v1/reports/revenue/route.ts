import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiResponse, handleOptions } from "@/server/api";
import { prisma } from "@/server/prisma";

type CurrencyTotals = Record<string, number>;

function addCurrencyTotal(totals: CurrencyTotals, currency: string, amount: number) {
  totals[currency] = (totals[currency] ?? 0) + amount;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.analytics.revenue-reports"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const enrollments = await prisma.enrollment.findMany({
    include: {
      course: {
        select: {
          id: true,
          title: true,
          price: true,
          currency: true,
          status: true
        }
      },
      student: {
        select: {
          id: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const grossRevenue: CurrencyTotals = {};
  const thisMonthRevenue: CurrencyTotals = {};
  const courseMap = new Map<
    number,
    {
      id: number;
      title: string;
      currency: string;
      price: number;
      status: string;
      enrollments: number;
      paidEnrollments: number;
      uniqueStudents: number;
      revenue: number;
      studentIds: Set<number>;
    }
  >();
  const monthMap = new Map<
    string,
    {
      monthKey: string;
      enrollments: number;
      paidEnrollments: number;
      freeEnrollments: number;
      revenueByCurrency: CurrencyTotals;
    }
  >();

  for (const enrollment of enrollments) {
    const revenue = enrollment.course.price;
    const currency = enrollment.course.currency || "INR";
    const monthDate = new Date(enrollment.createdAt);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

    addCurrencyTotal(grossRevenue, currency, revenue);

    if (monthKey === currentMonthKey) {
      addCurrencyTotal(thisMonthRevenue, currency, revenue);
    }

    const existingCourse = courseMap.get(enrollment.courseId);
    const paid = revenue > 0 ? 1 : 0;

    if (existingCourse) {
      existingCourse.enrollments += 1;
      existingCourse.paidEnrollments += paid;
      existingCourse.revenue += revenue;
      existingCourse.studentIds.add(enrollment.studentId);
      existingCourse.uniqueStudents = existingCourse.studentIds.size;
    } else {
      courseMap.set(enrollment.courseId, {
        id: enrollment.course.id,
        title: enrollment.course.title,
        currency,
        price: enrollment.course.price,
        status: enrollment.course.status,
        enrollments: 1,
        paidEnrollments: paid,
        uniqueStudents: 1,
        revenue,
        studentIds: new Set([enrollment.studentId])
      });
    }

    const existingMonth = monthMap.get(monthKey);

    if (existingMonth) {
      existingMonth.enrollments += 1;
      existingMonth.paidEnrollments += paid;
      existingMonth.freeEnrollments += paid === 0 ? 1 : 0;
      addCurrencyTotal(existingMonth.revenueByCurrency, currency, revenue);
    } else {
      monthMap.set(monthKey, {
        monthKey,
        enrollments: 1,
        paidEnrollments: paid,
        freeEnrollments: paid === 0 ? 1 : 0,
        revenueByCurrency: {
          [currency]: revenue
        }
      });
    }
  }

  const courseRevenue = [...courseMap.values()]
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      currency: entry.currency,
      price: entry.price,
      status: entry.status,
      enrollments: entry.enrollments,
      paidEnrollments: entry.paidEnrollments,
      uniqueStudents: entry.uniqueStudents,
      revenue: entry.revenue
    }))
    .sort((left, right) => {
      if (right.revenue !== left.revenue) {
        return right.revenue - left.revenue;
      }

      return right.enrollments - left.enrollments;
    });

  const monthlyRevenue = [...monthMap.values()].sort((left, right) =>
    right.monthKey.localeCompare(left.monthKey)
  );

  return apiResponse({
    success: true,
    data: {
      summary: {
        totalEnrollments: enrollments.length,
        paidEnrollments: enrollments.filter((enrollment) => enrollment.course.price > 0).length,
        freeEnrollments: enrollments.filter((enrollment) => enrollment.course.price <= 0).length,
        grossRevenue,
        thisMonthRevenue
      },
      monthlyRevenue,
      courseRevenue
    }
  });
}

export const OPTIONS = handleOptions;

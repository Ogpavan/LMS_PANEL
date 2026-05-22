import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiResponse, handleOptions } from "@/server/api";
import { prisma } from "@/server/prisma";

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dayKey(value: Date) {
  return startOfDay(value).toISOString().slice(0, 10);
}

function percentage(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.classes.attendance"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const students = await prisma.student.findMany({
    orderBy: { name: "asc" }
  });

  const studentEmails = students.map((student) => student.email.toLowerCase());
  const accounts = await prisma.apiUser.findMany({
    where: {
      role: "STUDENT",
      email: { in: studentEmails }
    },
    select: {
      id: true,
      email: true,
      createdAt: true
    }
  });

  const accountMap = new Map(
    accounts.map((account) => [account.email.toLowerCase(), account])
  );

  const accountIds = accounts.map((account) => account.id);
  const loginEvents =
    accountIds.length > 0
      ? await prisma.apiLoginEvent.findMany({
          where: {
            userId: { in: accountIds }
          },
          orderBy: { createdAt: "desc" },
          select: {
            userId: true,
            createdAt: true
          }
        })
      : [];

  const loginMap = new Map<number, Date[]>();

  for (const event of loginEvents) {
    const existing = loginMap.get(event.userId);
    const createdAt = new Date(event.createdAt);

    if (existing) {
      existing.push(createdAt);
    } else {
      loginMap.set(event.userId, [createdAt]);
    }
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const sevenDaysAgo = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  const thirtyDaysAgo = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
  const todayKey = dayKey(now);

  const result = students.map((student) => {
    const account = accountMap.get(student.email.toLowerCase());
    const events = account ? loginMap.get(account.id) ?? [] : [];
    const uniqueDays = new Set(events.map((value) => dayKey(value)));
    const weekDays = new Set(
      events.filter((value) => value >= sevenDaysAgo).map((value) => dayKey(value))
    );
    const monthDays = new Set(
      events.filter((value) => value >= thirtyDaysAgo).map((value) => dayKey(value))
    );
    const lastLogin = events.length > 0 ? events[0].toISOString() : null;
    const attendanceToday = uniqueDays.has(todayKey);

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      program: student.program,
      status: student.status,
      hasAccount: Boolean(account),
      todayStatus: account ? (attendanceToday ? "present" : "absent") : "no-account",
      attendanceRate7Days: account ? percentage(weekDays.size, 7) : 0,
      attendanceRate30Days: account ? percentage(monthDays.size, 30) : 0,
      totalLoginDays: uniqueDays.size,
      lastLogin,
      createdAt: student.createdAt.toISOString()
    };
  });

  return apiResponse({
    success: true,
    data: result
  });
}

export const OPTIONS = handleOptions;

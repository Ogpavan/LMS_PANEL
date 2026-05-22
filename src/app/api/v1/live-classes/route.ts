import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { prisma } from "@/server/prisma";

interface LiveClassPayload {
  title?: string;
  courseTitle?: string;
  hostName?: string;
  hostEmail?: string;
  description?: string;
  meetUrl?: string;
  startsAt?: string;
  durationMinutes?: number;
  status?: string;
}

function normalizeMeetUrl(value: string) {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "meet.google.com" && hostname !== "g.co") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function computeStatus(startsAt: Date, durationMinutes: number) {
  const now = Date.now();
  const startTime = startsAt.getTime();
  const endTime = startTime + durationMinutes * 60 * 1000;

  if (now >= startTime && now < endTime) {
    return "live";
  }

  if (now >= endTime) {
    return "completed";
  }

  return "scheduled";
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR", "STUDENT"], {
    requiredPermission: "academy.classes.live"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const result = await prisma.liveClass.findMany({
    orderBy: [{ startsAt: "asc" }, { id: "desc" }]
  });

  return apiResponse({
    success: true,
    data: result.map((item) => ({
      ...item,
      status: computeStatus(item.startsAt, item.durationMinutes)
    }))
  });
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.classes.live"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const payload = await readJson<LiveClassPayload>(request);

  if (!payload?.title || !payload.meetUrl || !payload.startsAt) {
    return apiError("Title, Google Meet link, and start time are required", 422);
  }

  const meetUrl = normalizeMeetUrl(payload.meetUrl);

  if (!meetUrl) {
    return apiError("A valid Google Meet link is required", 422);
  }

  const startsAt = new Date(payload.startsAt);

  if (Number.isNaN(startsAt.getTime())) {
    return apiError("Invalid class start time", 422);
  }

  const durationMinutes = Number(payload.durationMinutes) || 60;

  if (durationMinutes <= 0 || durationMinutes > 24 * 60) {
    return apiError("Duration must be between 1 and 1440 minutes", 422);
  }

  await ensureDatabaseSetup();

  const result = await prisma.liveClass.create({
    data: {
      title: payload.title.trim(),
      courseTitle: payload.courseTitle?.trim() ?? "",
      hostName: payload.hostName?.trim() ?? "",
      hostEmail: payload.hostEmail?.trim() ?? "",
      description: payload.description?.trim() ?? "",
      meetUrl,
      startsAt,
      durationMinutes,
      status: computeStatus(startsAt, durationMinutes)
    }
  });

  return apiResponse(
    {
      success: true,
      data: {
        ...result,
        status: computeStatus(result.startsAt, result.durationMinutes)
      }
    },
    { status: 201 }
  );
}

export const OPTIONS = handleOptions;

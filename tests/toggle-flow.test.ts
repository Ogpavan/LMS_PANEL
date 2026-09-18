import { describe, expect, it } from "vitest";

import { GET as getAssignments, POST as createAssignment } from "@/app/api/v1/assignments/route";
import { GET as getSingleAssignment } from "@/app/api/v1/assignments/[id]/route";
import { PATCH as publishAssignment } from "@/app/api/v1/assignments/[id]/publish/route";
import { getFreshPrisma } from "@/server/prisma";

describe("Assignments Status Toggle Flow Integration Test", () => {
  it("executes complete Create (Default Draft) -> Toggle Published -> Toggle Draft -> State Persist flow", async () => {
    const db = getFreshPrisma();
    const adminUser = await db.apiUser.findFirst({ where: { role: "ADMIN" } });
    const course = await db.course.findFirst();
    expect(adminUser).toBeDefined();
    expect(course).toBeDefined();

    if (!adminUser || !course) return;

    // Create session for authentication
    const sessionToken = "test-toggle-token-" + Date.now();
    const crypto = await import("crypto");
    const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");

    await db.authSession.create({
      data: {
        userId: adminUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600 * 1000)
      }
    });

    const cookieHeader = `lms_session=${encodeURIComponent(sessionToken)}`;

    // 1. Create new assignment (must default to DRAFT)
    const createReq = new Request("http://localhost:3000/api/v1/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({
        title: "Toggle Flow Test Assignment " + Date.now(),
        courseId: course.id,
        dueDate: "2026-11-20",
        totalMarks: 100
        // status omitted -> must default to DRAFT
      })
    });

    const createRes = await createAssignment(createReq);
    expect(createRes).toBeDefined();
    expect(createRes?.status).toBe(201);
    const createJson = await createRes?.json();
    expect(createJson.success).toBe(true);
    expect(createJson.data.status).toBe("DRAFT");
    const createdId = String(createJson.data.id);

    // 2. Toggle DRAFT -> PUBLISHED via PATCH publish route
    const publishReq1 = new Request(`http://localhost:3000/api/v1/assignments/${createdId}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({ status: "PUBLISHED" })
    });

    const publishRes1 = await publishAssignment(publishReq1, { params: Promise.resolve({ id: createdId }) });
    expect(publishRes1).toBeDefined();
    expect(publishRes1?.status).toBe(200);
    const publishJson1 = await publishRes1?.json();
    expect(publishJson1.success).toBe(true);
    expect(publishJson1.data.status).toBe("PUBLISHED");

    // 3. Toggle PUBLISHED -> DRAFT via PATCH publish route
    const publishReq2 = new Request(`http://localhost:3000/api/v1/assignments/${createdId}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({ status: "DRAFT" })
    });

    const publishRes2 = await publishAssignment(publishReq2, { params: Promise.resolve({ id: createdId }) });
    expect(publishRes2).toBeDefined();
    expect(publishRes2?.status).toBe(200);
    const publishJson2 = await publishRes2?.json();
    expect(publishJson2.success).toBe(true);
    expect(publishJson2.data.status).toBe("DRAFT");

    // 4. Verify state persistence on re-query (simulating page refresh)
    const getSingleReq = new Request(`http://localhost:3000/api/v1/assignments/${createdId}`, {
      headers: { cookie: cookieHeader }
    });

    const singleRes = await getSingleAssignment(getSingleReq, { params: Promise.resolve({ id: createdId }) });
    expect(singleRes).toBeDefined();
    expect(singleRes?.status).toBe(200);
    const singleJson = await singleRes?.json();
    expect(singleJson.success).toBe(true);
    expect(singleJson.data.status).toBe("DRAFT");

    // 5. Verify overall assignments GET count calculation
    const getListReq = new Request("http://localhost:3000/api/v1/assignments", {
      headers: { cookie: cookieHeader }
    });

    const listRes = await getAssignments(getListReq);
    expect(listRes).toBeDefined();
    expect(listRes?.status).toBe(200);
    const listJson = await listRes?.json();
    expect(listJson.success).toBe(true);
    expect(Array.isArray(listJson.data)).toBe(true);
    const publishedCount = listJson.data.filter((r: { status: string }) => r.status === "PUBLISHED").length;
    const draftCount = listJson.data.filter((r: { status: string }) => r.status === "DRAFT").length;
    expect(typeof publishedCount).toBe("number");
    expect(typeof draftCount).toBe("number");
  });
});

import { describe, expect, it } from "vitest";

import { GET as getAssignments, POST as createAssignment } from "@/app/api/v1/assignments/route";
import { getFreshPrisma } from "@/server/prisma";

describe("Assignments API Endpoints & Prisma Model", () => {
  it("verifies db.assignment is defined on Prisma Client", () => {
    const db = getFreshPrisma();
    expect(db.assignment).toBeDefined();
    expect(typeof db.assignment.findMany).toBe("function");
    expect(typeof db.assignment.create).toBe("function");
  });

  it("executes GET /api/v1/assignments successfully with valid session auth", async () => {
    const db = getFreshPrisma();
    const adminUser = await db.apiUser.findFirst({ where: { role: "ADMIN" } });
    expect(adminUser).toBeDefined();

    if (adminUser) {
      // Create valid session token
      const sessionToken = "test-session-token-" + Date.now();
      const crypto = await import("crypto");
      const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");

      await db.authSession.create({
        data: {
          userId: adminUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600 * 1000)
        }
      });

      const req = new Request("http://localhost:3000/api/v1/assignments", {
        headers: {
          cookie: `lms_session=${encodeURIComponent(sessionToken)}`
        }
      });

      const res = await getAssignments(req);
      expect(res).toBeDefined();
      if (res) {
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data)).toBe(true);
      }
    }
  });

  it("executes POST /api/v1/assignments successfully to create an assignment in DB", async () => {
    const db = getFreshPrisma();
    const adminUser = await db.apiUser.findFirst({ where: { role: "ADMIN" } });
    const course = await db.course.findFirst();
    expect(adminUser).toBeDefined();
    expect(course).toBeDefined();

    if (adminUser && course) {
      const sessionToken = "test-session-token-post-" + Date.now();
      const crypto = await import("crypto");
      const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");

      await db.authSession.create({
        data: {
          userId: adminUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600 * 1000)
        }
      });

      const req = new Request("http://localhost:3000/api/v1/assignments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `lms_session=${encodeURIComponent(sessionToken)}`
        },
        body: JSON.stringify({
          title: "Integration Test Assignment " + Date.now(),
          description: "Created via automated end-to-end API test",
          courseId: course.id,
          dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
          totalMarks: 100,
          status: "PUBLISHED"
        })
      });

      const res = await createAssignment(req);
      expect(res).toBeDefined();
      if (res) {
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.title).toContain("Integration Test Assignment");
      }
    }
  });
});

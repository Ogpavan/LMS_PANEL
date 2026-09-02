import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { getFreshPrisma } from "@/server/prisma";

interface CreateTemplatePayload {
  action: "create-template";
  name: string;
  courseTitle: string;
  imageUrl?: string;
  status?: string;
}

interface IssueCertificatePayload {
  action: "issue-certificate";
  templateId: number;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  certificateNumber?: string;
}

type PostPayload = CreateTemplatePayload | IssueCertificatePayload;

export async function GET(request: Request) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
      requiredPermission: "academy.courses.certificates"
    });

    if ("error" in auth) {
      return auth.error;
    }

    await ensureDatabaseSetup();
    const db = getFreshPrisma();

    const templates = await db.certificateTemplate.findMany({
      include: {
        _count: {
          select: {
            certificates: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formattedTemplates = templates.map((template) => ({
      id: template.id,
      templateName: template.name,
      courseTitle: template.courseTitle,
      imageUrl: template.imageUrl || "",
      issuedCount: template._count.certificates,
      status: template.status,
      createdAt: template.createdAt.toISOString()
    }));

    const queueRecords = await db.issuedCertificate.findMany({
      include: {
        template: {
          select: {
            name: true
          }
        }
      },
      orderBy: { issuedAt: "desc" }
    });

    const formattedQueue = queueRecords.map((record) => ({
      id: record.id,
      certificateCode: record.certificateNumber,
      templateId: record.templateId,
      templateName: record.template.name,
      studentName: record.studentName,
      studentEmail: record.studentEmail,
      courseTitle: record.courseTitle,
      issuedDate: record.issuedAt.toISOString(),
      status: record.status
    }));

    return apiResponse({
      success: true,
      data: {
        templates: formattedTemplates,
        certificateQueue: formattedQueue
      }
    });
  } catch (error) {
    console.error("GET /api/v1/certificates error:", error);
    return apiError("Failed to load certificates data", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
      requiredPermission: "academy.courses.certificates"
    });

    if ("error" in auth) {
      return auth.error;
    }

    const payload = await readJson<PostPayload>(request);

    if (!payload || !payload.action) {
      return apiError("Action payload is required", 422);
    }

    await ensureDatabaseSetup();
    const db = getFreshPrisma();

    if (payload.action === "create-template") {
      if (!payload.name || !payload.courseTitle) {
        return apiError("Template name and course title are required", 422);
      }

      const created = await db.certificateTemplate.create({
        data: {
          name: payload.name.trim(),
          courseTitle: payload.courseTitle.trim(),
          imageUrl: payload.imageUrl?.trim() || "",
          status: payload.status || "active"
        }
      });

      return apiResponse(
        {
          success: true,
          data: created
        },
        { status: 201 }
      );
    }

    if (payload.action === "issue-certificate") {
      const templateId = Number(payload.templateId);
      if (!Number.isInteger(templateId) || templateId <= 0) {
        return apiError("Valid template ID is required", 422);
      }

      if (!payload.studentName || !payload.studentEmail || !payload.courseTitle) {
        return apiError("Student name, email, and course title are required", 422);
      }

      const templateExists = await db.certificateTemplate.findUnique({
        where: { id: templateId }
      });

      if (!templateExists) {
        return apiError("Certificate template not found", 404);
      }

      const certNum =
        payload.certificateNumber?.trim() ||
        `CRT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const existingCert = await db.issuedCertificate.findUnique({
        where: { certificateNumber: certNum }
      });

      if (existingCert) {
        return apiError("Certificate number already exists", 409);
      }

      const issued = await db.issuedCertificate.create({
        data: {
          certificateNumber: certNum,
          templateId,
          studentName: payload.studentName.trim(),
          studentEmail: payload.studentEmail.trim(),
          courseTitle: payload.courseTitle.trim(),
          status: "issued"
        }
      });

      return apiResponse(
        {
          success: true,
          data: issued
        },
        { status: 201 }
      );
    }

    return apiError("Invalid action", 422);
  } catch (error) {
    console.error("POST /api/v1/certificates error:", error);
    return apiError(
      `Failed to process request: ${error instanceof Error ? error.message : "Database error"}`,
      500
    );
  }
}

export const OPTIONS = handleOptions;

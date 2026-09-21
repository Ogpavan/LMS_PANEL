import { apiResponse, handleOptions } from "@/server/api";
import { syncGoogleQuizResponses } from "@/server/google/forms";
import { prisma } from "@/server/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Extract formId if passed in message
    const formId = body?.message?.attributes?.formId || body?.formId;

    if (formId) {
      const quiz = await prisma.quiz.findFirst({
        where: { googleFormId: formId }
      });

      if (quiz) {
        // Find an admin user to trigger sync
        const adminUser = await prisma.apiUser.findFirst({
          where: { role: "ADMIN" }
        });

        if (adminUser) {
          await syncGoogleQuizResponses(quiz.id, adminUser.id);
        }
      }
    }

    return apiResponse({ success: true });
  } catch (err) {
    console.error("POST /api/v1/google/webhooks/forms error:", err);
    return apiResponse({ success: true }); // Always 200 OK for webhooks
  }
}

export const OPTIONS = handleOptions;

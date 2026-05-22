import { authorizeRequest } from "@/server/auth";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { prisma } from "@/server/prisma";
import {
  type GeneralSettings,
  normalizeGeneralSettings
} from "@/lib/general-settings";

interface GeneralSettingsRow {
  lms_name: string;
  support_email: string;
  support_contact: string;
  tagline: string;
  primary_color: string;
  accent_color: string;
  heading_font: string;
  body_font: string;
}

export async function GET() {
  await ensureDatabaseSetup();

  const [row] = await prisma.$queryRaw<GeneralSettingsRow[]>`
    SELECT
      "lms_name",
      "support_email",
      "support_contact",
      "tagline",
      "primary_color",
      "accent_color",
      "heading_font",
      "body_font"
    FROM "lms_general_settings"
    WHERE "id" = 1
    LIMIT 1
  `;

  const data = normalizeGeneralSettings(
    row
      ? {
          lmsName: row.lms_name,
          supportEmail: row.support_email,
          supportContact: row.support_contact,
          tagline: row.tagline,
          primaryColor: row.primary_color,
          accentColor: row.accent_color,
          headingFont: row.heading_font,
          bodyFont: row.body_font
        }
      : null
  );

  return apiResponse({
    success: true,
    data
  });
}

export async function PUT(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.administration.settings"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const payload = await readJson<Partial<GeneralSettings>>(request);

  if (!payload) {
    return apiError("Invalid settings payload", 422);
  }

  const data = normalizeGeneralSettings(payload);

  if (!data.lmsName || !data.supportEmail || !data.supportContact) {
    return apiError("LMS name, support email, and support contact are required", 422);
  }

  await ensureDatabaseSetup();

  await prisma.$executeRaw`
    UPDATE "lms_general_settings"
    SET
      "lms_name" = ${data.lmsName},
      "support_email" = ${data.supportEmail},
      "support_contact" = ${data.supportContact},
      "tagline" = ${data.tagline},
      "primary_color" = ${data.primaryColor},
      "accent_color" = ${data.accentColor},
      "heading_font" = ${data.headingFont},
      "body_font" = ${data.bodyFont},
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = 1
  `;

  return apiResponse({
    success: true,
    data
  });
}

export const OPTIONS = handleOptions;

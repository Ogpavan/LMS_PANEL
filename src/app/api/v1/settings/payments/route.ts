import { authorizeRequest } from "@/server/auth";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { prisma } from "@/server/prisma";
import {
  type PaymentSettings,
  normalizePaymentSettings
} from "@/lib/payment-settings";

interface PaymentSettingsRow {
  active_gateway: string;
  currency: string;
  tax_mode: string;
  invoice_prefix: string;
  razorpay_key_id: string;
  razorpay_key_secret: string;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  webhook_secret: string;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN"], {
    requiredPermission: "academy.administration.settings"
  });

  if ("error" in auth) {
    return auth.error;
  }

  await ensureDatabaseSetup();

  const [row] = await prisma.$queryRaw<PaymentSettingsRow[]>`
    SELECT
      "active_gateway",
      "currency",
      "tax_mode",
      "invoice_prefix",
      "razorpay_key_id",
      "razorpay_key_secret",
      "stripe_publishable_key",
      "stripe_secret_key",
      "webhook_secret"
    FROM "lms_payment_settings"
    WHERE "id" = 1
    LIMIT 1
  `;

  const data = normalizePaymentSettings(
    row
      ? {
          activeGateway: row.active_gateway === "stripe" ? "stripe" : "razorpay",
          currency: row.currency,
          taxMode: row.tax_mode,
          invoicePrefix: row.invoice_prefix,
          razorpayKeyId: row.razorpay_key_id,
          razorpayKeySecret: row.razorpay_key_secret,
          stripePublishableKey: row.stripe_publishable_key,
          stripeSecretKey: row.stripe_secret_key,
          webhookSecret: row.webhook_secret
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

  const payload = await readJson<Partial<PaymentSettings>>(request);

  if (!payload) {
    return apiError("Invalid payment settings payload", 422);
  }

  const data = normalizePaymentSettings(payload);

  if (!data.currency || !data.taxMode || !data.invoicePrefix) {
    return apiError("Currency, tax mode, and invoice prefix are required", 422);
  }

  if (data.activeGateway === "razorpay" && (!data.razorpayKeyId || !data.razorpayKeySecret)) {
    return apiError("Razorpay key ID and secret are required for Razorpay", 422);
  }

  if (
    data.activeGateway === "stripe" &&
    (!data.stripePublishableKey || !data.stripeSecretKey)
  ) {
    return apiError("Stripe publishable and secret keys are required for Stripe", 422);
  }

  await ensureDatabaseSetup();

  await prisma.$executeRaw`
    UPDATE "lms_payment_settings"
    SET
      "active_gateway" = ${data.activeGateway},
      "currency" = ${data.currency},
      "tax_mode" = ${data.taxMode},
      "invoice_prefix" = ${data.invoicePrefix},
      "razorpay_key_id" = ${data.razorpayKeyId},
      "razorpay_key_secret" = ${data.razorpayKeySecret},
      "stripe_publishable_key" = ${data.stripePublishableKey},
      "stripe_secret_key" = ${data.stripeSecretKey},
      "webhook_secret" = ${data.webhookSecret},
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = 1
  `;

  return apiResponse({
    success: true,
    data
  });
}

export const OPTIONS = handleOptions;

export interface PaymentSettings {
  activeGateway: "razorpay" | "stripe";
  currency: string;
  taxMode: string;
  invoicePrefix: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  webhookSecret: string;
}

export const paymentSettingsDefaults: PaymentSettings = {
  activeGateway: "razorpay",
  currency: "INR",
  taxMode: "GST included",
  invoicePrefix: "INV",
  razorpayKeyId: "",
  razorpayKeySecret: "",
  stripePublishableKey: "",
  stripeSecretKey: "",
  webhookSecret: ""
};

export function normalizePaymentSettings(
  value: Partial<PaymentSettings> | null | undefined
): PaymentSettings {
  const source = value ?? {};

  return {
    activeGateway: source.activeGateway === "stripe" ? "stripe" : "razorpay",
    currency: normalizeText(source.currency, paymentSettingsDefaults.currency).toUpperCase(),
    taxMode: normalizeText(source.taxMode, paymentSettingsDefaults.taxMode),
    invoicePrefix: normalizeText(source.invoicePrefix, paymentSettingsDefaults.invoicePrefix).toUpperCase(),
    razorpayKeyId: normalizeText(source.razorpayKeyId, ""),
    razorpayKeySecret: normalizeText(source.razorpayKeySecret, ""),
    stripePublishableKey: normalizeText(source.stripePublishableKey, ""),
    stripeSecretKey: normalizeText(source.stripeSecretKey, ""),
    webhookSecret: normalizeText(source.webhookSecret, "")
  };
}

function normalizeText(value: string | undefined, fallback: string) {
  return typeof value === "string" ? value.trim() : fallback;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CreditCard, Globe, Lock, Palette, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import type { WidgetRendererProps } from "@/types/admin";
import type { GeneralSettings } from "@/lib/general-settings";
import type { PaymentSettings } from "@/lib/payment-settings";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  generalSettingsDefaults,
  generalSettingsFontOptions,
  normalizeGeneralSettings
} from "@/lib/general-settings";
import {
  normalizePaymentSettings,
  paymentSettingsDefaults
} from "@/lib/payment-settings";
import { useAuthStore } from "@/store/auth-store";
import { useAppSettingsStore } from "@/store/app-settings-store";

type SettingItem = {
  label: string;
  value: string;
};

type SettingSection = {
  title: string;
  description: string;
  items: SettingItem[];
};

type SettingsTab = {
  key: string;
  label: string;
  icon: typeof Globe;
  sections?: SettingSection[];
};

const tabs: SettingsTab[] = [
  {
    key: "general",
    label: "General",
    icon: Globe
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: Bell,
    sections: [
      {
        title: "Delivery channels",
        description: "Primary alert modes used by the platform.",
        items: [
          { label: "Student reminders", value: "Email and in-app enabled" },
          { label: "Admin alerts", value: "Email for enrollments and enquiries" },
          { label: "Instructor notices", value: "In-app with digest email" }
        ]
      },
      {
        title: "Template controls",
        description: "Message templates used for automated communication.",
        items: [
          { label: "Welcome emails", value: "Editable and active" },
          { label: "Deadline reminders", value: "Sent 24 hours before due time" },
          { label: "Certificate notices", value: "Instant delivery on completion" }
        ]
      }
    ]
  },
  {
    key: "payments",
    label: "Payments",
    icon: CreditCard
  },
  {
    key: "security-integrations",
    label: "Security & Integrations",
    icon: ShieldCheck,
    sections: [
      {
        title: "Security posture",
        description: "Administrative safeguards for the LMS control plane.",
        items: [
          { label: "Two-factor authentication", value: "Required for admin users" },
          { label: "Audit logs", value: "Track login, role, and settings changes" },
          { label: "Maintenance mode", value: "Restricted to super admins" }
        ]
      },
      {
        title: "Connected services",
        description: "External systems currently attached to the learning stack.",
        items: [
          { label: "Live classes", value: "Google Meet and Zoom integration" },
          { label: "Email provider", value: "SMTP relay configured" },
          { label: "Analytics and webhooks", value: "Enabled for reporting pipelines" }
        ]
      }
    ]
  }
];

export function AcademySettingsWidget({ config }: WidgetRendererProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const general = useAppSettingsStore((state) => state.general);
  const setGeneral = useAppSettingsStore((state) => state.setGeneral);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(generalSettingsDefaults);
  const [savedSettings, setSavedSettings] = useState<GeneralSettings>(generalSettingsDefaults);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(paymentSettingsDefaults);
  const [savedPaymentSettings, setSavedPaymentSettings] =
    useState<PaymentSettings>(paymentSettingsDefaults);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingPayments, setIsSavingPayments] = useState(false);

  useEffect(() => {
    setGeneralSettings(general);
    setSavedSettings(general);
  }, [general]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let active = true;

    async function loadPaymentSettings() {
      try {
        const response = await fetch("/api/v1/settings/payments", {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        const result = (await response.json()) as {
          success?: boolean;
          data?: Partial<PaymentSettings>;
        };

        if (!active || !response.ok || !result.success || !result.data) {
          return;
        }

        const normalized = normalizePaymentSettings(result.data);
        setPaymentSettings(normalized);
        setSavedPaymentSettings(normalized);
      } catch {
        // Keep defaults when fetch fails.
      }
    }

    void loadPaymentSettings();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const isGeneralDirty = useMemo(
    () => JSON.stringify(generalSettings) !== JSON.stringify(savedSettings),
    [generalSettings, savedSettings]
  );

  const isPaymentDirty = useMemo(
    () => JSON.stringify(paymentSettings) !== JSON.stringify(savedPaymentSettings),
    [paymentSettings, savedPaymentSettings]
  );

  function updateGeneralSetting<Key extends keyof GeneralSettings>(key: Key, value: GeneralSettings[Key]) {
    setGeneralSettings((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleReset() {
    setGeneralSettings(savedSettings);
  }

  function updatePaymentSetting<Key extends keyof PaymentSettings>(key: Key, value: PaymentSettings[Key]) {
    setPaymentSettings((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handlePaymentReset() {
    setPaymentSettings(savedPaymentSettings);
  }

  async function handleSave() {
    if (!accessToken) {
      toast.error("You must be logged in to update settings");
      return;
    }

    if (!generalSettings.lmsName.trim()) {
      toast.error("LMS name is required");
      return;
    }

    if (!generalSettings.supportEmail.trim()) {
      toast.error("Support email is required");
      return;
    }

    if (!generalSettings.supportContact.trim()) {
      toast.error("Support contact is required");
      return;
    }

    setIsSavingGeneral(true);

    try {
      const payload = normalizeGeneralSettings({
        ...generalSettings,
        lmsName: generalSettings.lmsName.trim(),
        supportEmail: generalSettings.supportEmail.trim(),
        supportContact: generalSettings.supportContact.trim(),
        tagline: generalSettings.tagline.trim()
      });

      const response = await fetch("/api/v1/settings/general", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: Partial<GeneralSettings>;
      };

      if (!response.ok || !result.success || !result.data) {
        toast.error(result.error ?? "Settings could not be saved");
        return;
      }

      const normalized = normalizeGeneralSettings(result.data);
      setGeneral(normalized);
      setGeneralSettings(normalized);
      setSavedSettings(normalized);
      toast.success("General settings saved");
    } catch {
      toast.error("Settings could not be saved");
    } finally {
      setIsSavingGeneral(false);
    }
  }

  async function handlePaymentSave() {
    if (!accessToken) {
      toast.error("You must be logged in to update payment settings");
      return;
    }

    if (!paymentSettings.currency.trim()) {
      toast.error("Currency is required");
      return;
    }

    if (!paymentSettings.invoicePrefix.trim()) {
      toast.error("Invoice prefix is required");
      return;
    }

    if (
      paymentSettings.activeGateway === "razorpay" &&
      (!paymentSettings.razorpayKeyId.trim() || !paymentSettings.razorpayKeySecret.trim())
    ) {
      toast.error("Enter Razorpay key ID and secret");
      return;
    }

    if (
      paymentSettings.activeGateway === "stripe" &&
      (!paymentSettings.stripePublishableKey.trim() || !paymentSettings.stripeSecretKey.trim())
    ) {
      toast.error("Enter Stripe publishable and secret keys");
      return;
    }

    setIsSavingPayments(true);

    try {
      const payload = normalizePaymentSettings(paymentSettings);
      const response = await fetch("/api/v1/settings/payments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: Partial<PaymentSettings>;
      };

      if (!response.ok || !result.success || !result.data) {
        toast.error(result.error ?? "Payment settings could not be saved");
        return;
      }

      const normalized = normalizePaymentSettings(result.data);
      setPaymentSettings(normalized);
      setSavedPaymentSettings(normalized);
      toast.success("Payment settings saved");
    } catch {
      toast.error("Payment settings could not be saved");
    } finally {
      setIsSavingPayments(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-[22px] font-medium leading-[32px] text-foreground">
            {config.title ?? "Settings"}
          </h2>
          <p className="text-[14px] leading-[22px] text-muted-foreground">
            Manage core LMS behavior from one administration page.
          </p>
        </div>
        <div className="rounded-md border border-border/80 bg-muted/35 px-3 py-2 text-[13px] text-muted-foreground">
          Active profile: Production defaults
        </div>
      </div>

      <Tabs defaultValue={tabs[0]?.key ?? "general"}>
        <TabsList>
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <TabsTrigger key={tab.key} value={tab.key}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-md border border-border/80 bg-background">
              <div className="border-b border-border/70 px-5 py-4">
                <h4 className="text-[16px] font-medium leading-[24px] text-foreground">
                  Platform identity
                </h4>
                <p className="text-[13px] leading-[20px] text-muted-foreground">
                  These settings control how the LMS presents itself to learners and staff.
                </p>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <Field label="LMS name" required>
                  <Input
                    value={generalSettings.lmsName}
                    onChange={(event) => updateGeneralSetting("lmsName", event.target.value)}
                    placeholder="Enter LMS name"
                  />
                </Field>
                <Field label="Support email" required>
                  <Input
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(event) => updateGeneralSetting("supportEmail", event.target.value)}
                    placeholder="support@company.com"
                  />
                </Field>
                <Field label="Support contact" required>
                  <Input
                    value={generalSettings.supportContact}
                    onChange={(event) => updateGeneralSetting("supportContact", event.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </Field>
                <Field label="Tagline">
                  <Input
                    value={generalSettings.tagline}
                    onChange={(event) => updateGeneralSetting("tagline", event.target.value)}
                    placeholder="Short platform description"
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-md border border-border/80 bg-background">
              <div className="border-b border-border/70 px-5 py-4">
                <h4 className="flex items-center gap-2 text-[16px] font-medium leading-[24px] text-foreground">
                  <Palette className="h-4 w-4" />
                  Branding
                </h4>
                <p className="text-[13px] leading-[20px] text-muted-foreground">
                  Set the key colors and typography used by the LMS brand.
                </p>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <ColorField
                  label="Primary color"
                  value={generalSettings.primaryColor}
                  onChange={(value) => updateGeneralSetting("primaryColor", value)}
                />
                <ColorField
                  label="Accent color"
                  value={generalSettings.accentColor}
                  onChange={(value) => updateGeneralSetting("accentColor", value)}
                />
                <SelectField
                  label="Heading font"
                  value={generalSettings.headingFont}
                  options={[...generalSettingsFontOptions]}
                  onChange={(value) => updateGeneralSetting("headingFont", value)}
                />
                <SelectField
                  label="Body font"
                  value={generalSettings.bodyFont}
                  options={[...generalSettingsFontOptions]}
                  onChange={(value) => updateGeneralSetting("bodyFont", value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/80 bg-muted/15 px-5 py-4">
            <div>
              <p className="text-[14px] font-medium leading-[22px] text-foreground">
                Save general settings
              </p>
              <p className="text-[13px] leading-[20px] text-muted-foreground">
                Required fields: LMS name, support email, and support contact.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!isGeneralDirty || isSavingGeneral}
              >
                Reset
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={!isGeneralDirty || isSavingGeneral}
              >
                {isSavingGeneral ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-md border border-border/80 bg-background">
              <div className="border-b border-border/70 px-5 py-4">
                <h4 className="text-[16px] font-medium leading-[24px] text-foreground">
                  Billing defaults
                </h4>
                <p className="text-[13px] leading-[20px] text-muted-foreground">
                  Define the commercial defaults used across checkout, invoices, and receipts.
                </p>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <SelectField
                  label="Active gateway"
                  value={paymentSettings.activeGateway}
                  options={["razorpay", "stripe"]}
                  onChange={(value) =>
                    updatePaymentSetting("activeGateway", value as PaymentSettings["activeGateway"])
                  }
                />
                <Field label="Currency" required>
                  <Input
                    value={paymentSettings.currency}
                    onChange={(event) => updatePaymentSetting("currency", event.target.value.toUpperCase())}
                    placeholder="INR"
                  />
                </Field>
                <Field label="Tax mode" required>
                  <Input
                    value={paymentSettings.taxMode}
                    onChange={(event) => updatePaymentSetting("taxMode", event.target.value)}
                    placeholder="GST included"
                  />
                </Field>
                <Field label="Invoice prefix" required>
                  <Input
                    value={paymentSettings.invoicePrefix}
                    onChange={(event) =>
                      updatePaymentSetting("invoicePrefix", event.target.value.toUpperCase())
                    }
                    placeholder="INV"
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-md border border-border/80 bg-background">
              <div className="border-b border-border/70 px-5 py-4">
                <h4 className="text-[16px] font-medium leading-[24px] text-foreground">
                  Gateway credentials
                </h4>
                <p className="text-[13px] leading-[20px] text-muted-foreground">
                  Enter Razorpay or Stripe keys here so payment processing can be configured from the LMS.
                </p>
              </div>
              <div className="grid gap-4 p-5">
                {paymentSettings.activeGateway === "razorpay" ? (
                  <>
                    <Field label="Razorpay key ID" required>
                      <Input
                        value={paymentSettings.razorpayKeyId}
                        onChange={(event) => updatePaymentSetting("razorpayKeyId", event.target.value)}
                        placeholder="rzp_live_xxxxx"
                      />
                    </Field>
                    <Field label="Razorpay key secret" required>
                      <Input
                        type="password"
                        value={paymentSettings.razorpayKeySecret}
                        onChange={(event) =>
                          updatePaymentSetting("razorpayKeySecret", event.target.value)
                        }
                        placeholder="Enter Razorpay secret"
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Stripe publishable key" required>
                      <Input
                        value={paymentSettings.stripePublishableKey}
                        onChange={(event) =>
                          updatePaymentSetting("stripePublishableKey", event.target.value)
                        }
                        placeholder="pk_live_xxxxx"
                      />
                    </Field>
                    <Field label="Stripe secret key" required>
                      <Input
                        type="password"
                        value={paymentSettings.stripeSecretKey}
                        onChange={(event) =>
                          updatePaymentSetting("stripeSecretKey", event.target.value)
                        }
                        placeholder="sk_live_xxxxx"
                      />
                    </Field>
                  </>
                )}

                <Field label="Webhook secret">
                  <Input
                    type="password"
                    value={paymentSettings.webhookSecret}
                    onChange={(event) => updatePaymentSetting("webhookSecret", event.target.value)}
                    placeholder="Optional webhook signing secret"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/80 bg-muted/15 px-5 py-4">
            <div>
              <p className="text-[14px] font-medium leading-[22px] text-foreground">
                Save payment settings
              </p>
              <p className="text-[13px] leading-[20px] text-muted-foreground">
                Enter gateway credentials here so Razorpay or Stripe can be integrated directly from settings.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handlePaymentReset}
                disabled={!isPaymentDirty || isSavingPayments}
              >
                Reset
              </Button>
              <Button
                onClick={() => void handlePaymentSave()}
                disabled={!isPaymentDirty || isSavingPayments}
              >
                {isSavingPayments ? "Saving..." : "Save payment settings"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {tabs
          .filter((tab) => tab.key !== "general" && tab.key !== "payments")
          .map((tab) => (
            <TabsContent key={tab.key} value={tab.key}>
              <div className="grid gap-4 xl:grid-cols-2">
                {tab.sections?.map((section) => (
                  <div
                    key={`${tab.key}-${section.title}`}
                    className="rounded-md border border-border/80 bg-muted/20"
                  >
                    <div className="border-b border-border/70 px-5 py-4">
                      <h4 className="text-[16px] font-medium leading-[24px] text-foreground">
                        {section.title}
                      </h4>
                      <p className="text-[13px] leading-[20px] text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                    <div className="space-y-3 p-5">
                      {section.items.map((item) => (
                        <div
                          key={`${section.title}-${item.label}`}
                          className="flex items-start justify-between gap-4 rounded-md bg-background/85 px-4 py-3"
                        >
                          <p className="text-[14px] font-medium leading-[22px] text-foreground">
                            {item.label}
                          </p>
                          <p className="max-w-[280px] text-right text-[13px] leading-[20px] text-muted-foreground">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-dashed border-border/80 bg-muted/15 px-5 py-4">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[14px] font-medium leading-[22px] text-foreground">
                      Change management
                    </p>
                    <p className="text-[13px] leading-[20px] text-muted-foreground">
                      Keep high-risk settings behind explicit save and audit actions when these
                      sections are connected to live APIs.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
      </Tabs>
    </div>
  );
}

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[13px] font-medium leading-[20px] text-foreground">
        {label}
        {required ? <span className="ml-1 text-[hsl(0_100%_64%)]">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-input bg-white p-1"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </Field>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-2 text-[15px] font-normal leading-[22px] text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/5"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

export interface GeneralSettings {
  lmsName: string;
  supportEmail: string;
  supportContact: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
}

export const generalSettingsDefaults: GeneralSettings = {
  lmsName: "ETPL Learning Suite",
  supportEmail: "support@etpllms.com",
  supportContact: "+91 98765 43210",
  tagline: "Professional learning operations for modern training teams.",
  primaryColor: "#7367f0",
  accentColor: "#0f766e",
  headingFont: "Poppins",
  bodyFont: "DM Sans"
};

export const generalSettingsFontOptions = [
  "Poppins",
  "DM Sans",
  "Manrope",
  "Montserrat",
  "Nunito Sans",
  "Work Sans"
] as const;

export function normalizeGeneralSettings(
  value: Partial<GeneralSettings> | null | undefined
): GeneralSettings {
  const source = value ?? {};

  return {
    lmsName: normalizeText(source.lmsName, generalSettingsDefaults.lmsName),
    supportEmail: normalizeText(source.supportEmail, generalSettingsDefaults.supportEmail),
    supportContact: normalizeText(source.supportContact, generalSettingsDefaults.supportContact),
    tagline: normalizeText(source.tagline, generalSettingsDefaults.tagline),
    primaryColor: normalizeHexColor(source.primaryColor, generalSettingsDefaults.primaryColor),
    accentColor: normalizeHexColor(source.accentColor, generalSettingsDefaults.accentColor),
    headingFont: normalizeFont(source.headingFont, generalSettingsDefaults.headingFont),
    bodyFont: normalizeFont(source.bodyFont, generalSettingsDefaults.bodyFont)
  };
}

export function hexToHslTriplet(hex: string) {
  const normalized = normalizeHexColor(hex, generalSettingsDefaults.primaryColor).replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));

    switch (max) {
      case red:
        hue = ((green - blue) / delta) % 6;
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }
  }

  const hueDegrees = Math.round(hue * 60 < 0 ? hue * 60 + 360 : hue * 60);
  const saturationPercent = Math.round(saturation * 100);
  const lightnessPercent = Math.round(lightness * 100);

  return `${hueDegrees} ${saturationPercent}% ${lightnessPercent}%`;
}

export function fontFamilyValue(fontName: string) {
  return `"${normalizeFont(fontName, generalSettingsDefaults.bodyFont)}", ui-sans-serif, system-ui`;
}

function normalizeText(value: string | undefined, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeFont(value: string | undefined, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  return generalSettingsFontOptions.includes(value as (typeof generalSettingsFontOptions)[number])
    ? value
    : fallback;
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

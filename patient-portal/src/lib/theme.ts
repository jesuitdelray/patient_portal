import { colors } from "./colors";

export type ClinicTheme = Record<string, string>;

const BRAND = "#4A90E2";
const DEFAULT_BRAND_SOFT = "#6BA3E8";
const DEFAULT_HIGHLIGHT = "#E8F4FD";
const DEFAULT_PROMO = "#E8F4FD";

export const defaultClinicTheme: ClinicTheme = {
  "--rem-bg-page": "#F5F5F7",
  "--rem-bg-surface": "#FFFFFF",
  "--rem-border-subtle": "#E5E7EB",
  "--rem-text-main": "#111827",
  "--rem-text-muted": "#6B7280",
  "--rem-brand": BRAND,
  "--rem-brand-text": pickText(BRAND),
  "--rem-brand-soft": DEFAULT_BRAND_SOFT,
  "--rem-brand-soft-text": pickText(DEFAULT_BRAND_SOFT),
  "--rem-nav-bg": "#FFFFFF",
  "--rem-nav-text": "#111827",
  "--rem-nav-icon": BRAND,
  "--rem-nav-active-bg": softColor(BRAND, 0.12),
  "--rem-nav-active-text": pickText(softColor(BRAND, 0.12)),
  "--rem-nav-active-icon": BRAND,
  "--rem-cta-bg": BRAND,
  "--rem-cta-bg-hover": darken(BRAND, 0.08),
  "--rem-cta-text": pickText(BRAND),
  "--rem-highlight-bg": DEFAULT_HIGHLIGHT,
  "--rem-highlight-text": pickText(DEFAULT_HIGHLIGHT),
  "--rem-promo-bg": DEFAULT_PROMO,
  "--rem-promo-text": pickText(DEFAULT_PROMO),
  "--rem-danger": "#EF4444",
  "--rem-success": "#16A34A",
};

let currentTheme: ClinicTheme = { ...defaultClinicTheme };

export function applyClinicTheme(theme?: ClinicTheme) {
  currentTheme = {
    ...defaultClinicTheme,
    ...(theme ?? {}),
  };

  if (typeof document !== "undefined") {
    for (const [token, value] of Object.entries(currentTheme)) {
      document.documentElement.style.setProperty(token, value);
    }
  }

  // Mutate shared color palette so legacy components keep working
  colors.primary = currentTheme["--rem-cta-bg"];
  colors.primaryLight = softColor(currentTheme["--rem-cta-bg"], 0.18);
  colors.primaryDark = darken(currentTheme["--rem-cta-bg"], 0.16);
  colors.primaryBg = currentTheme["--rem-highlight-bg"];
  colors.background = currentTheme["--rem-bg-surface"];
  colors.surface = currentTheme["--rem-bg-surface"];
  colors.border = currentTheme["--rem-border-subtle"];
  colors.medicalBlue = currentTheme["--rem-brand"];
  colors.medicalBlueBg = currentTheme["--rem-brand-soft"];
  colors.medicalGreen = currentTheme["--rem-success"];
  colors.medicalGreenDark = darken(currentTheme["--rem-success"], 0.18);
  colors.medicalGreenLight = softColor(currentTheme["--rem-success"], 0.18);
}

export function getCurrentTheme(): ClinicTheme {
  return currentTheme;
}

function softColor(hex: string, strength = 0.12) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * strength);
  return rgbToHex(mix(r), mix(g), mix(b));
}

function darken(hex: string, amount = 0.1) {
  const { r, g, b } = hexToRgb(hex);
  const adjust = (channel: number) =>
    Math.max(0, Math.round(channel * (1 - amount)));
  return rgbToHex(adjust(r), adjust(g), adjust(b));
}

function pickText(background: string) {
  const bg = normalizeHex(background);
  const lightContrast = getContrastRatio(bg, "#FFFFFF");
  const darkContrast = getContrastRatio(bg, "#111827");
  const threshold = 4.5;

  if (lightContrast >= threshold && darkContrast >= threshold) {
    return getLuminance(bg) > 0.5 ? "#111827" : "#FFFFFF";
  }
  if (lightContrast >= threshold) return "#FFFFFF";
  if (darkContrast >= threshold) return "#111827";
  return lightContrast > darkContrast ? "#FFFFFF" : "#111827";
}

function hexToRgb(hex: string) {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const intVal = parseInt(value, 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function normalizeHex(hex: string) {
  return hex.startsWith("#") ? hex.toUpperCase() : `#${hex}`.toUpperCase();
}

function getLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const [sr, sg, sb] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
}

function getContrastRatio(color1: string, color2: string) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

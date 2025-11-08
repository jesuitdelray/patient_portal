import { colors } from "./colors";

export type ClinicTheme = Record<string, string>;

export const defaultClinicTheme: ClinicTheme = {
  "--rem-bg-page": "#F5F5F7",
  "--rem-bg-surface": "#FFFFFF",
  "--rem-border-subtle": "#E5E7EB",
  "--rem-text-main": "#111827",
  "--rem-text-muted": "#6B7280",
  "--rem-brand": "#2563EB",
  "--rem-brand-soft": softColor("#2563EB", 0.12),
  "--rem-nav-bg": "#FFFFFF",
  "--rem-nav-text": "#111827",
  "--rem-nav-icon": "#2563EB",
  "--rem-nav-active-bg": softColor("#2563EB", 0.1),
  "--rem-nav-active-icon": "#2563EB",
  "--rem-cta-bg": "#2563EB",
  "--rem-cta-bg-hover": darken("#2563EB", 0.08),
  "--rem-cta-text": "#0F172A",
  "--rem-highlight-bg": softColor("#2563EB", 0.14),
  "--rem-highlight-text": "#111827",
  "--rem-promo-bg": softColor("#2563EB", 0.18),
  "--rem-promo-text": "#111827",
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
  colors.primaryLight = softColor(currentTheme["--rem-cta-bg"], 0.2);
  colors.primaryDark = darken(currentTheme["--rem-cta-bg"], 0.16);
  colors.primaryBg = currentTheme["--rem-highlight-bg"];
  colors.background = currentTheme["--rem-bg-surface"];
  colors.surface = currentTheme["--rem-bg-surface"];
  colors.border = currentTheme["--rem-border-subtle"];
  colors.textPrimary = currentTheme["--rem-text-main"];
  colors.textSecondary = currentTheme["--rem-text-muted"];
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



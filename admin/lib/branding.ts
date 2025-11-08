import type { ClinicBranding } from "@prisma/client";

export type ClinicBrandingInput = {
  clinicName: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  colors: {
    brand: string;
    nav?: string | null;
    cta?: string | null;
    highlight?: string | null;
    promo?: string | null;
    danger?: string | null;
  };
};

export type ClinicTheme = Record<string, string>;

const DEFAULT_DANGER = "#EF4444";
const DEFAULT_SUCCESS = "#16A34A";
const BLUE = "#2563EB";

const defaultThemeTokens: ClinicTheme = {
  "--rem-bg-page": "#F5F5F7",
  "--rem-bg-surface": "#FFFFFF",
  "--rem-border-subtle": "#E5E7EB",

  "--rem-text-main": "#111827",
  "--rem-text-muted": "#6B7280",

  // Brand
  "--rem-brand": BLUE,
  "--rem-brand-soft": softColor(BLUE, 0.08),

  // Sidebar
  "--rem-nav-bg": "#FFFFFF",
  "--rem-nav-text": "#111827",
  "--rem-nav-icon": BLUE,
  "--rem-nav-active-bg": softColor(BLUE, 0.06),
  "--rem-nav-active-icon": BLUE,

  // Primary CTA
  "--rem-cta-bg": BLUE,
  "--rem-cta-bg-hover": darken(BLUE, 0.08),
  "--rem-cta-text": "#FFFFFF",

  // Highlight banners (Upcoming Appointment и т.п.)
  "--rem-highlight-bg": softColor(BLUE, 0.04),
  "--rem-highlight-text": "#111827",

  // Promotions
  "--rem-promo-bg": softColor(BLUE, 0.06),
  "--rem-promo-text": "#111827",

  // Status
  "--rem-danger": DEFAULT_DANGER,
  "--rem-success": DEFAULT_SUCCESS,
};

export function buildClinicTheme(input: ClinicBrandingInput): ClinicTheme {
  const brand = normalizeHex(input.colors.brand);
  const nav = normalizeHex(
    input.colors.nav ??
      (isLightColor(brand) ? "#FFFFFF" : softColor(brand, 0.08))
  );
  const cta = normalizeHex(input.colors.cta ?? brand);
  const highlight = normalizeHex(input.colors.highlight ?? brand);
  const promo = normalizeHex(input.colors.promo ?? brand);
  const danger = normalizeHex(input.colors.danger ?? DEFAULT_DANGER);

  const theme: ClinicTheme = {
    ...defaultThemeTokens,
    "--rem-brand": brand,
    "--rem-brand-soft": softColor(brand, 0.12),
    "--rem-nav-bg": nav,
    "--rem-nav-text": readableColor(nav),
    "--rem-nav-icon": brand,
    "--rem-nav-active-bg": softColor(brand, 0.1),
    "--rem-nav-active-icon": brand,
    "--rem-cta-bg": cta,
    "--rem-cta-bg-hover": darken(cta, 0.08),
    "--rem-cta-text": readableColor(cta, "#111827", "#FFFFFF"),
    "--rem-highlight-bg": softColor(highlight, 0.14),
    "--rem-highlight-text": readableColor(
      softColor(highlight, 0.14),
      "#111827",
      "#0F172A"
    ),
    "--rem-promo-bg": softColor(promo, 0.16),
    "--rem-promo-text": readableColor(
      softColor(promo, 0.16),
      "#111827",
      "#0F172A"
    ),
    "--rem-danger": danger,
  };

  return theme;
}

export function clinicBrandingToInput(
  branding: ClinicBranding | null
): ClinicBrandingInput {
  return {
    clinicName: branding?.clinicName ?? null,
    logoUrl: branding?.logoUrl ?? null,
    faviconUrl: branding?.faviconUrl ?? null,
    colors: {
      brand: branding?.brandColor ?? defaultThemeTokens["--rem-brand"],
      nav: branding?.navColor ?? defaultThemeTokens["--rem-nav-bg"],
      cta:
        branding?.ctaColor ??
        branding?.brandColor ??
        defaultThemeTokens["--rem-cta-bg"],
      highlight:
        branding?.highlightColor ??
        branding?.brandColor ??
        defaultThemeTokens["--rem-brand"],
      promo:
        branding?.promoColor ??
        branding?.brandColor ??
        defaultThemeTokens["--rem-brand"],
      danger: branding?.dangerColor ?? DEFAULT_DANGER,
    },
  };
}

export function validateBrandingInput(
  input: ClinicBrandingInput
): ClinicBrandingInput {
  const ensureHex = (value: string | null | undefined, fallback: string) => {
    if (!value) return fallback;
    if (!isValidHex(value)) {
      throw new Error(`Invalid hex color: ${value}`);
    }
    return normalizeHex(value);
  };

  return {
    clinicName: input.clinicName ?? null,
    logoUrl: input.logoUrl ?? null,
    faviconUrl: input.faviconUrl ?? null,
    colors: {
      brand: ensureHex(input.colors.brand, defaultThemeTokens["--rem-brand"]),
      nav: ensureHex(
        input.colors.nav ?? undefined,
        defaultThemeTokens["--rem-nav-bg"]
      ),
      cta: ensureHex(
        input.colors.cta ?? input.colors.brand,
        defaultThemeTokens["--rem-cta-bg"]
      ),
      highlight: ensureHex(
        input.colors.highlight ?? input.colors.brand,
        defaultThemeTokens["--rem-brand"]
      ),
      promo: ensureHex(
        input.colors.promo ?? input.colors.brand,
        defaultThemeTokens["--rem-brand"]
      ),
      danger: ensureHex(input.colors.danger ?? undefined, DEFAULT_DANGER),
    },
  };
}

export function mapInputToPrismaData(input: ClinicBrandingInput) {
  const valid = validateBrandingInput(input);
  return {
    clinicName: valid.clinicName,
    logoUrl: valid.logoUrl,
    faviconUrl: valid.faviconUrl,
    brandColor: valid.colors.brand,
    navColor: valid.colors.nav,
    ctaColor: valid.colors.cta,
    highlightColor: valid.colors.highlight,
    promoColor: valid.colors.promo,
    dangerColor: valid.colors.danger,
  };
}

export function isValidHex(value: string) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
}

function normalizeHex(value: string) {
  if (!value.startsWith("#")) {
    return `#${value}`;
  }
  return value.toUpperCase();
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

function readableColor(
  hex: string,
  lightText = "#FFFFFF",
  darkText = "#111827"
) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? darkText : lightText;
}

function isLightColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.8;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex).replace("#", "");
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

export const defaultBrandingInput: ClinicBrandingInput = {
  clinicName: null,
  logoUrl: null,
  faviconUrl: null,
  colors: {
    brand: defaultThemeTokens["--rem-brand"],
    nav: defaultThemeTokens["--rem-nav-bg"],
    cta: defaultThemeTokens["--rem-cta-bg"],
    highlight: defaultThemeTokens["--rem-brand"],
    promo: defaultThemeTokens["--rem-brand"],
    danger: DEFAULT_DANGER,
  },
};

export const defaultClinicTheme = defaultThemeTokens;

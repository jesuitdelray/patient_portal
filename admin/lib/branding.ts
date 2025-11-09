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

const DEFAULT_BRAND_SOFT = softColor(BLUE, 0.22);
const DEFAULT_HIGHLIGHT_BG = softColor(BLUE, 0.35);
const DEFAULT_PROMO_BG = softColor(BLUE, 0.45);

const defaultThemeTokens: ClinicTheme = {
  "--rem-bg-page": "#F5F5F7",
  "--rem-bg-surface": "#FFFFFF",
  "--rem-border-subtle": "#E5E7EB",

  "--rem-text-main": "#111827",
  "--rem-text-muted": "#6B7280",

  // Brand
  "--rem-brand": BLUE,
  "--rem-brand-text": readableColor(BLUE, "#FFFFFF", "#0F172A"),
  "--rem-brand-soft": DEFAULT_BRAND_SOFT,
  "--rem-brand-soft-text": readableColor(
    DEFAULT_BRAND_SOFT,
    "#0F172A",
    "#FFFFFF"
  ),

  // Sidebar
  "--rem-nav-bg": "#FFFFFF",
  "--rem-nav-text": "#111827",
  "--rem-nav-icon": BLUE,
  "--rem-nav-active-bg": softColor(BLUE, 0.12),
  "--rem-nav-active-icon": BLUE,

  // Primary CTA
  "--rem-cta-bg": BLUE,
  "--rem-cta-bg-hover": darken(BLUE, 0.08),
  "--rem-cta-text": readableColor(BLUE, "#FFFFFF", "#0F172A"),

  // Highlight banners
  "--rem-highlight-bg": DEFAULT_HIGHLIGHT_BG,
  "--rem-highlight-text": readableColor(
    DEFAULT_HIGHLIGHT_BG,
    "#0F172A",
    "#FFFFFF"
  ),

  // Promotions
  "--rem-promo-bg": DEFAULT_PROMO_BG,
  "--rem-promo-text": readableColor(
    DEFAULT_PROMO_BG,
    "#0F172A",
    "#FFFFFF"
  ),

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

  const brandSoft = softColor(brand, 0.22);
  const highlightBg = softColor(highlight, 0.35);
  const promoBg = softColor(promo, 0.45);

  const theme: ClinicTheme = {
    ...defaultThemeTokens,
    "--rem-brand": brand,
    "--rem-brand-text": readableColor(brand, "#FFFFFF", "#0F172A"),
    "--rem-brand-soft": brandSoft,
    "--rem-brand-soft-text": readableColor(
      brandSoft,
      "#0F172A",
      "#FFFFFF"
    ),
    "--rem-nav-bg": nav,
    "--rem-nav-text": readableColor(nav),
    "--rem-nav-icon": brand,
    "--rem-nav-active-bg": softColor(brand, 0.12),
    "--rem-nav-active-icon": brand,
    "--rem-cta-bg": cta,
    "--rem-cta-bg-hover": darken(cta, 0.08),
    "--rem-cta-text": readableColor(cta, "#111827", "#FFFFFF"),
    "--rem-highlight-bg": highlightBg,
    "--rem-highlight-text": readableColor(
      highlightBg,
      "#0F172A",
      "#FFFFFF"
    ),
    "--rem-promo-bg": promoBg,
    "--rem-promo-text": readableColor(
      promoBg,
      "#0F172A",
      "#FFFFFF"
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
  darkText = "#111827",
  threshold = 4.5
) {
  const background = normalizeHex(hex);
  const lightContrast = getContrastRatio(background, lightText);
  const darkContrast = getContrastRatio(background, darkText);

  if (lightContrast >= threshold && darkContrast >= threshold) {
    return getLuminance(background) > 0.5 ? darkText : lightText;
  }

  if (lightContrast >= threshold) return lightText;
  if (darkContrast >= threshold) return darkText;
  return lightContrast > darkContrast ? lightText : darkText;
}

function isLightColor(hex: string) {
  return getLuminance(hex) > 0.75;
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

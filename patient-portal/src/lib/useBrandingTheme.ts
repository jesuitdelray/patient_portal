import { useMemo } from "react";
import { useBranding } from "./useBranding";
import { getCurrentTheme, defaultClinicTheme } from "./theme";
import { colors } from "./colors";

const LIGHT_TEXT = "#FFFFFF";
const DARK_TEXT = "#111827";

export type BrandingTheme = {
  brand: string;
  brandText: string;
  brandSoft: string;
  brandSoftText: string;
  navBg: string;
  navText: string;
  navIcon: string;
  navActiveBg: string;
  navActiveIcon: string;
  navActiveText: string;
  ctaBg: string;
  ctaBgHover: string;
  ctaText: string;
  highlightBg: string;
  highlightText: string;
  promoBg: string;
  promoText: string;
  danger: string;
  success: string;
  textPrimary: string;
  textSecondary: string;
  borderSubtle: string;
  surface: string;
  pageBg: string;
};

export function useBrandingTheme(): BrandingTheme {
  const { branding } = useBranding();

  return useMemo(() => {
    const theme = branding.theme ?? getCurrentTheme() ?? defaultClinicTheme;

    const brand = ensureHex(theme["--rem-brand"], "#2563EB");
    const brandSoft = ensureHex(
      theme["--rem-brand-soft"],
      softColor(brand, 0.2)
    );
    const highlightBg = ensureHex(
      theme["--rem-highlight-bg"],
      softColor(brand, 0.35)
    );
    const promoBg = ensureHex(
      theme["--rem-promo-bg"],
      softColor(brand, 0.45)
    );
    const ctaBg = ensureHex(theme["--rem-cta-bg"], brand);
    const navActiveBg = ensureHex(
      theme["--rem-nav-active-bg"],
      softColor(brand, 0.12)
    );

    return {
      brand,
      brandText: colors.primaryWhite,
      brandSoft,
      brandSoftText: colors.textPrimary,
      navBg: ensureHex(theme["--rem-nav-bg"], "#FFFFFF"),
      navText: colors.textPrimary,
      navIcon: ensureHex(theme["--rem-nav-icon"], brand),
      navActiveBg,
      navActiveIcon: ensureHex(theme["--rem-nav-active-icon"], brand),
      navActiveText: colors.textPrimary,
      ctaBg,
      ctaBgHover: ensureHex(
        theme["--rem-cta-bg-hover"],
        darken(ctaBg, 0.08)
      ),
      ctaText: colors.primaryWhite,
      highlightBg,
      highlightText: colors.textPrimary,
      promoBg,
      promoText: colors.textPrimary,
      danger: ensureHex(theme["--rem-danger"], "#EF4444"),
      success: ensureHex(theme["--rem-success"], "#16A34A"),
      textPrimary: colors.textPrimary,
      textSecondary: colors.textSecondary,
      borderSubtle: ensureHex(theme["--rem-border-subtle"], "#E5E7EB"),
      surface: ensureHex(theme["--rem-bg-surface"], "#FFFFFF"),
      pageBg: ensureHex(theme["--rem-bg-page"], "#F5F5F7"),
    };
  }, [branding.theme]);
}

function ensureHex(value: string | undefined, fallback: string) {
  if (!value || typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (!trimmed.startsWith("#")) {
    return `#${trimmed}`.slice(0, 7).toUpperCase();
  }
  return trimmed.slice(0, 7).toUpperCase();
}

function ensureText(
  explicit: string | undefined,
  background: string,
  dark: string,
  light: string
) {
  if (explicit && explicit.trim()) {
    return ensureHex(explicit, pickText(background, dark, light));
  }
  return pickText(background, dark, light);
}

function hexToRgb(hex: string) {
  const normalized = ensureHex(hex, "#000000").replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const intVal = parseInt(expanded, 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

function softColor(hex: string, strength = 0.12) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * strength);
  return ensureHex(
    rgbToHex(mix(r), mix(g), mix(b)),
    rgbToHex(mix(r), mix(g), mix(b))
  );
}

function darken(hex: string, amount = 0.1) {
  const { r, g, b } = hexToRgb(hex);
  const adjust = (channel: number) =>
    Math.max(0, Math.round(channel * (1 - amount)));
  return rgbToHex(adjust(r), adjust(g), adjust(b));
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

function pickText(background: string, dark: string, light: string) {
  const bg = ensureHex(background, "#000000");
  const darkHex = ensureHex(dark, "#111827");
  const lightHex = ensureHex(light, "#FFFFFF");
  const threshold = 4.5;

  const lightContrast = getContrastRatio(bg, lightHex);
  const darkContrast = getContrastRatio(bg, darkHex);

  if (lightContrast >= threshold && darkContrast >= threshold) {
    return getLuminance(bg) > 0.5 ? darkHex : lightHex;
  }
  if (lightContrast >= threshold) return lightHex;
  if (darkContrast >= threshold) return darkHex;
  return lightContrast > darkContrast ? lightHex : darkHex;
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


import { useMemo } from "react";
import { useBranding } from "./useBranding";
import { colors } from "./colors";

export type BrandingTheme = {
  primary: string;
  primaryContrast: string;
  primarySoft: string;
  primaryBorder: string;
  primaryMuted: string;
  primaryOverlay: string;
  secondary: string;
  secondaryContrast: string;
  secondarySoft: string;
  accent: string;
  accentContrast: string;
  accentSoft: string;
};

const WHITE = "#FFFFFF";

function normalizeHex(color?: string | null) {
  if (!color) return null;
  const trimmed = color.trim();
  if (!trimmed) return null;
  let hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  return `#${hex.toUpperCase()}`;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return { r: 0, g: 0, b: 0 };
  }
  const value = parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function mix(colorA: string, colorB: string, weight: number) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const w = Math.max(0, Math.min(1, weight));
  const toHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${toHex(a.r * (1 - w) + b.r * w)}${toHex(
    a.g * (1 - w) + b.g * w
  )}${toHex(a.b * (1 - w) + b.b * w)}`;
}

function contrastColor(color: string) {
  const { r, g, b } = hexToRgb(color);
  const [sr, sg, sb] = [r, g, b].map((v) => v / 255);
  const luminance =
    0.2126 * (sr <= 0.03928 ? sr / 12.92 : Math.pow((sr + 0.055) / 1.055, 2.4)) +
    0.7152 * (sg <= 0.03928 ? sg / 12.92 : Math.pow((sg + 0.055) / 1.055, 2.4)) +
    0.0722 * (sb <= 0.03928 ? sb / 12.92 : Math.pow((sb + 0.055) / 1.055, 2.4));
  return luminance > 0.6 ? "#111111" : "#FFFFFF";
}

function rgba(color: string, alpha: number) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function useBrandingTheme(): BrandingTheme {
  const { branding } = useBranding();

  return useMemo(() => {
    const primary = normalizeHex(branding.primaryColor) || colors.primary;
    const secondary =
      normalizeHex(branding.secondaryColor) || colors.medicalTeal;
    const accent = normalizeHex(branding.accentColor) || colors.medicalGreen;

    return {
      primary,
      primaryContrast: contrastColor(primary),
      primarySoft: mix(primary, WHITE, 0.85),
      primaryBorder: mix(primary, WHITE, 0.7),
      primaryMuted: mix(primary, WHITE, 0.5),
      primaryOverlay: rgba(primary, 0.15),
      secondary,
      secondaryContrast: contrastColor(secondary),
      secondarySoft: mix(secondary, WHITE, 0.85),
      accent,
      accentContrast: contrastColor(accent),
      accentSoft: mix(accent, WHITE, 0.85),
    };
  }, [branding.primaryColor, branding.secondaryColor, branding.accentColor]);
}


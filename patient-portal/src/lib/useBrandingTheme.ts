import { useMemo } from "react";
import { useBranding } from "./useBranding";
import { getCurrentTheme, defaultClinicTheme } from "./theme";

export type BrandingTheme = {
  brand: string;
  brandSoft: string;
  navBg: string;
  navText: string;
  navIcon: string;
  navActiveBg: string;
  navActiveIcon: string;
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

    return {
      brand: theme["--rem-brand"],
      brandSoft: theme["--rem-brand-soft"],
      navBg: theme["--rem-nav-bg"],
      navText: theme["--rem-nav-text"],
      navIcon: theme["--rem-nav-icon"],
      navActiveBg: theme["--rem-nav-active-bg"],
      navActiveIcon: theme["--rem-nav-active-icon"],
      ctaBg: theme["--rem-cta-bg"],
      ctaBgHover: theme["--rem-cta-bg-hover"],
      ctaText: theme["--rem-cta-text"],
      highlightBg: theme["--rem-highlight-bg"],
      highlightText: theme["--rem-highlight-text"],
      promoBg: theme["--rem-promo-bg"],
      promoText: theme["--rem-promo-text"],
      danger: theme["--rem-danger"],
      success: theme["--rem-success"],
      textPrimary: theme["--rem-text-main"],
      textSecondary: theme["--rem-text-muted"],
      borderSubtle: theme["--rem-border-subtle"],
      surface: theme["--rem-bg-surface"],
      pageBg: theme["--rem-bg-page"],
    };
  }, [branding.theme]);
}


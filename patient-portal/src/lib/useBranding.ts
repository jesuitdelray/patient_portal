import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./queries";
import { API_BASE } from "./api";
import {
  ClinicTheme,
  applyClinicTheme,
  defaultClinicTheme,
} from "./theme";

type BrandingColors = {
  brand: string;
  nav: string;
  cta: string;
  highlight: string;
  promo: string;
  danger: string;
};

export type BrandingData = {
  clinicName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: BrandingColors;
  theme: ClinicTheme;
  updatedAt: string | null;
};

const EMPTY_BRANDING: BrandingData = {
  clinicName: null,
  logoUrl: null,
  faviconUrl: null,
  colors: {
    brand: defaultClinicTheme["--rem-brand"],
    nav: defaultClinicTheme["--rem-nav-bg"],
    cta: defaultClinicTheme["--rem-cta-bg"],
    highlight: defaultClinicTheme["--rem-highlight-bg"],
    promo: defaultClinicTheme["--rem-promo-bg"],
    danger: defaultClinicTheme["--rem-danger"],
  },
  theme: defaultClinicTheme,
  updatedAt: null,
};

function normalizeHex(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (!trimmed.startsWith("#")) {
    return `#${trimmed}`.toUpperCase();
  }
  return trimmed.toUpperCase();
}

export function useBranding() {
  const { data: auth } = useAuth();
  const patientId = auth?.role === "patient" ? auth.userId : null;

  const query = useQuery<BrandingData>({
    queryKey: ["branding", patientId ?? "public"],
    queryFn: async () => {
      const targetId = patientId ?? "public";
      const res = await fetch(`${API_BASE}/patients/${targetId}/branding`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch branding");
      }
      const payload = await res.json();
      const theme: ClinicTheme = {
        ...defaultClinicTheme,
        ...(payload.theme ?? {}),
      };
      const colors: BrandingColors = {
        brand: normalizeHex(
          payload.colors?.brand ?? null,
          theme["--rem-brand"]
        ),
        nav: normalizeHex(payload.colors?.nav ?? null, theme["--rem-nav-bg"]),
        cta: normalizeHex(
          payload.colors?.cta ?? payload.colors?.brand ?? null,
          theme["--rem-cta-bg"]
        ),
        highlight: normalizeHex(
          payload.colors?.highlight ?? payload.colors?.brand ?? null,
          theme["--rem-highlight-bg"]
        ),
        promo: normalizeHex(
          payload.colors?.promo ?? payload.colors?.brand ?? null,
          theme["--rem-promo-bg"]
        ),
        danger: normalizeHex(
          payload.colors?.danger ?? null,
          theme["--rem-danger"]
        ),
      };
      return {
        clinicName: payload.clinicName ?? null,
        logoUrl: payload.logoUrl ?? null,
        faviconUrl: payload.faviconUrl ?? null,
        colors,
        theme,
        updatedAt: payload.updatedAt ?? null,
      };
    },
    initialData: EMPTY_BRANDING,
  });

  useEffect(() => {
    if (query.data?.theme) {
      applyClinicTheme(query.data.theme);
    } else {
      applyClinicTheme(defaultClinicTheme);
    }
  }, [query.data?.theme]);

  return {
    branding: query.data ?? EMPTY_BRANDING,
    isLoading: query.isLoading,
    isInitialLoading: query.isFetching,
    refetch: query.refetch,
  };
}


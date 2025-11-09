import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./queries";
import { API_BASE, connectSocket } from "./api";
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

const BRANDING_CACHE_PREFIX = "branding-cache:v1:";

type CachedBrandingEntry = {
  data: BrandingData;
  cacheTimestamp: number;
};

function getCacheKey(patientId: string | null | undefined) {
  return `${BRANDING_CACHE_PREFIX}${patientId ?? "public"}`;
}

function readCachedBranding(cacheKey: string): CachedBrandingEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.cacheTimestamp !== "number" ||
      !parsed.data ||
      typeof parsed.data !== "object"
    ) {
      return null;
    }
    return parsed as CachedBrandingEntry;
  } catch (error) {
    console.warn("[Branding] Failed to read cache", error);
    return null;
  }
}

function writeCachedBranding(cacheKey: string, data: BrandingData) {
  if (typeof window === "undefined") return;
  try {
    const entry: CachedBrandingEntry = {
      data,
      cacheTimestamp: Date.now(),
    };
    window.localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.warn("[Branding] Failed to write cache", error);
  }
}

export function useBranding() {
  const { data: auth } = useAuth();
  const patientId = auth?.role === "patient" ? auth.userId : null;
  const queryClient = useQueryClient();
  const brandingKey = ["branding", patientId ?? "public"] as const;
  const cacheKey = useMemo(() => getCacheKey(patientId), [patientId]);
  const cachedEntry = useMemo(
    () => readCachedBranding(cacheKey),
    [cacheKey]
  );

  const query = useQuery<BrandingData>({
    queryKey: brandingKey,
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
    initialData: () => cachedEntry?.data ?? EMPTY_BRANDING,
    initialDataUpdatedAt: cachedEntry?.cacheTimestamp,
    staleTime: 5 * 60 * 1000,
    networkMode: "always",
    refetchOnMount: (query) => query.state.dataUpdateCount === 0,
    refetchOnReconnect: (query) => query.state.dataUpdateCount === 0,
    refetchOnWindowFocus: (query) => query.state.dataUpdateCount === 0,
  });

  useEffect(() => {
    const socket = connectSocket(patientId ? { patientId } : undefined);
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: brandingKey });
    };
    socket.on("branding:update", handler);
    return () => {
      socket.off("branding:update", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, queryClient]);

  useEffect(() => {
    if (query.isSuccess && query.isFetchedAfterMount && query.data) {
      writeCachedBranding(cacheKey, query.data);
    }
  }, [cacheKey, query.data, query.isFetchedAfterMount, query.isSuccess]);

  useEffect(() => {
    if (query.data?.theme) {
      applyClinicTheme(query.data.theme);
    } else {
      applyClinicTheme(defaultClinicTheme);
    }
  }, [query.data?.theme]);

  return {
    branding: query.data ?? EMPTY_BRANDING,
    isLoading: query.isFetching,
    isInitialLoading: query.isLoading,
    refetch: query.refetch,
  };
}


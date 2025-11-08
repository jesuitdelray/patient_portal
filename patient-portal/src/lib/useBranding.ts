import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./queries";
import { API_BASE } from "./api";

export type BrandingData = {
  clinicName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  faviconUrl: string | null;
  updatedAt: string | null;
};

const EMPTY_BRANDING: BrandingData = {
  clinicName: null,
  logoUrl: null,
  primaryColor: null,
  secondaryColor: null,
  accentColor: null,
  faviconUrl: null,
  updatedAt: null,
};

export function useBranding() {
  const { data: auth } = useAuth();
  const patientId = auth?.role === "patient" ? auth.userId : null;

  const {
    data = EMPTY_BRANDING,
    isLoading,
    isFetching: isInitialLoading,
    refetch,
  } = useQuery<BrandingData>({
    queryKey: ["branding", patientId ?? "public"],
    queryFn: async () => {
      const targetId = patientId ?? "public";
      const res = await fetch(`${API_BASE}/patients/${targetId}/branding`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch branding");
      }
      return res.json();
    },
  });

  return {
    branding: data,
    isLoading,
    isInitialLoading,
    refetch,
  };
}


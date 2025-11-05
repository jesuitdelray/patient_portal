import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE, resolvePatientId, fetchWithAuth, getAuthBase } from "./api";
import { storageSync } from "./storage";

// Query keys
export const queryKeys = {
  auth: ["auth", "me"] as const,
  patient: (id: string) => ["patients", id] as const,
  appointments: (patientId: string) => ["appointments", patientId] as const,
  messages: (patientId: string) => ["messages", patientId] as const,
  unread: (patientId: string) => ["unread", patientId] as const,
};

// Auth hook
export function useAuth() {
  return useQuery({
    queryKey: queryKeys.auth,
    queryFn: async () => {
      const authBase = getAuthBase();
      const res = await fetchWithAuth(`${authBase}/api/auth/me`);
      if (!res.ok) {
        // Don't retry on 401 - it means user is not authenticated
        if (res.status === 401) {
          // Clear tokens immediately
          try {
            storageSync.removeItem("auth_token");
            storageSync.removeItem("auth_token_temp");
          } catch {}
        }
        throw new Error("Not authenticated");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 - user is not authenticated
      if (error?.message === "Not authenticated") {
        return false;
      }
      // Retry once for other errors
      return failureCount < 1;
    },
    retryOnMount: false, // Don't retry on mount if already failed
    refetchOnWindowFocus: false, // Don't refetch on window focus if failed
  });
}

// Patient data hook
export function usePatient(patientId?: string | null) {
  return useQuery({
    queryKey: queryKeys.patient(patientId || ""),
    queryFn: async () => {
      const id = patientId || (await resolvePatientId());
      if (!id) throw new Error("No patient ID");
      const res = await fetch(`${API_BASE}/patients/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch patient");
      return res.json();
    },
    enabled: !!patientId, // Only run if we have a patientId
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Patient ID hook (uses auth)
export function usePatientId() {
  const { data: authData } = useAuth();
  return authData?.role === "patient" ? authData.userId : null;
}

// Appointments hook
export function useAppointments(patientId?: string | null) {
  const patientIdFromAuth = usePatientId();
  const finalPatientId = patientId || patientIdFromAuth;

  return useQuery({
    queryKey: queryKeys.appointments(finalPatientId || ""),
    queryFn: async () => {
      if (!finalPatientId) throw new Error("No patient ID");
      const res = await fetch(`${API_BASE}/patients/${finalPatientId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const data = await res.json();
      return data.appointments || [];
    },
    enabled: !!finalPatientId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Messages hook
export function useMessages(patientId?: string | null) {
  const patientIdFromAuth = usePatientId();
  const finalPatientId = patientId || patientIdFromAuth;

  return useQuery({
    queryKey: queryKeys.messages(finalPatientId || ""),
    queryFn: async () => {
      if (!finalPatientId) throw new Error("No patient ID");
      const res = await fetch(
        `${API_BASE}/patients/${finalPatientId}/messages`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      return data.messages || [];
    },
    enabled: !!finalPatientId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes (formerly cacheTime)
    refetchOnMount: false, // Don't refetch if data exists in cache
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

// Unread messages hook - uses patient data from cache or fetches messages
export function useUnreadMessages(patientId?: string | null) {
  const patientIdFromAuth = usePatientId();
  const finalPatientId = patientId || patientIdFromAuth;

  return useQuery({
    queryKey: queryKeys.unread(finalPatientId || ""),
    queryFn: async () => {
      if (!finalPatientId) return { count: 0 };

      // Fetch messages
      const res = await fetch(
        `${API_BASE}/patients/${finalPatientId}/messages`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) return { count: 0 };
      const data = await res.json();
      const msgs = data.messages || [];

      // Try to use lastReadAt saved by Messages screen
      // Use storageSync for cross-platform compatibility
      let lastRead = 0;
      try {
        const s = storageSync.getItem("pp_lastReadAt");
        if (s) lastRead = new Date(s).getTime();
      } catch {}
      // Default to 7 days ago if no lastRead timestamp
      if (!lastRead) lastRead = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const count = msgs.filter(
        (m: any) =>
          m.sender === "doctor" && new Date(m.createdAt).getTime() > lastRead
      ).length;
      return { count };
    },
    enabled: !!finalPatientId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

// Mutation to invalidate queries
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return {
    invalidateAuth: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.auth }),
    invalidatePatient: (patientId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.patient(patientId) }),
    invalidateAppointments: (patientId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments(patientId),
      }),
    invalidateMessages: (patientId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages(patientId),
      }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./api";

// Query keys for admin
export const adminQueryKeys = {
  patients: (params?: string) => ["admin", "patients", params] as const,
  patient: (id: string) => ["admin", "patients", id] as const,
  appointments: (params?: string) => ["admin", "appointments", params] as const,
  appointment: (id: string) => ["admin", "appointments", id] as const,
  treatmentPlans: (patientId: string) =>
    ["admin", "treatment-plans", patientId] as const,
  procedures: () => ["admin", "procedures"] as const,
  dashboard: () => ["admin", "dashboard"] as const,
  chats: () => ["admin", "chats"] as const,
};

// Patients hook with pagination and search
export function usePatients(params?: string) {
  return useQuery({
    queryKey: adminQueryKeys.patients(params),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/patients${params || ""}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch patients");
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Single patient hook
export function usePatient(patientId: string) {
  return useQuery({
    queryKey: adminQueryKeys.patient(patientId),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/patients/${patientId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch patient");
      return res.json();
    },
    enabled: !!patientId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Appointments hook with filters
export function useAppointments(params?: string) {
  return useQuery({
    queryKey: adminQueryKeys.appointments(params),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/appointments${params || ""}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Treatment plans hook
export function useTreatmentPlans(patientId: string) {
  return useQuery({
    queryKey: adminQueryKeys.treatmentPlans(patientId),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/treatment-plans/${patientId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch treatment plans");
      return res.json();
    },
    enabled: !!patientId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Procedures hook
export function useProcedures() {
  return useQuery({
    queryKey: adminQueryKeys.procedures(),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/procedures`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch procedures");
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - procedures don't change often
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Dashboard stats hook
export function useDashboardStats() {
  return useQuery({
    queryKey: adminQueryKeys.dashboard(),
    queryFn: async () => {
      const [patientsRes, appointmentsRes] = await Promise.all([
        fetch(`${API_BASE}/patients`, { credentials: "include" }),
        fetch(`${API_BASE}/appointments`, { credentials: "include" }),
      ]);

      const patientsData = await patientsRes.json();
      const appointmentsData = await appointmentsRes.json().catch(() => ({
        appointments: [],
      }));

      const now = new Date();
      const upcoming = (appointmentsData.appointments || []).filter(
        (apt: any) => new Date(apt.datetime) > now
      );

      return {
        totalPatients: patientsData.patients?.length || 0,
        totalAppointments: appointmentsData.appointments?.length || 0,
        upcomingAppointments: upcoming.length,
        recentMessages: 0, // TODO: implement messages count
      };
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Chats hook
export function useChats() {
  return useQuery({
    queryKey: adminQueryKeys.chats(),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/chats`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch chats");
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds - chats are more dynamic
    gcTime: 2 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Doctor's patients hook
export function useDoctorPatients(doctorId: string) {
  return useQuery({
    queryKey: ["admin", "doctors", doctorId, "patients"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/doctors/${doctorId}/patients`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch doctor's patients");
      return res.json();
    },
    enabled: !!doctorId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Utility hook for invalidating queries
export function useInvalidateAdminQueries() {
  const queryClient = useQueryClient();
  return {
    invalidatePatients: (params?: string) =>
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.patients(params),
      }),
    invalidatePatient: (id: string) =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.patient(id) }),
    invalidateAppointments: (params?: string) =>
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.appointments(params),
      }),
    invalidateTreatmentPlans: (patientId: string) =>
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.treatmentPlans(patientId),
      }),
    invalidateDoctorPatients: (doctorId: string) =>
      queryClient.invalidateQueries({
        queryKey: ["admin", "doctors", doctorId, "patients"],
      }),
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: ["admin"] }),
  };
}


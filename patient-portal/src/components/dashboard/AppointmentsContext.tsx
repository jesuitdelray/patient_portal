import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { API_BASE, connectSocket, resolvePatientId } from "../../lib/api";
import Toast from "react-native-toast-message";

type Appointment = {
  id: string;
  title: string;
  datetime: string;
  location?: string | null;
  type: string;
  patientId: string;
};

type AppointmentsContextType = {
  appointments: Appointment[];
  setAppointments: (
    appointments: Appointment[] | ((prev: Appointment[]) => Appointment[])
  ) => void;
};

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(
  undefined
);

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const wsRef = useRef<any | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const patientId = await resolvePatientId();
      if (!patientId) return;

      // Load initial appointments
      try {
        const res = await fetch(`${API_BASE}/patients/${patientId}`, {
          credentials: "include",
        });
        const data = await res.json();
        // Filter out cancelled appointments
        const appts = ((data.appointments || []) as Appointment[]).filter(
          (apt: any) => !apt.isCancelled
        );
        if (mounted) {
          setAppointments(appts);
        }
      } catch (error) {
        console.error("Failed to load appointments:", error);
      }

      // Setup Socket.IO connection for real-time updates
      if (!wsRef.current) {
        const socket: any = connectSocket({ patientId });
        wsRef.current = socket;

        // Listen for new appointments
        socket.on("appointment:new", ({ appointment }: any) => {
          if (mounted) {
            // Don't add cancelled appointments
            if (appointment.isCancelled) return;
            setAppointments((prev) => {
              // Check if appointment already exists
              const exists = prev.some((a) => a.id === appointment.id);
              if (exists) return prev;
              // Add new appointment
              return [...prev, appointment].sort(
                (a, b) =>
                  new Date(a.datetime).getTime() -
                  new Date(b.datetime).getTime()
              );
            });
          }
        });

        // Listen for appointment updates
        socket.on("appointment:update", ({ appointment }: any) => {
          if (mounted) {
            // If appointment is cancelled, remove it from the list
            if (appointment.isCancelled) {
              setAppointments((prev) =>
                prev.filter((a) => a.id !== appointment.id)
              );
              return;
            }
            setAppointments((prev) =>
              prev.map((a) => (a.id === appointment.id ? appointment : a))
            );
            Toast.show({
              type: "success",
              text1: "Appointment rescheduled",
              text2: new Date(appointment.datetime).toLocaleString(),
            });
          }
        });

        // Listen for appointment cancellations
        socket.on("appointment:cancelled", ({ appointmentId }: any) => {
          if (mounted) {
            console.log("[AppointmentsContext] Socket appointment:cancelled:", appointmentId);
            setAppointments((prev) => {
              // Remove cancelled appointment if it exists
              const updated = prev.filter((a) => a.id !== appointmentId);
              console.log("[AppointmentsContext] Updated appointments after cancellation:", {
                before: prev.length,
                after: updated.length,
                appointmentId,
              });
              // Always return updated array (React will handle comparison)
              return updated;
            });
          }
        });
      }
    })();

    return () => {
      mounted = false;
      mountedRef.current = false;
      // Don't disconnect socket - it's shared singleton
    };
  }, []);

  return (
    <AppointmentsContext.Provider value={{ appointments, setAppointments }}>
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentsContext);
  if (context === undefined) {
    throw new Error("useAppointments must be used within AppointmentsProvider");
  }
  return context;
}

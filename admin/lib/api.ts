// Client-side only import; this module is used by client components
import { io, Socket } from "socket.io-client";
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export function connectEvents(params?: {
  patientId?: string;
  doctorId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.patientId) qs.set("patientId", params.patientId);
  if (params?.doctorId) qs.set("doctorId", params.doctorId);
  const url = `${API_BASE}/events${qs.toString() ? `?${qs.toString()}` : ""}`;
  return new EventSource(url);
}

let singletonSocket: Socket | null = null;
const joinedRooms = new Set<string>();

export function connectSocket(params?: {
  patientId?: string;
  doctorId?: string;
}) {
  if (!singletonSocket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const base =
      url ||
      (typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3001");
    singletonSocket = io(base, {
      transports: ["websocket", "polling"],
      path: "/socket.io",
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
  }
  const key = `${params?.patientId || ""}|${params?.doctorId || ""}`;
  if (key !== "|") {
    const doJoin = () => {
      if (!joinedRooms.has(key)) {
        singletonSocket!.emit("join", {
          patientId: params?.patientId,
          doctorId: params?.doctorId,
          isAdmin: !!params?.doctorId, // Mark as admin if doctorId is provided
        });
        joinedRooms.add(key);
      }
    };
    if (singletonSocket.connected) doJoin();
    else singletonSocket.once("connect", doJoin);
  } else {
    // If no patientId or doctorId, but this is admin panel, join admin room
    const doJoin = () => {
      if (!joinedRooms.has("admin")) {
        singletonSocket!.emit("join", {
          isAdmin: true,
        });
        joinedRooms.add("admin");
      }
    };
    if (singletonSocket.connected) doJoin();
    else singletonSocket.once("connect", doJoin);
  }
  return singletonSocket as any;
}

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
  Modal,
  Image,
  ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Header } from "../components/Header";
import { Loader } from "../components/Loader";
import { colors } from "../lib/colors";
import { API_BASE, connectSocket, fetchWithAuth } from "../lib/api";
import { useAuth } from "../lib/queries";
import { sendSocketEvent } from "../lib/socket-utils";
import { StructuredMessage } from "../components/chat/StructuredMessage";
import { BookAppointmentModal } from "../components/chat/BookAppointmentModal";
import { RescheduleAppointmentModal } from "../components/chat/RescheduleAppointmentModal";
import Toast from "react-native-toast-message";
import { storage } from "../lib/storage";
import { useBrandingTheme } from "../lib/useBrandingTheme";

type Message = {
  id: string;
  content: string;
  sender: "patient" | "doctor";
  createdAt: string;
  manual?: boolean;
  isManual?: boolean;
  patientId?: string;
};

const mockMessages: Message[] = [
  {
    id: "1",
    content: "lol)))000",
    sender: "doctor",
    createdAt: "10.12.2019",
    manual: true,
    isManual: true,
    patientId: "12",
  },
  {
    id: "2",
    content:
      "lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000lol)))000",
    sender: "doctor",
    createdAt: "10.12.2019",
    manual: true,
    isManual: true,
    patientId: "12",
  },
  {
    id: "3",
    content:
      "lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 lol)))000lol)))000 ",
    sender: "doctor",
    createdAt: "10.12.2019",
    manual: true,
    isManual: true,
    patientId: "12",
  },
  {
    id: "20",
    content: "lol)))000",
    sender: "patient",
    createdAt: "11.12.2019",
    manual: true,
    isManual: true,
    patientId: "12",
  },
];

type AIAction = {
  action: string;
  data: any;
  messageId: string;
};

const FRONT_DESK_STATE_KEY = "frontDeskActive";

export default function ChatScreen() {
  const { data: authData } = useAuth();
  const patientId = authData?.role === "patient" ? authData.userId : null;
  const navigation = useNavigation<any>();
  const theme = useBrandingTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // Socket connection is handled by connectSocket, no need to track state
  const [lastAction, setLastAction] = useState<AIAction | null>(null);

  // Modal states
  const [showBookModal, setShowBookModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showPriceListModal, setShowPriceListModal] = useState(false);
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [bookProcedureTitle, setBookProcedureTitle] = useState("");
  const [bookingSlot, setBookingSlot] = useState<any>(null);
  const [isSendingFrontDesk, setIsSendingFrontDesk] = useState(false);
  const [isFrontDeskActive, setIsFrontDeskActive] = useState(false);

  const defaultAvatar: ImageSourcePropType = require("./avatar.jpg");

  const messagesEndRef = useRef<ScrollView>(null);
  const initialScrollHandled = useRef(false);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const storedActive = await storage.getItem(FRONT_DESK_STATE_KEY);
        if (!mounted) return;
        if (storedActive === "true") {
          setIsFrontDeskActive(true);
        }
      } catch (error) {
        console.warn("[Chat] Failed to restore front desk state:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    storage
      .setItem(FRONT_DESK_STATE_KEY, isFrontDeskActive ? "true" : "false")
      .catch((error) =>
        console.warn("[Chat] Failed to persist front desk state:", error)
      );
  }, [isFrontDeskActive]);

  // Load existing messages
  useEffect(() => {
    if (!patientId) return;

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_BASE}/patients/${patientId}/messages`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          let messages = data.messages || [];

          const appointmentActions = [
            "view_upcoming_appointments",
            "view_next_appointment",
          ];

          let appointmentsFetched = false;
          let cachedAppointments: any[] | null = null;

          const fetchAppointmentsOnce = async () => {
            if (appointmentsFetched) {
              return cachedAppointments;
            }
            appointmentsFetched = true;
            try {
              const appointmentsRes = await fetch(
                `${API_BASE}/appointments?patientId=${patientId}`,
                { credentials: "include" }
              );
              if (appointmentsRes.ok) {
                const appointmentsData = await appointmentsRes.json();
                cachedAppointments = appointmentsData.appointments || [];
              } else {
                cachedAppointments = null;
              }
            } catch {
              cachedAppointments = null;
            }
            return cachedAppointments;
          };

          const validatedMessages = await Promise.all(
            messages.map(async (msg: Message) => {
              if (msg.sender !== "doctor") {
                return msg;
              }
              try {
                const parsed = JSON.parse(msg.content);
                if (!parsed?.action || !parsed?.data) {
                  return msg;
                }

                if (!appointmentActions.includes(parsed.action)) {
                  return msg;
                }

                const appointmentIds = Array.isArray(parsed.data)
                  ? parsed.data.map((apt: any) => apt.id).filter(Boolean)
                  : parsed.data?.id
                  ? [parsed.data.id]
                  : [];

                if (appointmentIds.length === 0) {
                  return msg;
                }

                const appointmentsData = await fetchAppointmentsOnce();
                if (!appointmentsData) {
                  return msg;
                }

                const existingAppointmentIds = new Set(
                  appointmentsData.map((apt: any) => apt.id)
                );

                const validData = Array.isArray(parsed.data)
                  ? parsed.data.filter((apt: any) =>
                      existingAppointmentIds.has(apt.id)
                    )
                  : existingAppointmentIds.has(parsed.data?.id)
                  ? parsed.data
                  : null;

                const isEmpty =
                  !validData ||
                  (Array.isArray(validData) && validData.length === 0);
                const emptyStateMessages: Record<string, string> = {
                  view_upcoming_appointments: "No appointments found",
                  view_next_appointment: "No appointments found",
                  reschedule_appointment: "No appointments found",
                };

                return {
                  ...msg,
                  content: JSON.stringify({
                    ...parsed,
                    title:
                      isEmpty && emptyStateMessages[parsed.action]
                        ? emptyStateMessages[parsed.action]
                        : parsed.title,
                    data: validData,
                  }),
                };
              } catch {
                return msg;
              }
            })
          );

          const normalized = validatedMessages.map(normalizeMessage);
          setMessages(normalized);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        Toast.show({
          type: "error",
          text1: "Failed to load messages",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [patientId]);

  // Setup socket connection - ensure it's connected immediately
  useEffect(() => {
    if (!patientId) return;

    const socket = connectSocket({ patientId });
    socketRef.current = socket;

    // Remove all existing listeners first to prevent duplicates
    socket.off("message:new");
    socket.off("message:update");
    socket.off("messages:cleared");
    socket.off("ai:action");
    socket.off("appointment:update");
    socket.off("appointment:cancelled");

    // Join patient room - ensure socket is connected first
    const joinRoom = () => {
      socket.emit("join", { patientId }, (ack: any) => {
        if (ack?.ok) {
          console.log("[Chat] Joined patient room");
        }
      });
    };

    // If already connected, join immediately; otherwise wait for connection
    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
    }

    // Listen for new messages
    const messageHandler = ({ message: incoming }: any) => {
      const normalizedMessage = normalizeMessage(incoming || {});
      console.log(
        "[Chat] Received message:new event:",
        normalizedMessage?.id,
        normalizedMessage?.content
      );
      if (normalizedMessage?.patientId === patientId) {
        setMessages((prev) => {
          // Avoid duplicates - check by ID
          const exists = prev.some((m) => m.id === normalizedMessage.id);
          if (exists) {
            console.log(
              "[Chat] Duplicate message ignored:",
              normalizedMessage.id
            );
            return prev;
          }

          // If this is a patient message, check if we have an optimistic message with same content
          // and replace it with the real one
          if (normalizedMessage.sender === "patient") {
            const optimisticIndex = prev.findIndex(
              (m) =>
                m.id.startsWith("temp-") &&
                m.content === normalizedMessage.content &&
                m.sender === "patient"
            );
            if (optimisticIndex !== -1) {
              console.log(
                "[Chat] Replacing optimistic message with real one:",
                normalizedMessage.id
              );
              const updated = [...prev];
              updated[optimisticIndex] = normalizedMessage;
              return updated;
            }
          }

          console.log("[Chat] Adding new message:", normalizedMessage.id);
          return [...prev, normalizedMessage];
        });
      }
    };

    socket.on("message:new", messageHandler);

    // Listen for message updates (e.g., when appointment is cancelled)
    const messageUpdateHandler = ({ message: updatedMessage }: any) => {
      if (updatedMessage?.patientId === patientId) {
        const normalizedMessage = normalizeMessage(updatedMessage || {});
        setMessages((prev) => {
          return prev.map((msg) =>
            msg.id === normalizedMessage.id ? normalizedMessage : msg
          );
        });
      }
    };

    socket.on("message:update", messageUpdateHandler);

    // Listen for messages cleared
    const messagesClearedHandler = ({ patientId: clearedPatientId }: any) => {
      if (clearedPatientId === patientId) {
        setMessages([]);
      }
    };

    socket.on("messages:cleared", messagesClearedHandler);

    // Listen for AI actions (for future implementation)
    const actionHandler = (actionData: AIAction) => {
      console.log("[Chat] Received AI action:", actionData);
      setLastAction(actionData);

      if (actionData?.action === "send_message_to_front_desk") {
        setIsFrontDeskActive(true);
        const initialMessage =
          typeof actionData.data?.message === "string"
            ? actionData.data.message.trim()
            : typeof actionData.data?.initialMessage === "string"
            ? actionData.data.initialMessage.trim()
            : "";
        if (initialMessage) {
          deliverFrontDeskMessage(initialMessage, { showReceipt: false });
        }
      }
      // Other actions are handled via UI components
    };

    socket.on("ai:action", actionHandler);

    // Listen for appointment updates to refresh messages containing appointments
    const appointmentUpdatedHandler = ({
      appointment: updatedAppointment,
    }: any) => {
      console.log("[Chat] Appointment updated:", updatedAppointment);
      if (updatedAppointment?.patientId === patientId) {
        // Update messages that contain this appointment
        setMessages((prev) => {
          return prev.map((msg) => {
            if (msg.sender === "doctor") {
              try {
                const parsed = JSON.parse(msg.content);
                if (parsed.action && parsed.data) {
                  // Check if this message contains the updated appointment
                  const appointmentData = Array.isArray(parsed.data)
                    ? parsed.data.find(
                        (apt: any) => apt.id === updatedAppointment.id
                      )
                    : parsed.data?.id === updatedAppointment.id
                    ? parsed.data
                    : null;

                  if (appointmentData) {
                    // Update the appointment data in the message
                    const updatedData = Array.isArray(parsed.data)
                      ? parsed.data.map((apt: any) =>
                          apt.id === updatedAppointment.id
                            ? updatedAppointment
                            : apt
                        )
                      : updatedAppointment;

                    return {
                      ...msg,
                      content: JSON.stringify({
                        ...parsed,
                        data: updatedData,
                      }),
                    };
                  }
                }
              } catch (e) {
                // Not JSON, skip
              }
            }
            return msg;
          });
        });
      }
    };

    socket.on("appointment:update", appointmentUpdatedHandler);

    const appointmentCancelledHandler = ({
      appointmentId: cancelledId,
      patientId: cancelledPatientId,
    }: any) => {
      console.log("[Chat] Appointment cancelled:", cancelledId);
      if (cancelledPatientId === patientId || !cancelledPatientId) {
        // Update messages that contain this appointment - remove it
        setMessages((prev) => {
          return prev.map((msg) => {
            if (msg.sender === "doctor") {
              try {
                const parsed = JSON.parse(msg.content);
                if (parsed.action && parsed.data) {
                  // Check if this message contains the cancelled appointment
                  const appointmentData = Array.isArray(parsed.data)
                    ? parsed.data.find((apt: any) => apt.id === cancelledId)
                    : parsed.data?.id === cancelledId
                    ? parsed.data
                    : null;

                  if (appointmentData) {
                    // Remove the cancelled appointment from the data
                    const updatedData = Array.isArray(parsed.data)
                      ? parsed.data.filter((apt: any) => apt.id !== cancelledId)
                      : null;

                    // If no appointments left, update title to empty state
                    const isEmpty =
                      !updatedData ||
                      (Array.isArray(updatedData) && updatedData.length === 0);
                    const emptyStateMessages: Record<string, string> = {
                      view_upcoming_appointments: "No appointments found",
                      view_next_appointment: "No appointments found",
                      reschedule_appointment: "No appointments found",
                    };

                    return {
                      ...msg,
                      content: JSON.stringify({
                        ...parsed,
                        title:
                          isEmpty && emptyStateMessages[parsed.action]
                            ? emptyStateMessages[parsed.action]
                            : parsed.title,
                        data: updatedData,
                      }),
                    };
                  }
                }
              } catch (e) {
                // Not JSON, skip
              }
            }
            return msg;
          });
        });
      }
    };

    // Don't handle appointment:cancelled locally - rely on message:update instead
    // socket.on("appointment:cancelled", appointmentCancelledHandler);

    return () => {
      console.log("[Chat] Cleaning up socket listeners");
      socket.off("message:new", messageHandler);
      socket.off("message:update", messageUpdateHandler);
      socket.off("messages:cleared", messagesClearedHandler);
      socket.off("ai:action", actionHandler);
      socket.off("appointment:update", appointmentUpdatedHandler);
      // socket.off("appointment:cancelled", appointmentCancelledHandler);
      // Don't disconnect socket - it's managed globally
    };
  }, [patientId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length === 0 || !messagesEndRef.current) return;
    const animated = initialScrollHandled.current;
    setTimeout(() => {
      messagesEndRef.current?.scrollToEnd({ animated });
    }, 50);
    initialScrollHandled.current = true;
  }, [messages.length]);

  const handleSendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || !patientId) return;

    if (
      isFrontDeskActive ||
      lastAction?.action === "send_message_to_front_desk"
    ) {
      if (!isFrontDeskActive) {
        setIsFrontDeskActive(true);
      }
      if (isSendingFrontDesk) return;
      setMessage("");
      await deliverFrontDeskMessage(trimmed, { showReceipt: true });
      setLastAction(null);
      return;
    }

    if (isSending) return;

    setMessage("");
    setIsSending(true);

    const messageContent = trimmed;

    // Create optimistic message - show immediately
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender: "patient",
      createdAt: new Date().toISOString(),
    };

    // Add optimistic message immediately
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      await sendSocketEvent(
        "message:send",
        {
          patientId,
          sender: "patient",
          content: messageContent,
        },
        { patientId },
        (ack: any) => {
          if (ack?.ok && ack?.message) {
            // Replace optimistic message with real one from server
            setMessages((prev) => {
              // Remove optimistic message
              const withoutOptimistic = prev.filter(
                (m) => m.id !== optimisticMessage.id
              );
              // Add real message if not already present
              const normalizedAck = normalizeMessage(ack.message);
              const exists = withoutOptimistic.some(
                (m) => m.id === normalizedAck.id
              );
              if (!exists) {
                return [...withoutOptimistic, normalizedAck];
              }
              return withoutOptimistic;
            });
          } else {
            // Remove optimistic message on error
            setMessages((prev) =>
              prev.filter((m) => m.id !== optimisticMessage.id)
            );
            Toast.show({
              type: "error",
              text1: "Failed to send message",
            });
          }
        }
      );
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      Toast.show({
        type: "error",
        text1: "Failed to send message",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const generateTempId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  const createAssistantMessage = (content: string): Message => ({
    id: generateTempId("assistant"),
    content,
    sender: "doctor",
    createdAt: new Date().toISOString(),
    manual: false,
    isManual: false,
  });

  const createPatientMessage = (content: string): Message => ({
    id: generateTempId("patient-local"),
    content,
    sender: "patient",
    createdAt: new Date().toISOString(),
    manual: false,
    isManual: false,
  });

  const normalizeMessage = (message: any): Message => ({
    ...message,
    manual: Boolean(message?.manual || message?.isManual),
    isManual: Boolean(message?.manual || message?.isManual),
  });

  const addAssistantPrompt = (text: string) => {
    const promptMessage = createAssistantMessage(text);
    setMessages((prev) => [...prev, promptMessage]);
  };

  const deliverFrontDeskMessage = async (
    rawContent: string,
    options: { showReceipt?: boolean } = {}
  ) => {
    const trimmed = rawContent?.trim();
    if (!trimmed) {
      Toast.show({
        type: "error",
        text1: "Please enter a message",
      });
      return false;
    }

    if (!patientId) {
      Toast.show({
        type: "error",
        text1: "Not authenticated",
      });
      return false;
    }

    setIsSendingFrontDesk(true);
    try {
      const shouldToast = options.showReceipt !== false;

      const res = await fetchWithAuth(
        `${API_BASE}/patients/${patientId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: "patient",
            content: trimmed,
          }),
        }
      );

      const text = await res.text();
      let savedMessage: Message | null = null;

      if (text) {
        try {
          const parsed = JSON.parse(text);
          savedMessage = parsed?.message || null;
        } catch (error) {
          console.warn("[Chat] Failed to parse message response:", error);
        }
      }

      if (!res.ok) {
        const errorMessage =
          savedMessage && (savedMessage as any)?.error
            ? (savedMessage as any).error
            : (() => {
                try {
                  const parsed = text ? JSON.parse(text) : null;
                  return parsed?.error;
                } catch {
                  return null;
                }
              })();
        throw new Error(errorMessage || "Failed to send message to front desk");
      }

      if (!savedMessage) {
        savedMessage = createPatientMessage(trimmed);
      } else {
        savedMessage = normalizeMessage(savedMessage);
      }

      setMessages((prev) => {
        if (savedMessage && !prev.some((msg) => msg.id === savedMessage!.id)) {
          return [...prev, savedMessage];
        }
        return prev;
      });

      if (shouldToast) {
        Toast.show({
          type: "success",
          text1: "Message sent to front desk",
        });
      }

      return true;
    } catch (error: any) {
      console.error("[Chat] Front desk message error:", error);
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to send message",
      });
      return false;
    } finally {
      setIsSendingFrontDesk(false);
    }
  };

  const endFrontDeskChat = async () => {
    if (!isFrontDeskActive || isSendingFrontDesk) return;
    await deliverFrontDeskMessage("Thank you, we can end the chat for now.", {
      showReceipt: false,
    });
    setIsFrontDeskActive(false);
    setMessages((prev) => [
      ...prev,
      createAssistantMessage(
        "You ended the chat with the clinic. The assistant is back."
      ),
    ]);
    Toast.show({
      type: "info",
      text1: "Chat with the clinic ended",
    });
  };

  const trimmedMessageValue = message.trim();
  const isSendInProgress = isFrontDeskActive ? isSendingFrontDesk : isSending;
  const sendDisabled = !trimmedMessageValue || isSendInProgress;
  const sendButtonLabel = isSendInProgress ? "..." : "Send";
  const inputPlaceholder = isFrontDeskActive
    ? "Type a message to the clinic..."
    : "Type a message...";

  const handleAction = async (action: string, data: any) => {
    console.log("[Chat] Action triggered:", action, data);

    switch (action) {
      case "book_appointment": {
        if (data?.start) {
          setBookingSlot(data);
        } else {
          setBookingSlot(null);
        }
        setBookProcedureTitle(data?.title || data?.procedureName || "");
        setShowBookModal(true);
        break;
      }

      case "reschedule_appointment":
        setSelectedAppointment(data);
        setShowRescheduleModal(true);
        break;

      case "send_message_to_front_desk": {
        if (!isFrontDeskActive) {
          setIsFrontDeskActive(true);
        }
        const initialMessage =
          typeof data?.message === "string" && data.message.trim().length > 0
            ? data.message.trim()
            : typeof data?.initialMessage === "string" &&
              data.initialMessage.trim().length > 0
            ? data.initialMessage.trim()
            : "";
        if (initialMessage) {
          await deliverFrontDeskMessage(initialMessage, { showReceipt: false });
        }
        break;
      }

      case "cancel_appointment":
        if (!data?.id) {
          Toast.show({
            type: "error",
            text1: "Invalid appointment",
          });
          return;
        }

        const confirmCancel = () => {
          const cancelAppointment = async () => {
            try {
              const res = await fetch(`${API_BASE}/appointments/${data.id}`, {
                method: "DELETE",
                credentials: "include",
              });

              if (res.ok) {
                // Don't update messages locally - wait for message:update socket event
                Toast.show({
                  type: "success",
                  text1: "Appointment cancelled successfully",
                });
              } else if (res.status === 404) {
                // 404 means appointment already cancelled
                Toast.show({
                  type: "success",
                  text1: "Appointment already cancelled",
                });
              } else {
                throw new Error("Failed to cancel appointment");
              }
            } catch (error: any) {
              console.error("[Chat] Cancel appointment error:", error);
              Toast.show({
                type: "error",
                text1: error.message || "Failed to cancel appointment",
              });
            }
          };

          cancelAppointment();
        };

        if (Platform.OS === "web") {
          if (confirm("Are you sure you want to cancel this appointment?")) {
            confirmCancel();
          }
        } else {
          Alert.alert(
            "Cancel Appointment",
            "Are you sure you want to cancel this appointment?",
            [
              {
                text: "No",
                style: "cancel",
              },
              {
                text: "Yes",
                style: "destructive",
                onPress: confirmCancel,
              },
            ]
          );
        }
        break;

      case "download_invoice":
        if (!data?.id) {
          Toast.show({
            type: "error",
            text1: "Invalid invoice",
          });
          return;
        }

        const downloadInvoice = async () => {
          try {
            const res = await fetch(`${API_BASE}/invoices/${data.id}/pdf`, {
              credentials: "include",
            });

            if (res.ok) {
              if (Platform.OS === "web") {
                // Web: download via blob URL
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `invoice-${data.id}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } else {
                // Native: open in browser or use file system
                const pdfUrl = `${API_BASE}/invoices/${data.id}/pdf`;
                const canOpen = await Linking.canOpenURL(pdfUrl);
                if (canOpen) {
                  await Linking.openURL(pdfUrl);
                } else {
                  throw new Error("Cannot open PDF");
                }
              }

              Toast.show({
                type: "success",
                text1: "Invoice opened",
              });
            } else {
              throw new Error("Failed to download invoice");
            }
          } catch (error: any) {
            console.error("[Chat] Download invoice error:", error);
            Toast.show({
              type: "error",
              text1: error.message || "Failed to download invoice",
            });
          }
        };

        downloadInvoice();
        break;

      case "view_price_list":
        setShowPriceListModal(true);
        break;

      case "view_promotions":
        setShowPromotionsModal(true);
        break;

      default:
        console.log("[Chat] Unhandled action:", action);
    }
  };

  const handleBookSuccess = (
    bookedAppointment?: any,
    bookingMessage?: Message
  ) => {
    if (bookingMessage) {
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === bookingMessage.id);
        if (exists) {
          return prev;
        }
        return [...prev, bookingMessage];
      });
    } else if (bookedAppointment) {
      const appointmentMessage: Message = {
        id: `temp-doctor-${Date.now()}`,
        content: JSON.stringify({
          action: "view_upcoming_appointments",
          title: "Appointment booked",
          data: [bookedAppointment],
        }),
        sender: "doctor",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, appointmentMessage]);
    }

    Toast.show({
      type: "success",
      text1: "Appointment booked!",
    });
  };

  const handleRescheduleSuccess = (updatedAppointment?: any) => {
    // Update messages immediately if we have the updated appointment
    if (updatedAppointment) {
      setMessages((prev) => {
        return prev.map((msg) => {
          if (msg.sender === "doctor") {
            try {
              const parsed = JSON.parse(msg.content);
              if (parsed.action && parsed.data) {
                const appointmentData = Array.isArray(parsed.data)
                  ? parsed.data.find(
                      (apt: any) => apt.id === updatedAppointment.id
                    )
                  : parsed.data?.id === updatedAppointment.id
                  ? parsed.data
                  : null;

                if (appointmentData) {
                  const updatedData = Array.isArray(parsed.data)
                    ? parsed.data.map((apt: any) =>
                        apt.id === updatedAppointment.id
                          ? updatedAppointment
                          : apt
                      )
                    : updatedAppointment;

                  return {
                    ...msg,
                    content: JSON.stringify({
                      ...parsed,
                      data: updatedData,
                    }),
                  };
                }
              }
            } catch (e) {
              // Not JSON, skip
            }
          }
          return msg;
        });
      });
    }

    Toast.show({
      type: "success",
      text1: "Appointment rescheduled!",
    });
  };

  if (!patientId) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Chat" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Not authenticated</Text>
        </View>
      </SafeAreaView>
    );
  }

  // const avatar: ImageSourcePropType = require("@/assets/avatar.jpg");

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Chat" />
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      >
        <View style={styles.chatContent}>
          {/* Messages List */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <Loader />
            </View>
          ) : (
            <ScrollView
              ref={messagesEndRef}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubtext}>
                    Start a conversation by sending a message
                  </Text>
                </View>
              ) : (
                messages.map((msg, index) => {
                  const isPatient = msg.sender === "patient";
                  const uniqueKey = msg.id || `msg-${index}-${msg.createdAt}`;
                  const isManual =
                    !isPatient && Boolean(msg.manual ?? msg.isManual);
                  // Определяем, является ли сообщение JSON (структурированным)
                  // JSON = сообщение от доктора, которое не manual (используется StructuredMessage)
                  const isJsonMessage = !isPatient && !isManual;
                  const bubbleBackground = isPatient
                    ? null
                    : isManual
                    ? {
                        backgroundColor: "rgba(15, 111, 255, 0.14)",
                        borderColor: colors.medicalBlue,
                        borderWidth: 1,
                      }
                    : {
                        backgroundColor: theme.surface,
                        borderColor: theme.borderSubtle,
                        borderWidth: 1,
                      };
                  return (
                    <View
                      key={uniqueKey}
                      style={[
                        styles.messageContainer,
                        isPatient
                          ? styles.messagePatient
                          : styles.messageDoctor,
                      ]}
                    >
                      {!isPatient && isManual && (
                        <Image
                          source={defaultAvatar}
                          style={{
                            width: 52,
                            height: 52,
                            alignSelf: "flex-end",
                            marginRight: 8,
                            borderRadius: 50,
                          }}
                        />
                      )}

                      <View
                        style={[
                          styles.messageBubble,
                          isPatient
                            ? styles.bubblePatient
                            : styles.bubbleDoctor,
                          isManual ? styles.bubbleDoctorManual : null,
                          bubbleBackground,
                          { alignSelf: isPatient ? "flex-end" : "flex-start" },
                          // Для JSON сообщений - flex: 1, для строк - без flex
                          Platform.OS !== "web" && isJsonMessage
                            ? { flex: 1 }
                            : {},
                        ]}
                      >
                        {isPatient ? (
                          <>
                            <Text
                              style={[
                                styles.messageText,
                                styles.messageTextPatient,
                              ]}
                            >
                              {msg.content}
                            </Text>
                            <Text
                              style={[
                                styles.messageTime,
                                styles.messageTimePatient,
                              ]}
                            >
                              {formatTime(msg.createdAt)}
                            </Text>
                          </>
                        ) : (
                          <>
                            {isManual ? (
                              <Text
                                style={[
                                  styles.messageText,
                                  styles.messageTextDoctorManual,
                                ]}
                              >
                                {msg.content}
                              </Text>
                            ) : (
                              <StructuredMessage
                                content={msg.content}
                                onAction={handleAction}
                              />
                            )}
                            <Text
                              style={[
                                styles.messageTime,
                                isManual
                                  ? [styles.messageTimeDoctorManual]
                                  : styles.messageTimeDoctor,
                              ]}
                            >
                              {formatTime(msg.createdAt)}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {isFrontDeskActive ? (
            <View
              style={[
                styles.frontDeskStatusBar,
                {
                  borderColor: theme.borderSubtle,
                  backgroundColor: theme.surface,
                },
              ]}
            >
              <View style={styles.frontDeskStatusInfo}>
                <View
                  style={[
                    styles.frontDeskStatusDot,
                    { backgroundColor: theme.success },
                  ]}
                />
                <Text
                  style={[
                    styles.frontDeskStatusText,
                    { color: theme.textPrimary },
                  ]}
                >
                  Connected to the clinic front desk
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.frontDeskStatusButton,
                  {
                    borderColor: theme.danger,
                    backgroundColor: theme.danger,
                  },
                  isSendingFrontDesk && styles.frontDeskButtonDisabled,
                ]}
                onPress={endFrontDeskChat}
                disabled={isSendingFrontDesk}
              >
                <Text
                  style={[
                    styles.frontDeskStatusButtonText,
                    { color: colors.primaryWhite },
                  ]}
                >
                  End chat with clinic
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={inputPlaceholder}
              placeholderTextColor={colors.greyscale400}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
              editable={!isSendInProgress}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                sendDisabled && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={sendDisabled}
            >
              <Text style={styles.sendButtonText}>{sendButtonLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <BookAppointmentModal
        visible={showBookModal}
        onClose={() => {
          setShowBookModal(false);
          setBookProcedureTitle("");
          setBookingSlot(null);
        }}
        onSuccess={handleBookSuccess}
        procedureTitle={bookProcedureTitle}
        initialSlot={bookingSlot}
      />

      <RescheduleAppointmentModal
        visible={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setSelectedAppointment(null);
        }}
        onSuccess={handleRescheduleSuccess}
        appointment={selectedAppointment}
      />

      {/* Price List Redirect Modal */}
      <Modal
        visible={showPriceListModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPriceListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalTitle}>
              You will be redirected to price list page
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[
                  styles.confirmModalButton,
                  styles.confirmModalButtonCancel,
                ]}
                onPress={() => setShowPriceListModal(false)}
              >
                <Text style={styles.confirmModalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmModalButton,
                  styles.confirmModalButtonProceed,
                ]}
                onPress={() => {
                  setShowPriceListModal(false);
                  navigation.navigate("PriceList");
                }}
              >
                <Text style={styles.confirmModalButtonTextProceed}>
                  Proceed
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Promotions Redirect Modal */}
      <Modal
        visible={showPromotionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPromotionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalTitle}>
              You will be redirected to promotions page
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[
                  styles.confirmModalButton,
                  styles.confirmModalButtonCancel,
                ]}
                onPress={() => setShowPromotionsModal(false)}
              >
                <Text style={styles.confirmModalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmModalButton,
                  styles.confirmModalButtonProceed,
                ]}
                onPress={() => {
                  setShowPromotionsModal(false);
                  navigation.navigate("Promotions");
                }}
              >
                <Text style={styles.confirmModalButtonTextProceed}>
                  Proceed
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatContent: {
    flex: 1,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: colors.medicalGreen,
  },
  statusDisconnected: {
    backgroundColor: colors.greyscale400,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: "row",
    ...(Platform.OS === "web" ? {} : { flex: 1 }),
  },
  messagePatient: {
    justifyContent: "flex-end",
  },
  messageDoctor: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    flexShrink: 1,
    ...(Platform.OS === "web"
      ? { maxWidth: 520, flexGrow: 0 }
      : { maxWidth: "90%" }),
  },
  bubblePatient: {
    backgroundColor: colors.medicalBlue,
    borderBottomRightRadius: 4,
  },
  bubbleDoctor: {
    backgroundColor: colors.primaryWhite,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleDoctorManual: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTextPatient: {
    color: colors.primaryWhite,
  },
  messageTextDoctor: {
    color: colors.textPrimary,
  },
  messageTextDoctorManual: {
    color: colors.medicalBlue,
    fontWeight: "600",
  },
  messageTime: {
    fontSize: 11,
    alignSelf: "flex-end",
  },
  messageTimePatient: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  messageTimeDoctor: {
    color: colors.textTertiary,
  },
  messageTimeDoctorManual: {
    color: colors.medicalBlue,
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primaryWhite,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.textPrimary,
    ...(Platform.OS === "web" && {
      outlineStyle: "solid" as const,
      outlineWidth: 0,
    }),
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.medicalBlue,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: colors.greyscale300,
    opacity: 0.4,
  },
  sendButtonText: {
    color: colors.primaryWhite,
    fontSize: 15,
    fontWeight: "600",
  },
  frontDeskStatusBar: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  frontDeskStatusInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  frontDeskStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  frontDeskStatusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  frontDeskStatusButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  frontDeskStatusButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmModal: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 24,
    textAlign: "center",
  },
  confirmModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmModalButtonCancel: {
    backgroundColor: colors.greyscale200,
    borderWidth: 1,
    borderColor: colors.greyscale300,
  },
  confirmModalButtonProceed: {
    backgroundColor: colors.medicalBlue,
  },
  confirmModalButtonTextCancel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  confirmModalButtonTextProceed: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primaryWhite,
  },
  frontDeskButtonDisabled: {
    opacity: 0.5,
  },
});

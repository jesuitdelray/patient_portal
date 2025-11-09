import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Header } from "../components/Header";
import { Loader } from "../components/Loader";
import { colors } from "../lib/colors";
import { API_BASE, connectSocket } from "../lib/api";
import { useAuth } from "../lib/queries";
import { sendSocketEvent } from "../lib/socket-utils";
import { StructuredMessage } from "../components/chat/StructuredMessage";
import { BookAppointmentModal } from "../components/chat/BookAppointmentModal";
import { RescheduleAppointmentModal } from "../components/chat/RescheduleAppointmentModal";
import Toast from "react-native-toast-message";

type Message = {
  id: string;
  content: string;
  sender: "patient" | "doctor";
  createdAt: string;
};

type AIAction = {
  action: string;
  data: any;
  messageId: string;
};

export default function ChatScreen() {
  const { data: authData } = useAuth();
  const patientId = authData?.role === "patient" ? authData.userId : null;
  const navigation = useNavigation<any>();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
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
  
  const messagesEndRef = useRef<ScrollView>(null);
  const initialScrollHandled = useRef(false);
  const socketRef = useRef<any>(null);

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

          setMessages(validatedMessages);
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
    const messageHandler = ({ message: newMessage }: any) => {
      console.log("[Chat] Received message:new event:", newMessage?.id, newMessage?.content);
      if (newMessage?.patientId === patientId) {
        setMessages((prev) => {
          // Avoid duplicates - check by ID
          const exists = prev.some((m) => m.id === newMessage.id);
          if (exists) {
            console.log("[Chat] Duplicate message ignored:", newMessage.id);
            return prev;
          }
          
          // If this is a patient message, check if we have an optimistic message with same content
          // and replace it with the real one
          if (newMessage.sender === "patient") {
            const optimisticIndex = prev.findIndex(
              (m) => m.id.startsWith("temp-") && m.content === newMessage.content && m.sender === "patient"
            );
            if (optimisticIndex !== -1) {
              console.log("[Chat] Replacing optimistic message with real one:", newMessage.id);
              const updated = [...prev];
              updated[optimisticIndex] = newMessage;
              return updated;
            }
          }
          
          console.log("[Chat] Adding new message:", newMessage.id);
          return [...prev, newMessage];
        });
      }
    };

    socket.on("message:new", messageHandler);

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
      // Action is already displayed as a message from doctor
      // This is kept for future action handling implementation
    };

    socket.on("ai:action", actionHandler);

    // Listen for appointment updates to refresh messages containing appointments
    const appointmentUpdatedHandler = ({ appointment: updatedAppointment }: any) => {
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
                    ? parsed.data.find((apt: any) => apt.id === updatedAppointment.id)
                    : parsed.data?.id === updatedAppointment.id ? parsed.data : null;
                  
                  if (appointmentData) {
                    // Update the appointment data in the message
                    const updatedData = Array.isArray(parsed.data)
                      ? parsed.data.map((apt: any) => 
                          apt.id === updatedAppointment.id ? updatedAppointment : apt
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

    const appointmentCancelledHandler = ({ appointmentId: cancelledId, patientId: cancelledPatientId }: any) => {
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
                    : parsed.data?.id === cancelledId ? parsed.data : null;
                  
                  if (appointmentData) {
                    // Remove the cancelled appointment from the data
                    const updatedData = Array.isArray(parsed.data)
                      ? parsed.data.filter((apt: any) => apt.id !== cancelledId)
                      : null;
                    
                    // If no appointments left, update title to empty state
                    const isEmpty = !updatedData || (Array.isArray(updatedData) && updatedData.length === 0);
                    const emptyStateMessages: Record<string, string> = {
                      view_upcoming_appointments: "Sorry, but you don't have any upcoming appointments yet.",
                      view_next_appointment: "Sorry, but you don't have any upcoming appointments yet.",
                    };
                    
                    return {
                      ...msg,
                      content: JSON.stringify({
                        ...parsed,
                        title: isEmpty && emptyStateMessages[parsed.action] 
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

    socket.on("appointment:cancelled", appointmentCancelledHandler);

    return () => {
      console.log("[Chat] Cleaning up socket listeners");
      socket.off("message:new", messageHandler);
      socket.off("messages:cleared", messagesClearedHandler);
      socket.off("ai:action", actionHandler);
      socket.off("appointment:update", appointmentUpdatedHandler);
      socket.off("appointment:cancelled", appointmentCancelledHandler);
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
    if (!message.trim() || !patientId || isSending) return;

    const messageContent = message.trim();
    setMessage("");
    setIsSending(true);

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
              const withoutOptimistic = prev.filter((m) => m.id !== optimisticMessage.id);
              // Add real message if not already present
              const exists = withoutOptimistic.some((m) => m.id === ack.message.id);
              if (!exists) {
                return [...withoutOptimistic, ack.message];
              }
              return withoutOptimistic;
            });
          } else {
            // Remove optimistic message on error
            setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
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
              // Update messages immediately to remove cancelled appointment
              setMessages((prev) => {
                return prev.map((msg) => {
                  if (msg.sender === "doctor") {
                    try {
                      const parsed = JSON.parse(msg.content);
                      if (parsed.action && parsed.data) {
                        const appointmentData = Array.isArray(parsed.data) 
                          ? parsed.data.find((apt: any) => apt.id === data.id)
                          : parsed.data?.id === data.id ? parsed.data : null;
                        
                        if (appointmentData) {
                          const updatedData = Array.isArray(parsed.data)
                            ? parsed.data.filter((apt: any) => apt.id !== data.id)
                            : null;
                          
                          const isEmpty = !updatedData || (Array.isArray(updatedData) && updatedData.length === 0);
                          const emptyStateMessages: Record<string, string> = {
                            view_upcoming_appointments: "Sorry, but you don't have any upcoming appointments yet.",
                            view_next_appointment: "Sorry, but you don't have any upcoming appointments yet.",
                          };
                          
                          return {
                            ...msg,
                            content: JSON.stringify({
                              ...parsed,
                              title: isEmpty && emptyStateMessages[parsed.action] 
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
              
              Toast.show({
                type: "success",
                text1: "Appointment cancelled successfully",
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

  const handleBookSuccess = (bookedAppointment?: any) => {
    // Add a message to chat with the booked appointment
    if (bookedAppointment) {
      const appointmentMessage: Message = {
        id: `appointment-booked-${Date.now()}`,
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
                  ? parsed.data.find((apt: any) => apt.id === updatedAppointment.id)
                  : parsed.data?.id === updatedAppointment.id ? parsed.data : null;
                
                if (appointmentData) {
                  const updatedData = Array.isArray(parsed.data)
                    ? parsed.data.map((apt: any) => 
                        apt.id === updatedAppointment.id ? updatedAppointment : apt
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

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Chat" />
      <View style={styles.chatContainer}>
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
                // Use combination of id and index to ensure unique keys
                const uniqueKey = msg.id || `msg-${index}-${msg.createdAt}`;
                return (
                  <View
                    key={uniqueKey}
                    style={[
                      styles.messageContainer,
                      isPatient ? styles.messagePatient : styles.messageDoctor,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isPatient ? styles.bubblePatient : styles.bubbleDoctor,
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
                          <StructuredMessage
                            content={msg.content}
                            onAction={handleAction}
                          />
                          <Text
                            style={[
                              styles.messageTime,
                              styles.messageTimeDoctor,
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

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.greyscale400}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!message.trim() || isSending}
          >
            <Text style={styles.sendButtonText}>
              {isSending ? "..." : "Send"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
                style={[styles.confirmModalButton, styles.confirmModalButtonCancel]}
                onPress={() => setShowPriceListModal(false)}
              >
                <Text style={styles.confirmModalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalButtonProceed]}
                onPress={() => {
                  setShowPriceListModal(false);
                  navigation.navigate("PriceList");
                }}
              >
                <Text style={styles.confirmModalButtonTextProceed}>Proceed</Text>
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
                style={[styles.confirmModalButton, styles.confirmModalButtonCancel]}
                onPress={() => setShowPromotionsModal(false)}
              >
                <Text style={styles.confirmModalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalButtonProceed]}
                onPress={() => {
                  setShowPromotionsModal(false);
                  navigation.navigate("Promotions");
                }}
              >
                <Text style={styles.confirmModalButtonTextProceed}>Proceed</Text>
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
  },
  messagePatient: {
    justifyContent: "flex-end",
  },
  messageDoctor: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  bubblePatient: {
    backgroundColor: colors.medicalBlue,
    borderBottomRightRadius: 4,
  },
  bubbleDoctor: {
    backgroundColor: colors.greyscale200,
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
      outlineStyle: "none",
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
});


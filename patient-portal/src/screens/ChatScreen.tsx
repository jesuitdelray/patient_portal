import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { Loader } from "../components/Loader";
import { colors } from "../lib/colors";
import { API_BASE, connectSocket } from "../lib/api";
import { useAuth } from "../lib/queries";
import { sendSocketEvent } from "../lib/socket-utils";
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
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastAction, setLastAction] = useState<AIAction | null>(null);
  
  const messagesEndRef = useRef<ScrollView>(null);
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
          setMessages(data.messages || []);
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

  // Setup socket connection
  useEffect(() => {
    if (!patientId) return;

    const socket = connectSocket({ patientId });
    socketRef.current = socket;

    // Remove all existing listeners first to prevent duplicates
    socket.off("message:new");
    socket.off("messages:cleared");
    socket.off("ai:action");
    socket.off("connect");
    socket.off("disconnect");

    // Join patient room
    socket.emit("join", { patientId }, (ack: any) => {
      if (ack?.ok) {
        setSocketConnected(true);
        console.log("[Chat] Joined patient room");
      }
    });

    // Listen for connection status
    const connectHandler = () => {
      setSocketConnected(true);
      console.log("[Chat] Socket connected");
    };
    socket.on("connect", connectHandler);

    const disconnectHandler = () => {
      setSocketConnected(false);
      console.log("[Chat] Socket disconnected");
    };
    socket.on("disconnect", disconnectHandler);

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

    return () => {
      console.log("[Chat] Cleaning up socket listeners");
      socket.off("message:new", messageHandler);
      socket.off("messages:cleared", messagesClearedHandler);
      socket.off("ai:action", actionHandler);
      socket.off("connect", connectHandler);
      socket.off("disconnect", disconnectHandler);
      // Don't disconnect socket - it's managed globally
    };
  }, [patientId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!message.trim() || !patientId || isSending) return;

    const messageContent = message.trim();
    setMessage("");
    setIsSending(true);

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
            // Message should already be added via websocket, but ensure it's there
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === ack.message.id);
              if (!exists) {
                return [...prev, ack.message];
              }
              return prev;
            });
          } else {
            Toast.show({
              type: "error",
              text1: "Failed to send message",
            });
          }
        }
      );
    } catch (error) {
      console.error("Error sending message:", error);
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
        {/* Connection Status */}
        <View style={styles.statusBar}>
          <View
            style={[
              styles.statusIndicator,
              socketConnected ? styles.statusConnected : styles.statusDisconnected,
            ]}
          />
          <Text style={styles.statusText}>
            {socketConnected ? "Connected" : "Connecting..."}
          </Text>
        </View>

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
                      <Text
                        style={[
                          styles.messageText,
                          isPatient ? styles.messageTextPatient : styles.messageTextDoctor,
                        ]}
                      >
                        {msg.content}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          isPatient ? styles.messageTimePatient : styles.messageTimeDoctor,
                        ]}
                      >
                        {formatTime(msg.createdAt)}
                      </Text>
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
            editable={!isSending && socketConnected}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || isSending || !socketConnected) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!message.trim() || isSending || !socketConnected}
          >
            <Text style={styles.sendButtonText}>
              {isSending ? "..." : "Send"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.primaryWhite,
    fontSize: 15,
    fontWeight: "600",
  },
});


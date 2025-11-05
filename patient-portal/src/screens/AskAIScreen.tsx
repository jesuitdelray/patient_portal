import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { colors } from "../lib/colors";
import { API_BASE } from "../lib/api";
import { storage } from "../lib/storage";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "Hello! I'm your dental assistant. You can ask me questions about your procedures, appointments, or preparation for upcoming visits. How can I help you today?",
  timestamp: new Date(),
};

const STORAGE_KEY = "ai_chat_history";

export default function AskAIScreen() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load chat history from storage on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const saved = await storage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Convert timestamp strings back to Date objects
          const loadedMessages: Message[] = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          // If no welcome message, add it
          if (loadedMessages.length === 0 || loadedMessages[0].content !== WELCOME_MESSAGE.content) {
            setMessages([WELCOME_MESSAGE, ...loadedMessages]);
          } else {
            setMessages(loadedMessages);
          }
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };
    loadHistory();
  }, []);

  // Save chat history to storage whenever messages change
  useEffect(() => {
    const saveHistory = async () => {
      try {
        // Exclude welcome message from saved history
        const messagesToSave = messages.filter(
          (msg) => msg.content !== WELCOME_MESSAGE.content
        );
        if (messagesToSave.length > 0) {
          await storage.setItem(STORAGE_KEY, JSON.stringify(messagesToSave));
        } else {
          await storage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error("Error saving chat history:", error);
      }
    };
    saveHistory();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    // Optimistically add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputText.trim();
    setInputText("");
    setIsLoading(true);

    try {
      // Prepare conversation history (exclude welcome message)
      const history = messages
        .filter((msg) => msg.role !== "assistant" || msg.content !== WELCOME_MESSAGE.content)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: messageToSend,
          role: "patient",
          history: history,
        }),
      });

      if (!res.ok) throw new Error("Failed to get AI response");

      const data = await res.json();
      const aiMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI chat error:", error);
      // Remove the user message on error
      setMessages((prev) => prev.slice(0, -1));
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I'm having trouble responding right now. Please try again later or contact your dentist directly.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Ask AI" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🤖</Text>
              <Text style={styles.emptyTitle}>Ask AI Assistant</Text>
              <Text style={styles.emptyText}>
                I'm here to help you with general dental questions, explain
                procedures, and provide information about your treatment.
              </Text>
              <Text style={styles.emptySubtext}>
                Remember: I'm an assistant, not a replacement for your dentist.
                For specific medical advice, always consult with your dentist.
              </Text>
            </View>
          ) : (
            messages.map((msg, idx) => (
              <View
                key={idx}
                style={[
                  styles.messageBubble,
                  msg.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.role === "user"
                      ? styles.userMessageText
                      : styles.assistantMessageText,
                  ]}
                >
                  {msg.content}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    msg.role === "user"
                      ? styles.userMessageTime
                      : styles.assistantMessageTime,
                  ]}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            ))
          )}
          {isLoading && (
            <View style={[styles.messageBubble, styles.assistantMessage]}>
              <Text style={styles.loadingText}>AI is thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about dental care..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryWhite,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 24,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#046D8B",
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: colors.greyscale100,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: colors.primaryWhite,
  },
  assistantMessageText: {
    color: colors.textPrimary,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  assistantMessageTime: {
    color: colors.textTertiary,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.greyscale200,
    backgroundColor: colors.primaryWhite,
    gap: 12,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: colors.greyscale100,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.greyscale200,
  },
  sendButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: "#046D8B",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.primaryWhite,
    fontSize: 15,
    fontWeight: "600",
  },
});


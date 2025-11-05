"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader } from "@/app/components/Loader";

const STORAGE_KEY = "admin_ai_chat_history";

export default function AISettingsPage() {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setChatHistory(parsed);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    try {
      if (chatHistory.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  }, [chatHistory]);

  // Fetch AI settings
  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/ai/settings`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch AI settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (settingsData?.settings?.prompt) {
      setPrompt(settingsData.settings.prompt);
    }
  }, [settingsData]);

  // Update prompt mutation
  const updatePromptMutation = useMutation({
    mutationFn: async (newPrompt: string) => {
      const res = await fetch(`${API_BASE}/ai/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: newPrompt }),
      });
      if (!res.ok) throw new Error("Failed to update prompt");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      alert("Prompt updated successfully!");
    },
  });

  // Send chat message
  const sendChatMutation = useMutation({
    mutationFn: async (message: string) => {
      // Prepare conversation history (exclude welcome message if it exists)
      const welcomeText =
        "Hello! I'm a dental assistant. You can ask me questions about dental procedures, oral hygiene, treatment plans, or appointments. Waiting for your questions.";
      const history = chatHistory
        .filter(
          (msg) =>
            msg.role !== "assistant" || !msg.content.includes(welcomeText)
        )
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message,
          role: "admin",
          history: history,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onMutate: async (message) => {
      // Optimistically add user message immediately
      setChatHistory((prev) => [
        ...prev,
        { role: "user" as const, content: message },
      ]);
      setChatMessage("");
    },
    onSuccess: (data, message) => {
      // Add AI response after it arrives
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant" as const, content: data.response },
      ]);
    },
    onError: (error, message) => {
      // Remove user message if error, or show error message
      setChatHistory((prev) => prev.slice(0, -1));
      setChatMessage(message); // Restore message in input
      alert("Failed to send message. Please try again.");
    },
  });

  const handleSavePrompt = () => {
    if (!prompt.trim()) {
      alert("Prompt cannot be empty");
      return;
    }
    updatePromptMutation.mutate(prompt);
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    sendChatMutation.mutate(chatMessage);
  };

  if (loadingSettings) {
    return (
      <div className="flex-1 p-8 flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">AI Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prompt Editor */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold mb-4">
              AI Prompt Configuration
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Configure the system prompt that defines how the AI assistant
              behaves and responds to patients.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-64 p-4 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Enter AI system prompt..."
            />
            <button
              onClick={handleSavePrompt}
              disabled={updatePromptMutation.isPending}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updatePromptMutation.isPending ? "Saving..." : "Save Prompt"}
            </button>
          </div>

          {/* Chat Test Interface */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Test AI Chat</h2>
            <p className="text-sm text-slate-600 mb-4">
              Test how the AI responds with the current prompt configuration.
            </p>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-[300px] max-h-[400px]">
              {chatHistory.length === 0 ? (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-lg p-3 max-w-[80%]">
                    <div className="text-xs font-medium mb-1 opacity-70">
                      AI Assistant
                    </div>
                    <div className="text-sm text-slate-900">
                      Hello! I'm a dental assistant. You can ask me questions
                      about dental procedures, oral hygiene, treatment plans, or
                      appointments. Waiting for your questions.
                    </div>
                  </div>
                </div>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {msg.role === "user" ? "You" : "AI Assistant"}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {sendChatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-lg p-3">
                    <div className="text-sm text-slate-500">
                      AI is thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message to test..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={sendChatMutation.isPending || !chatMessage.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

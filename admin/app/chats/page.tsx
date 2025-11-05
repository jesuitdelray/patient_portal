"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useChats } from "@/lib/admin-queries";
import { Loader } from "@/app/components/Loader";

type Chat = {
  patient: {
    id: string;
    name: string;
    email: string;
    picture?: string | null;
  };
  latestMessage: {
    content: string;
    sender: "doctor" | "patient";
    createdAt: string;
  } | null;
  unreadCount: number;
};

function ChatsContent() {
  const searchParams = useSearchParams();
  const { data, isLoading: loading } = useChats();
  const chats = data?.chats || [];
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter(
      (chat: Chat) =>
        chat.patient.name.toLowerCase().includes(q) ||
        chat.patient.email.toLowerCase().includes(q) ||
        chat.latestMessage?.content.toLowerCase().includes(q)
    );
  }, [chats, searchQuery]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Chats</h1>
        <p className="text-slate-600 mt-1">
          {chats.length} {chats.length === 1 ? "conversation" : "conversations"}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <input
          type="text"
          placeholder="Search chats by name, email, or message..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {filteredChats.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <div className="text-slate-400 text-5xl mb-4">💬</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {searchQuery ? "No chats found" : "No chats yet"}
          </h3>
          <p className="text-slate-600">
            {searchQuery
              ? "Try adjusting your search query"
              : "Start a conversation with a patient to see it here"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 divide-y divide-slate-200">
          {filteredChats.map((chat: Chat) => (
            <Link
              key={chat.patient.id}
              href={`/patients/${chat.patient.id}`}
              className="block p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  {chat.patient.picture ? (
                    <img
                      src={chat.patient.picture}
                      alt={chat.patient.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <span className="text-blue-600 font-semibold">
                      {chat.patient.name[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {chat.patient.name}
                    </h3>
                    {chat.latestMessage && (
                      <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                        {formatTime(chat.latestMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {chat.latestMessage ? (
                      <p className="text-sm text-slate-600 truncate flex-1">
                        <span className="text-slate-400">
                          {chat.latestMessage.sender === "doctor"
                            ? "You: "
                            : `${chat.patient.name}: `}
                        </span>
                        {chat.latestMessage.content}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">
                        No messages yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader />
        </div>
      }
    >
      <ChatsContent />
    </Suspense>
  );
}

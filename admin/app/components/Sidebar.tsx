"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/queries";
import { Loader } from "./Loader";

interface User {
  userId: string;
  email: string;
  role: "doctor" | "patient";
  googleId?: string;
}

export function Sidebar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Use TanStack Query for auth
  const { data: userData, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
    setLoading(authLoading);
  }, [userData, authLoading]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include", // Ensure cookies are sent
    });
    router.push("/auth/login");
  };

  // Don't show sidebar on auth pages
  if (pathname?.startsWith("/auth")) {
    return null;
  }

  if (loading) {
    return (
      <aside className="hidden md:block w-64 border-r bg-white/80 backdrop-blur p-5 flex items-center justify-center">
        <Loader />
      </aside>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <aside className="hidden md:block w-64 border-r bg-white/80 backdrop-blur p-5 flex flex-col h-screen">
      <div className="flex-1">
        <div className="mb-6 flex items-center gap-3">
          <img
            src="/teeth-logo.webp"
            alt="Logo"
            className="w-10 h-10 object-contain"
          />
          <div>
            <div className="text-xl font-semibold text-slate-900">Admin</div>
            <div className="text-xs text-slate-500">Control panel</div>
          </div>
        </div>
        <nav className="space-y-1 text-sm">
          <Link
            href="/"
            className={`block rounded-md px-3 py-2 transition-colors ${
              pathname === "/"
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/patients"
            className={`block rounded-md px-3 py-2 transition-colors ${
              pathname === "/patients"
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All patients
          </Link>
          <Link
            href="/appointments"
            className={`block rounded-md px-3 py-2 transition-colors ${
              pathname === "/appointments"
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All appointments
          </Link>
          <Link
            href="/chats"
            className={`block rounded-md px-3 py-2 transition-colors ${
              pathname === "/chats"
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            💬 Chats
          </Link>
          <Link
            href="/invoices"
            className={`block rounded-md px-3 py-2 transition-colors ${
              pathname === "/invoices"
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            📄 Invoices
          </Link>
          <Link
            href="/ai-settings"
            className={`block rounded-md px-3 py-2 transition-colors ${
              pathname === "/ai-settings"
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            🤖 AI Settings
          </Link>
        </nav>
      </div>

      {/* User section at bottom */}
      <div className="border-t border-slate-200 pt-4 mt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-sm font-semibold text-slate-700 flex-shrink-0">
            {user.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">
              {user.email.split("@")[0]}
            </div>
            <div className="text-xs text-slate-500 capitalize">{user.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left rounded-md px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

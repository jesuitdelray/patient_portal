"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import SocketClient from "./SocketClient";
import { AuthGuard } from "./components/AuthGuard";
import { LayoutWrapper } from "./components/LayoutWrapper";

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes default
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch if data exists in cache
    },
  },
});

// Component to handle auth token invalidation after login
function AuthTokenHandler({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Clean any leftover OAuth tokens from URL (if any)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("_auth_token");

    if (tokenFromUrl) {
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [queryClient]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthTokenHandler>
        <SocketClient />
        <AuthGuard>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthGuard>
      </AuthTokenHandler>
    </QueryClientProvider>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/queries";
import { Loader } from "./Loader";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: authData, isLoading, error } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Allow access to auth pages and privacy page - don't check auth
    if (pathname?.startsWith("/auth") || pathname === "/privacy") {
      setIsAuthenticated(true);
      return;
    }

    if (isLoading) {
      setIsAuthenticated(null);
      return;
    }

    if (error || !authData) {
      setIsAuthenticated(false);
      // Don't redirect if already on auth or privacy page
      if (!pathname?.startsWith("/auth") && pathname !== "/privacy") {
        router.replace(
          "/auth/login?redirect=" + encodeURIComponent(pathname || "/")
        );
      }
      return;
    }

    // Only doctors can access admin panel
    if (authData.role === "doctor") {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      // Don't redirect if already on auth or privacy page
      if (!pathname?.startsWith("/auth") && pathname !== "/privacy") {
        router.replace("/auth/login?error=patient_not_allowed");
      }
    }
  }, [authData, isLoading, error, pathname, router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (
    !isAuthenticated &&
    !pathname?.startsWith("/auth") &&
    pathname !== "/privacy"
  ) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

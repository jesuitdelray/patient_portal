import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  StyleSheet,
  View as RNView,
  Text as RNText,
  Text,
  View,
  Platform,
  Linking,
} from "react-native";
import { useEffect, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  connectSocket,
  resolvePatientId,
  setQueryClientForAuth,
  setNavigateForAuth,
} from "./src/lib/api";
import { storageSync } from "./src/lib/storage";
import { navigationRef, navigate } from "./src/lib/navigation";
import { useAuth } from "./src/lib/queries";
import {
  showNotification,
  requestNotificationPermissions,
} from "./src/components/Notification";

import DashboardScreen from "./src/screens/DashboardScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import PromotionsScreen from "./src/screens/PromotionsScreen";
import TreatmentScreen from "./src/screens/TreatmentScreen";
import InvoicesScreen from "./src/screens/InvoicesScreen";
import PriceListScreen from "./src/screens/PriceListScreen";
import AppointmentsScreen from "./src/screens/AppointmentsScreen";
import ChatScreen from "./src/screens/ChatScreen";
import LoginScreen from "./src/screens/LoginScreen";
import { BottomNavigation } from "./src/components/BottomNavigation";
import { Sidebar } from "./src/components/Sidebar";
import { Loader } from "./src/components/Loader";
import Toast from "react-native-toast-message";
// Import DebugLogs early to capture console logs
import "./src/components/DebugLogs";
import { BrandingGate } from "./src/components/BrandingGate";
import { AppointmentsProvider } from "./src/components/dashboard/AppointmentsContext";

const Stack = createNativeStackNavigator();

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000, // 1 minute default
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthChecker({
  children,
}: {
  children: (isAuthenticated: boolean) => React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const { data: authData, isLoading, error, isError } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    console.log("[AuthChecker] State update:", {
      isLoading,
      hasAuthData: !!authData,
      authRole: authData?.role,
      error: error?.message,
      isError,
      hasRedirected,
    });

    // If we have an error (401), redirect to login immediately
    if (isError && !hasRedirected) {
      console.log(
        "[AuthChecker] Error detected, setting authenticated to false"
      );
      setIsAuthenticated(false);
      setHasRedirected(true);
      // Clear tokens
      try {
        storageSync.removeItem("auth_token");
        storageSync.removeItem("auth_token_temp");
        // Force redirect to login - stop all retries
        queryClient.setQueryData(["auth", "me"], null);
        queryClient.cancelQueries({ queryKey: ["auth", "me"] });
      } catch {}
      return;
    }

    if (isLoading) {
      console.log("[AuthChecker] Loading, authenticated = null");
      setIsAuthenticated(null);
      return;
    }

    if (error || !authData) {
      console.log(
        "[AuthChecker] No auth data or error, setting authenticated to false"
      );
      setIsAuthenticated(false);
      // Clear tokens on error
      try {
        storageSync.removeItem("auth_token");
        storageSync.removeItem("auth_token_temp");
      } catch {}
      return;
    }

    // Only patients can access patient portal
    if (authData.role === "patient") {
      console.log(
        "[AuthChecker] Patient authenticated, setting authenticated to true"
      );
      setIsAuthenticated(true);
      setHasRedirected(false); // Reset redirect flag on success
    } else {
      console.log("[AuthChecker] Wrong role:", authData.role);
      setIsAuthenticated(false);
      // Clear tokens if wrong role
      try {
        storageSync.removeItem("auth_token");
        storageSync.removeItem("auth_token_temp");
      } catch {}
    }
  }, [authData, isLoading, error, isError, hasRedirected, queryClient]);

  if (isLoading || (isAuthenticated === null && !isError)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Loader />
      </View>
    );
  }

  // If error and not authenticated, show login immediately (no more retries)
  if (isError || !isAuthenticated) {
    return <>{children(false)}</>;
  }

  return <>{children(isAuthenticated ?? false)}</>;
}

function MainNavigator({ isAuthenticated }: { isAuthenticated: boolean }) {
  // Handle title updates - must be outside conditional to follow Rules of Hooks
  useEffect(() => {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      if (!isAuthenticated) {
        console.log("[MainNavigator] Login page - setting title");
        document.title = "Login - Patient Portal";
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && typeof document !== "undefined") {
      if (!document.title || document.title === "undefined") {
        document.title = "Patient Portal";
      }
    }
  }, [isAuthenticated]);

  // Handle initial route from URL - must be outside conditional
  useEffect(() => {
    // Only on web platform where window.location exists
    if (
      typeof window !== "undefined" &&
      window.location &&
      window.location.pathname &&
      isAuthenticated
    ) {
      try {
        const path = window.location.pathname;
        console.log("[MainNavigator] Initial route from URL:", path);
        const routeMap: Record<string, string> = {
          "/dashboard": "Dashboard",
          "/profile": "Profile",
          "/promotions": "Promotions",
          "/treatment": "Treatment",
          "/invoices": "Invoices",
          "/chat": "Chat",
        };
        const routeName = routeMap[path];
        console.log("[MainNavigator] Mapped route name:", routeName);
        if (routeName && navigationRef.current?.isReady()) {
          console.log("[MainNavigator] Navigating to:", routeName);
          navigationRef.current.navigate(routeName as never);
        }

        if (typeof document !== "undefined") {
          const nextTitle =
            routeName && routeName !== "undefined"
              ? routeName
              : "Patient Portal";
          document.title = nextTitle;
          console.log("[MainNavigator] Title after set:", document.title);
        }
      } catch (e) {
        console.error("[MainNavigator] Error handling initial route:", e);
      }
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // Check if desktop (web with width > 768)
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  return (
    <AppointmentsProvider>
      <View style={styles.appContainer}>
        {isDesktop && <Sidebar />}
        <View style={{ flex: 1 }}>
          <Stack.Navigator
            key={isAuthenticated ? "authenticated" : "login"}
            initialRouteName="Dashboard"
            screenOptions={{
              headerShown: false,
            }}
            screenListeners={{
              state: (e: any) => {
                // Update URL when navigation state changes - only on web
                if (
                  typeof window !== "undefined" &&
                  window.location &&
                  window.history
                ) {
                  try {
                    const state = e.data?.state;
                    console.log("[App] Navigation state changed:", state);
                    if (state) {
                      const route = state.routes[state.index];
                      const routeName =
                        typeof route?.name === "string" && route.name.length > 0
                          ? route.name
                          : null;
                      console.log("[App] Current route:", routeName);

                      const routeMap: Record<string, string> = {
                        Dashboard: "/dashboard",
                        Profile: "/profile",
                        Promotions: "/promotions",
                        Treatment: "/treatment",
                        PriceList: "/price-list",
                        Invoices: "/invoices",
                        Chat: "/chat",
                      };
                      const path = routeName ? routeMap[routeName] : undefined;

                      if (window.history && window.history.replaceState) {
                        window.history.replaceState(
                          null,
                          "",
                          path || "/dashboard"
                        );
                      }

                      if (typeof document !== "undefined") {
                        const fallbackTitle = "Patient Portal";
                        const newTitle =
                          routeName && routeName !== "undefined"
                            ? routeName
                            : fallbackTitle;
                        document.title = newTitle;
                      }
                    }
                  } catch (e) {
                    console.error("[App] Error updating URL/title:", e);
                  }
                }
              },
            }}
          >
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Promotions" component={PromotionsScreen} />
            <Stack.Screen name="Treatment" component={TreatmentScreen} />
            <Stack.Screen name="Appointments" component={AppointmentsScreen} />
            <Stack.Screen name="PriceList" component={PriceListScreen} />
            <Stack.Screen name="Invoices" component={InvoicesScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </Stack.Navigator>
          {!isDesktop && <BottomNavigation />}
        </View>
      </View>
    </AppointmentsProvider>
  );
}

export default function App() {
  // OAuth callback - handle token from URL if cross-domain
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.location ||
      !window.location.search
    )
      return;
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("_auth_token");

    if (tokenFromUrl) {
      // Cross-domain: cookies don't work, use storageSync as persistent fallback
      // This is less secure but necessary for cross-domain OAuth
      try {
        // Save to storageSync (handles both web and native)
        storageSync.setItem("auth_token", tokenFromUrl);
        if (typeof window !== "undefined" && window.sessionStorage) {
          window.sessionStorage.setItem("auth_token_temp", tokenFromUrl);
        } else {
          storageSync.setItem("auth_token_temp", tokenFromUrl);
        }
      } catch {}

      // Clean URL immediately
      if (window.location && window.history) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }

      // Invalidate auth query to refetch with new token
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <NavigationContainer
            ref={navigationRef}
            linking={{
              prefixes: [],
              config: {
                screens: {
                  Login: "",
                  Dashboard: "dashboard",
                  Profile: "profile",
                  Promotions: "promotions",
                  Treatment: "treatment",
                  Chat: "chat",
                },
              },
            }}
          >
            <AuthChecker>
              {(isAuthenticated) => (
                <AppContent isAuthenticated={isAuthenticated} />
              )}
            </AuthChecker>
          </NavigationContainer>
          <StatusBar style="auto" />
          {/* {Platform.OS === "web" && <DebugLogs />} */}
          <Toast
            position="top"
            config={{
              app_info: ({ text1, text2 }) => (
                <RNView
                  style={{
                    alignSelf: "flex-end",
                    backgroundColor: "#111827",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10,
                    marginTop: 8,
                    marginRight: 12,
                    maxWidth: 360,
                  }}
                >
                  {text1 ? (
                    <RNText style={{ color: "#fff", fontWeight: "600" }}>
                      {text1}
                    </RNText>
                  ) : null}
                  {text2 ? (
                    <RNText style={{ color: "#D1D5DB", marginTop: 2 }}>
                      {text2}
                    </RNText>
                  ) : null}
                </RNView>
              ),
            }}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

// Separate component for socket connection (needs to be inside QueryClientProvider)
function AppContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { data: authData } = useAuth();
  const queryClient = useQueryClient();

  // Log when authentication state changes
  // Navigation will happen automatically via MainNavigator key prop
  useEffect(() => {
    console.log(
      "[AppContent] Auth state changed - isAuthenticated:",
      isAuthenticated,
      "authData role:",
      authData?.role,
      "authData exists:",
      !!authData
    );
    if (isAuthenticated && authData?.role === "patient") {
      console.log(
        "[AppContent] User authenticated - MainNavigator will automatically show Dashboard"
      );
    }
  }, [isAuthenticated, authData]);

  // Set global query client and navigate for api.ts
  useEffect(() => {
    setQueryClientForAuth(queryClient);
    setNavigateForAuth(navigate);
  }, [queryClient]);

  // Handle deep link authentication (patient-portal://auth?token=...)
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      try {
        console.log("[App] Deep link received:", url);

        // Check if it's an auth deep link
        if (
          url.includes("patient-portal://auth") ||
          url.includes("://auth?token=")
        ) {
          console.log("[App] Deep link detected - processing auth");
          // Extract token from URL
          // Replace custom scheme with https:// for URL parsing
          const normalizedUrl = url.replace("patient-portal://", "https://");
          const urlObj = new URL(normalizedUrl);
          const token =
            urlObj.searchParams.get("token") ||
            urlObj.searchParams.get("_auth_token");

          console.log(
            "[App] Token extracted from deep link:",
            token ? `present (length: ${token.length})` : "missing"
          );

          if (token) {
            console.log("[App] Deep link auth token received");
            // Save token
            try {
              storageSync.setItem("auth_token", token);
              if (
                Platform.OS === "web" &&
                typeof window !== "undefined" &&
                window.sessionStorage
              ) {
                window.sessionStorage.setItem("auth_token_temp", token);
              } else {
                storageSync.setItem("auth_token_temp", token);
              }
            } catch (e) {
              console.error("[App] Failed to save token from deep link:", e);
            }

            // Invalidate and immediately refetch auth query to get user data
            console.log("[App] Invalidating auth queries");
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

            console.log("[App] Refetching auth data from deep link");
            queryClient
              .refetchQueries({ queryKey: ["auth", "me"] })
              .then(() => {
                console.log(
                  "[App] Auth data refetched from deep link - AuthChecker will handle navigation"
                );
              })
              .catch((err) => {
                console.error(
                  "[App] Failed to refetch auth from deep link:",
                  err
                );
              });

            // Navigation will happen automatically via the isAuthenticated useEffect above
            console.log(
              "[App] Deep link processed, waiting for auth to update"
            );
          }
        }
      } catch (e) {
        console.error("[App] Deep link handling error:", e);
      }
    };

    // Handle initial URL (if app was opened via deep link)
    if (Platform.OS === "web") {
      // Web: check window.location
      if (typeof window !== "undefined") {
        const url = window.location.href;
        console.log("[App] Checking initial URL for auth token:", url);
        if (url.includes("://auth?token=") || url.includes("_auth_token=")) {
          console.log("[App] Auth token found in URL, processing...");
          handleDeepLink(url);
        } else {
          console.log("[App] No auth token in initial URL");
        }
      }
    } else {
      // Native: use Linking API
      Linking.getInitialURL().then(handleDeepLink).catch(console.error);

      // Listen for deep link events (when app is already open)
      const subscription = Linking.addEventListener("url", ({ url }) => {
        handleDeepLink(url);
      });

      return () => {
        subscription.remove();
      };
    }
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated || authData?.role !== "patient") return;
    let mounted = true;
    (async () => {
      try {
        // Request permissions using unified notification component
        await requestNotificationPermissions();
      } catch (error) {
        console.error("Failed to request notification permissions:", error);
      }
      const patientId = authData.userId || (await resolvePatientId());
      if (!mounted) return;
      const socket: any = connectSocket({ patientId: patientId || undefined });
      socket.on("message:new", ({ message: m }: any) => {
        try {
          // Only show notification for messages from doctor, not for patient's own messages
          if (m?.sender === "doctor") {
            // Try to parse JSON and extract title, otherwise use content as-is
            let notificationBody = m?.content || "";
            try {
              const parsed = JSON.parse(m?.content || "{}");
              if (parsed.title) {
                notificationBody = parsed.title;
              }
            } catch (e) {
              // Not JSON, use content as-is
            }

            void showNotification({
              title: "New message",
              body: notificationBody,
            });
          }
          // Invalidate messages query
          if (patientId) {
            queryClient.invalidateQueries({
              queryKey: ["messages", patientId],
            });
            queryClient.invalidateQueries({
              queryKey: ["unread", patientId],
            });
          }
        } catch (error) {
          console.error("Error handling message:new:", error);
        }
      });
      socket.on("appointment:new", ({ appointment, by }: any) => {
        try {
          console.log("🔔 appointment:new received", appointment);
          const when = new Date(appointment?.datetime).toLocaleString();

          void showNotification({
            title: "New appointment scheduled",
            body: `${appointment?.title || "Appointment"} on ${when}`,
          });

          // Invalidate appointments query immediately
          if (patientId) {
            queryClient.invalidateQueries({
              queryKey: ["appointments", patientId],
            });
            queryClient.invalidateQueries({
              queryKey: ["patients", patientId],
            });
          }
        } catch (error) {
          console.error("Error handling appointment:new:", error);
        }
      });
      socket.on("appointment:update", ({ appointment, by }: any) => {
        try {
          const when = new Date(appointment?.datetime).toLocaleString();

          void showNotification({
            title:
              by === "patient"
                ? "Appointment updated"
                : "Appointment updated by doctor",
            body: when,
          });

          // Invalidate appointments query immediately
          if (patientId) {
            queryClient.invalidateQueries({
              queryKey: ["appointments", patientId],
            });
            queryClient.invalidateQueries({
              queryKey: ["patients", patientId],
            });
          }
        } catch (error) {
          console.error("Error handling appointment:update:", error);
        }
      });
      socket.on("treatment:update", ({ procedure }: any) => {
        try {
          void showNotification({
            title: "Treatment plan updated",
            body: procedure?.title
              ? `New procedure: ${procedure.title}`
              : "Your treatment plan has been updated",
          });

          // Invalidate patient query to refresh treatment plans
          if (patientId) {
            queryClient.invalidateQueries({
              queryKey: ["patients", patientId],
            });
          }
        } catch (error) {
          console.error("Error handling treatment:update:", error);
        }
      });
      socket.on("appointment:cancelled", ({ appointmentId, by }: any) => {
        try {
          console.log("🔔 appointment:cancelled received", {
            appointmentId,
            by,
          });

          void showNotification({
            title: "Appointment cancelled",
            body:
              by === "patient"
                ? "You cancelled an appointment"
                : "Your appointment was cancelled by the doctor",
          });

          // Invalidate appointments query immediately
          if (patientId) {
            queryClient.invalidateQueries({
              queryKey: ["appointments", patientId],
            });
            queryClient.invalidateQueries({
              queryKey: ["patients", patientId],
            });
          }
        } catch (error) {
          console.error("Error handling appointment:cancelled:", error);
        }
      });
      socket.on("procedure:completed", ({ procedure }: any) => {
        try {
          console.log("🔔 procedure:completed received", procedure);
          void showNotification({
            title: "Procedure completed",
            body: procedure?.title
              ? `${procedure.title} has been marked as completed`
              : "A procedure has been completed",
          });

          if (patientId) {
            queryClient.invalidateQueries({
              queryKey: ["patients", patientId],
            });
          }
        } catch (error) {
          console.error("Error handling procedure:completed:", error);
        }
      });
      socket.on("invoice:created", ({ invoice }: any) => {
        try {
          console.log("🔔 invoice:created received", invoice);
          void showNotification({
            title: "New invoice",
            body: invoice?.procedure?.title
              ? `Invoice for ${
                  invoice.procedure.title
                }: $${invoice.amount.toFixed(2)}`
              : `New invoice: $${invoice.amount.toFixed(2)}`,
          });

          if (patientId) {
            queryClient.invalidateQueries({
              queryKey: ["patients", patientId],
            });
            queryClient.invalidateQueries({
              queryKey: ["invoices", patientId],
            });
          }
        } catch (error) {
          console.error("Error handling invoice:created:", error);
        }
      });
      socket.on("invoice:paid", ({ invoice }: any) => {
        try {
          console.log("🔔 invoice:paid received", invoice);
          void showNotification({
            title: "Invoice paid",
            body: invoice?.procedure?.title
              ? `Invoice for ${invoice.procedure.title} has been marked as paid`
              : "An invoice has been marked as paid",
          });

          if (patientId) {
            queryClient.invalidateQueries({
              queryKey: ["patients", patientId],
            });
            queryClient.invalidateQueries({
              queryKey: ["invoices", patientId],
            });
          }
        } catch (error) {
          console.error("Error handling invoice:paid:", error);
        }
      });

      // Check for promotions on mount and show notification if any exist
      (async () => {
        try {
          // Simple check - if promotions screen has any active promotions, notify
          // In real app, this would come from API
          const hasPromotions = true; // For now, always true since we have mock data
          if (hasPromotions) {
            const lastPromoCheck = storageSync.getItem("pp_lastPromoCheck");
            const now = Date.now();
            // Only show notification once per day
            if (
              !lastPromoCheck ||
              now - parseInt(lastPromoCheck) > 24 * 60 * 60 * 1000
            ) {
              setTimeout(() => {
                void showNotification({
                  title: "New promotions available",
                  body: "Check out our special offers and discounts",
                });
                storageSync.setItem("pp_lastPromoCheck", now.toString());
              }, 5000); // Show after 5 seconds to avoid spam
            }
          }
        } catch (error) {
          console.error("Error checking promotions:", error);
        }
      })();
    })();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, authData, queryClient]);

  return (
    <BrandingGate>
      <MainNavigator isAuthenticated={isAuthenticated} />
    </BrandingGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
    flexDirection: "row",
  },
});

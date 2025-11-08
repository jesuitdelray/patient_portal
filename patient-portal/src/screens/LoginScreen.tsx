import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/queries";
import * as AppleAuthentication from "expo-apple-authentication";
import { initiateGoogleAuth, initiateAppleAuth, getAuthBase } from "../lib/api";
import { Logo } from "../components/Logo";
import { DebugLogs } from "../components/DebugLogs";
import { storageSync } from "../lib/storage";
import { useBranding } from "../lib/useBranding";
import { useBrandingTheme } from "../lib/useBrandingTheme";
import { colors } from "../lib/colors";

const screenWidth = Dimensions.get("window").width;

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const queryClient = useQueryClient();
  const { data: authData } = useAuth();
  const { branding } = useBranding();
  const theme = useBrandingTheme();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (authData?.role === "patient") {
      console.log("[LoginScreen] User authenticated, redirecting to dashboard");
      if (typeof window !== "undefined" && window.location) {
        const currentHost = window.location.hostname;
        const currentPort = window.location.port
          ? `:${window.location.port}`
          : "";
        const protocol = window.location.protocol;
        window.location.href = `${protocol}//${currentHost}${currentPort}/dashboard`;
      } else {
        const { navigate } = require("../lib/navigation");
        if (navigate) {
          console.log("[LoginScreen] Navigating to Dashboard (native)");
          navigate("Dashboard");
        }
      }
    }
  }, [authData]);

  // Check for OAuth errors in URL
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined" || !window.location) return;

    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");

    if (error === "apple_oauth_not_configured") {
      Alert.alert(
        "Apple Sign In Not Configured",
        "Apple Sign In requires server configuration. Please use Google Sign In for now."
      );
      if (window.history && window.location.pathname) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  // Check if Apple Authentication is available (not in Expo Go)
  useEffect(() => {
    if (Platform.OS === "ios") {
      try {
        if (AppleAuthentication && AppleAuthentication.isAvailableAsync) {
          AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
        } else {
          setAppleAuthAvailable(true);
        }
      } catch {
        setAppleAuthAvailable(false);
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    if (authData?.role === "patient") {
      return;
    }
    setIsLoading(true);
    try {
      await initiateGoogleAuth("patient");
    } catch (error) {
      console.error("Google login error:", error);
      Alert.alert("Sign In Failed", "Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (authData?.role === "patient") {
      return;
    }

    // On web, always use web-based Apple Sign In
    if (Platform.OS === "web") {
      setIsLoading(true);
      try {
        await initiateAppleAuth("patient");
      } catch (error) {
        console.error("Apple login error:", error);
        Alert.alert("Sign In Failed", "Please try again");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // On iOS native: try native first, fallback to web
    if (Platform.OS !== "ios") {
      initiateAppleAuth("patient");
      return;
    }

    try {
      setIsLoading(true);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Send credential to backend
      const authBase = getAuthBase();
      const response = await fetch(`${authBase}/api/auth/apple`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          identityToken: credential.identityToken,
          authorizationCode: credential.authorizationCode,
          user: {
            email: credential.email,
            name: {
              firstName: credential.fullName?.givenName,
              lastName: credential.fullName?.familyName,
            },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          // Token should be in cookie, but also set in storage for fallback
          storageSync.setItem("auth_token", data.token);
        }
        // Invalidate and refetch auth
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        queryClient.refetchQueries({ queryKey: ["auth", "me"] });
      } else {
        throw new Error("Apple Sign In failed");
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const errorCode = (error as any)?.code;

      // If native Apple Sign In not available, fallback to web
      if (
        errorMessage.includes("expo-apple-authentication") ||
        errorCode === "ERR_MODULE_NOT_FOUND" ||
        errorMessage.includes("Cannot find module") ||
        errorMessage.includes("is not available")
      ) {
        console.log("Native Apple Sign In not available, using web version");
        try {
          await initiateAppleAuth("patient");
        } catch (webError) {
          console.error("Web Apple Sign In error:", webError);
          Alert.alert("Sign In Failed", "Please try again");
        }
        return;
      }

      console.error("Apple Sign In error:", errorMessage, errorCode);
      Alert.alert(
        "Sign In Failed",
        errorMessage || "Please try again or use Google Sign In"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Logo size={80} />
        </View>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primary }]}>
            {branding.clinicName || "Welcome"}
          </Text>
          <Text style={styles.subtitle}>
            Sign in to access your patient portal
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.googleButton,
            { backgroundColor: theme.primary, borderColor: theme.primary },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleGoogleLogin}
          disabled={isLoading}
        >
          <View style={styles.buttonContent}>
            <Text style={{ fontSize: 20, marginRight: 8 }}>🔐</Text>
            <Text style={[styles.buttonText, { color: theme.primaryContrast }]}>
              Sign in with Google
            </Text>
          </View>
        </TouchableOpacity>

        {/* Apple Sign In - show on iOS if native available, or show custom button for web/fallback */}
        {Platform.OS === "ios" && appleAuthAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={8}
            style={styles.appleButton}
            onPress={handleAppleLogin}
          />
        ) : (
          <TouchableOpacity
            style={[
              styles.appleButtonWeb,
              {
                backgroundColor: theme.primarySoft,
                borderColor: theme.primaryBorder,
              },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleAppleLogin}
            disabled={isLoading}
          >
            <View style={styles.buttonContent}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>🍎</Text>
              <Text style={[styles.appleButtonText, { color: theme.primary }]}>
                Sign in with Apple
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing in, you agree to our{" "}
            <Text
              style={[styles.linkText, { color: theme.primary }]}
              onPress={() => {
                const termsUrl =
                  require("../../app.json").expo.extra?.termsOfServiceUrl ||
                  "https://your-domain.com/terms";
                Linking.openURL(termsUrl);
              }}
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              style={[styles.linkText, { color: theme.primary }]}
              onPress={() => {
                const privacyUrl =
                  require("../../app.json").expo.extra?.privacyPolicyUrl ||
                  "https://your-domain.com/privacy";
                Linking.openURL(privacyUrl);
              }}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </View>
      <DebugLogs />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    marginBottom: 48,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  googleButton: {
    width: "100%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.greyscale200,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  logoContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  appleButton: {
    width: "100%",
    maxWidth: 320,
    height: 50,
    marginTop: 12,
  },
  appleButtonWeb: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.greyscale200,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

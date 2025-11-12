import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "./Logo";
import { colors } from "../lib/colors";
import { useBranding } from "../lib/useBranding";
import { useBrandingTheme } from "../lib/useBrandingTheme";

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
}

export function Header({ title, showLogo = true }: HeaderProps) {
  if (Platform.OS === "web") {
    return null;
  }

  const { branding } = useBranding();
  const theme = useBrandingTheme();
  const displayTitle = branding.clinicName || title;

  return (
    <SafeAreaView edges={[]} style={styles.safeArea}>
      <View style={styles.container}>
        {showLogo && (
          <View style={styles.logoContainer}>
            <Logo size={32} />
          </View>
        )}
        {displayTitle && (
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {displayTitle}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.primaryWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyscale200,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    minHeight: 40,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});

import React from "react";
import { Image, StyleSheet, ImageSourcePropType, Platform } from "react-native";
import { useBranding } from "../lib/useBranding";
import { API_BASE } from "../lib/api";

interface LogoProps {
  size?: number;
  style?: any;
}

export function Logo({ size = 40, style }: LogoProps) {
  const { branding } = useBranding();
  const defaultLogo: ImageSourcePropType = require("../../assets/teeth_logo.webp");

  if (branding.logoUrl) {
    const base =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin
        : API_BASE.replace(/\/api$/, "");

    const raw = branding.logoUrl.startsWith("http")
      ? branding.logoUrl
      : `${base}${branding.logoUrl}`;
    const version = branding.updatedAt
      ? `${raw}${raw.includes("?") ? "&" : "?"}v=${encodeURIComponent(
          branding.updatedAt
        )}`
      : raw;

    return (
      <Image
        source={{ uri: version }}
        defaultSource={defaultLogo}
        style={[styles.logo, style, { width: size, height: size }]}
        resizeMode="contain"
      />
    );
  }

  const logoSource: ImageSourcePropType = defaultLogo;
  return (
    <Image
      source={logoSource}
      style={[styles.logo, style, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    // Styles will be applied via size prop
  },
});


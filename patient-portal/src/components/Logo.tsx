import React from "react";
import { Image, StyleSheet, ImageSourcePropType } from "react-native";

interface LogoProps {
  size?: number;
  style?: any;
}

export function Logo({ size = 40, style }: LogoProps) {
  const logoSource: ImageSourcePropType = require("../../assets/teeth_logo.webp");

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


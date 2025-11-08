import React from "react";
import { View, StyleSheet } from "react-native";
import { Loader } from "./Loader";
import { useBranding } from "../lib/useBranding";
import { colors } from "../lib/colors";

type Props = {
  children: React.ReactNode;
};

export function BrandingGate({ children }: Props) {
  const { isInitialLoading } = useBranding();

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <Loader />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primaryWhite,
  },
});


import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

export function Loader() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    };
    animate();
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.loader,
          {
            transform: [{ rotate }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopColor: "#6b7280",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
    borderStyle: "solid",
  },
});


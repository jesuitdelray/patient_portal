import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

export function Loader() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
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
      <View style={styles.loader}>
        <Animated.View
          style={[
            styles.square,
            {
              transform: [{ rotate }],
            },
          ]}
        >
          <View style={styles.corner} />
        </Animated.View>
        <Animated.View
          style={[
            styles.square2,
            {
              transform: [{ rotate: "-180deg" }, { scale: -1 }],
            },
          ]}
        >
          <View style={styles.corner} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    width: 50,
    height: 50,
    position: "relative",
  },
  square: {
    position: "absolute",
    width: 35,
    height: 35,
    marginLeft: 15,
    marginBottom: 15,
  },
  square2: {
    position: "absolute",
    width: 35,
    height: 35,
    marginRight: 15,
    marginTop: 15,
  },
  corner: {
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderColor: "#046D8B",
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
});


import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../lib/colors";

const menuItems = [
  { title: "Dashboard", screen: "Dashboard", icon: "🏠" },
  { title: "Treatment", screen: "Treatment", icon: "🩺" },
  { title: "Messages", screen: "Messages", icon: "💬" },
  { title: "Promotions", screen: "Promotions", icon: "🏷️" },
  { title: "Profile", screen: "Profile", icon: "👤" },
];

export function BottomNavigation() {
  const navigation = useNavigation<any>();
  const [currentRoute, setCurrentRoute] = useState("Dashboard");

  useEffect(() => {
    const unsubscribe = navigation.addListener("state", () => {
      const state = navigation.getState();
      if (state) {
        const route = state.routes[state.index];
        setCurrentRoute(route?.name || "Dashboard");
      }
    });

    const state = navigation.getState();
    if (state) {
      const route = state.routes[state.index];
      setCurrentRoute(route?.name || "Dashboard");
    }

    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        {menuItems.map((item) => {
          const isActive = currentRoute === item.screen;
          return (
            <TouchableOpacity
              key={item.screen}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
              <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.primaryWhite,
  },
  container: {
    flexDirection: "row",
    backgroundColor: colors.primaryWhite,
    borderTopWidth: 1,
    borderTopColor: colors.greyscale200,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
    justifyContent: "space-around",
    shadowColor: colors.greyscale900,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  menuText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  menuTextActive: {
    color: colors.textPrimary,
    fontWeight: "500",
  },
});

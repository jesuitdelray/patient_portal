import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageSourcePropType,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../lib/colors";

const menuItems = [
  { title: "Dashboard", screen: "Dashboard", icon: "🏠" },
  { title: "App...ts", screen: "Appointments", icon: "📅" },
  { title: "Treatment", screen: "Treatment", icon: "🩺" },
  { title: "Price List", screen: "PriceList", icon: "💰" },
  { title: "Invoices", screen: "Invoices", icon: "📄" },
  { title: "Promotions", screen: "Promotions", icon: "🏷️" },
  { title: "Profile", screen: "Profile", icon: "👤" },
];

export function BottomNavigation() {
  const navigation = useNavigation<any>();
  const [currentRoute, setCurrentRoute] = useState("Dashboard");
  const chatButtonImage: ImageSourcePropType = require("../assets/image.png");

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.menuItemsContainer}
          style={styles.menuItemsScrollView}
        >
          {menuItems.map((item) => {
            const isActive = currentRoute === item.screen;
            return (
              <TouchableOpacity
                key={item.screen}
                style={styles.menuItem}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                <Text
                  style={[styles.menuText, isActive && styles.menuTextActive]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity
          key="magic-key"
          style={styles.chatButton}
          onPress={() => navigation.navigate("Chat")}
          activeOpacity={0.8}
        >
          <Image
            source={chatButtonImage}
            style={styles.chatButtonImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
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
    paddingBottom: 4,
    paddingHorizontal: 4,
    shadowColor: colors.greyscale900,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItemsScrollView: {
    flex: 1,
    marginRight: 4,
  },
  menuItemsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  menuItem: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 60,
  },
  chatButton: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  chatButtonImage: {
    width: 40,
    height: 40,
    transform: "scale(1.5)",
    marginLeft: -10,
    marginTop: -5,
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

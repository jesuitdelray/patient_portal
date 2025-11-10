import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Logo } from "./Logo";
import { colors } from "../lib/colors";
import { useBranding } from "../lib/useBranding";
import { useBrandingTheme } from "../lib/useBrandingTheme";

const menuItems = [
  { title: "Dashboard", screen: "Dashboard", icon: "🏠" },
  { title: "Appointments", screen: "Appointments", icon: "📅" },
  { title: "Treatment", screen: "Treatment", icon: "🩺" },
  { title: "Price List", screen: "PriceList", icon: "💰" },
  { title: "Chat", screen: "Chat", icon: "💬" },
  { title: "Invoices", screen: "Invoices", icon: "📄" },
  { title: "Promotions", screen: "Promotions", icon: "🏷️" },
  { title: "Profile", screen: "Profile", icon: "👤" },
];

export function Sidebar() {
  const navigation = useNavigation<any>();
  const [currentRoute, setCurrentRoute] = React.useState("Dashboard");
  const { branding } = useBranding();
  const theme = useBrandingTheme();

  React.useEffect(() => {
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
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.navBg,
          borderRightColor: theme.borderSubtle,
        },
      ]}
    >
      {Platform.OS === "web" ? (
        <TouchableOpacity
          style={styles.headerWeb}
          onPress={() => navigation.navigate("Dashboard")}
          activeOpacity={0.8}
        >
          <Logo size={36} />
          <Text style={[styles.title, { color: theme.brand }]}>
            {branding.clinicName || "Patient Portal"}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.header}
          onPress={() => navigation.navigate("Dashboard")}
          activeOpacity={0.8}
        >
          <Logo size={32} />
          <Text style={[styles.title, { color: theme.brand }]}>
            {branding.clinicName || "Patient Portal"}
          </Text>
        </TouchableOpacity>
      )}
      <View style={styles.menu}>
        {menuItems.map((item) => {
          const isActive = currentRoute === item.screen;
          return (
            <TouchableOpacity
              key={item.screen}
              style={[
                styles.menuItem,
                {
                  borderColor: isActive ? theme.navActiveBg : "transparent",
                  backgroundColor: isActive ? theme.navActiveBg : "transparent",
                },
              ]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text
                style={[
                  styles.menuIcon,
                  { color: isActive ? theme.navActiveText : theme.navIcon },
                ]}
              >
                {item.icon}
              </Text>
              <Text
                style={[
                  styles.menuText,
                  {
                    color: isActive ? theme.navActiveText : theme.navText,
                    fontWeight: isActive ? "600" : "400",
                  },
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    backgroundColor: colors.primaryWhite,
    borderRightWidth: 1,
    borderRightColor: colors.greyscale200,
    height: "100vh",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyscale200,
  },
  headerWeb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyscale200,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  menu: {
    gap: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  menuItemActive: {
    backgroundColor: colors.greyscale900,
    borderColor: colors.greyscale900,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});

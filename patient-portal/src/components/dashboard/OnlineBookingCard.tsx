import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../lib/colors";

export function OnlineBookingCard() {
  const navigation = useNavigation<any>();

  const handleBookNow = () => {
    navigation.navigate("PriceList");
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleBookNow}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📅</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Book Appointment Online</Text>
          <Text style={styles.description}>
            Schedule your visit quickly and easily
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>→</Text>
        </View>
      </View>
      <View style={styles.gradientOverlay} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
    position: "relative",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  icon: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primaryWhite,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
  arrowContainer: {
    marginLeft: 12,
  },
  arrow: {
    fontSize: 28,
    color: colors.primaryWhite,
    fontWeight: "300",
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "40%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
});


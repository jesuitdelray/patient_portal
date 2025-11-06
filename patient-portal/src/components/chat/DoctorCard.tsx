import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../lib/colors";

type Props = {
  doctor: any;
};

export function DoctorCard({ doctor }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{doctor.name || "Doctor"}</Text>
      </View>

      <View style={styles.content}>
        {doctor.email && (
          <View style={styles.row}>
            <Text style={styles.label}>📧 Email:</Text>
            <Text style={styles.value}>{doctor.email}</Text>
          </View>
        )}

        {doctor.picture && (
          <View style={styles.avatarContainer}>
            {/* Avatar would go here if needed */}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  content: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    minWidth: 80,
  },
  value: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  avatarContainer: {
    marginTop: 8,
  },
});


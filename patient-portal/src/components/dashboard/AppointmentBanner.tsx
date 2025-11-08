import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppointments } from "./AppointmentsContext";
import { colors } from "../../lib/colors";
import { useBrandingTheme } from "../../lib/useBrandingTheme";

export function AppointmentBanner() {
  const { appointments } = useAppointments();
  const firstAppointment = appointments[0];
  const theme = useBrandingTheme();

  if (!firstAppointment) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.primarySoft,
          borderColor: theme.primaryBorder,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.primary }]}>
          Upcoming Appointment!
        </Text>
        <Text style={[styles.text, { color: theme.primary }]}>
          You have a {firstAppointment.title.toLowerCase()} on{" "}
          {new Date(firstAppointment.datetime).toLocaleString()}
          {firstAppointment.location ? ` at ${firstAppointment.location}` : ""}.
          Don't forget to arrive 15 minutes early.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.greyscale100,
    borderColor: colors.greyscale300,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  content: {
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

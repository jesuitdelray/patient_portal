import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppointments } from "./AppointmentsContext";
import { colors } from "../../lib/colors";
import { useBrandingTheme } from "../../lib/useBrandingTheme";

export function AppointmentBanner() {
  const { appointments } = useAppointments();
  const upcomingAppointments = (appointments || []).filter((appointment) => {
    if (!appointment?.datetime) return false;
    return new Date(appointment.datetime).getTime() >= Date.now();
  });
  const firstAppointment = upcomingAppointments[0];
  const theme = useBrandingTheme();

  if (!firstAppointment) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.highlightBg,
          borderColor: theme.borderSubtle,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.highlightText }]}>
          Upcoming Appointment!
        </Text>
        <Text style={[styles.text, { color: theme.highlightText }]}>
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

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppointments } from "./AppointmentsContext";
import { colors } from "../../lib/colors";

export function AppointmentBanner() {
  const { appointments } = useAppointments();
  const firstAppointment = appointments[0];

  if (!firstAppointment) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Upcoming Appointment!</Text>
        <Text style={styles.text}>
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

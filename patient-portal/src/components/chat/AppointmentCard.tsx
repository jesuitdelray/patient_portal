import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../../lib/colors";
import { useBrandingTheme } from "../../lib/useBrandingTheme";

type Props = {
  appointment: any;
  onReschedule?: () => void;
  onCancel?: () => void;
};

export function AppointmentCard({ appointment, onReschedule, onCancel }: Props) {
  const theme = useBrandingTheme();
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.borderSubtle,
          backgroundColor: theme.surface,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.brand }]}>
          {appointment.title || "Appointment"}
        </Text>
        {appointment.type && (
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: theme.brandSoft },
            ]}
          >
            <Text style={[styles.typeText, { color: theme.brand }]}>
              {appointment.type}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>📅 Date & Time:</Text>
          <Text style={[styles.value, { color: theme.brand }]}>
            {formatDate(appointment.datetime)}
          </Text>
        </View>
        
        {appointment.location && (
          <View style={styles.row}>
            <Text style={styles.label}>📍 Location:</Text>
            <Text style={styles.value}>{appointment.location}</Text>
          </View>
        )}
      </View>

      {(onReschedule || onCancel) && (
        <View style={styles.actions}>
          {onReschedule && (
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSecondary,
                {
                  borderColor: theme.ctaBg,
                  backgroundColor: theme.brandSoft,
                },
              ]}
              onPress={onReschedule}
            >
              <Text
                style={[styles.buttonTextSecondary, { color: theme.ctaBg }]}
              >
                Reschedule
              </Text>
            </TouchableOpacity>
          )}
          {onCancel && (
            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={onCancel}
            >
              <Text style={styles.buttonTextDanger}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.greyscale200,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  typeBadge: {
    backgroundColor: colors.greyscale100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
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
    minWidth: 100,
  },
  value: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: colors.greyscale200,
    borderWidth: 1,
    borderColor: colors.greyscale300,
  },
  buttonDanger: {
    backgroundColor: colors.primaryWhite,
    borderWidth: 1,
    borderColor: colors.greyscale400,
  },
  buttonTextSecondary: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  buttonTextDanger: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.greyscale600,
  },
});


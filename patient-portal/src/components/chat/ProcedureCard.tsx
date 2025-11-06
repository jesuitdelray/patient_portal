import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../lib/colors";

type Props = {
  procedure: any;
};

export function ProcedureCard({ procedure }: Props) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const status = procedure.status || "planned";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{procedure.title || "Procedure"}</Text>
        <View
          style={[
            styles.statusBadge,
            status === "completed"
              ? styles.statusCompleted
              : status === "scheduled"
              ? styles.statusScheduled
              : styles.statusPlanned,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              status === "completed"
                ? styles.statusTextCompleted
                : status === "scheduled"
                ? styles.statusTextScheduled
                : styles.statusTextPlanned,
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      {procedure.description && (
        <Text style={styles.description}>{procedure.description}</Text>
      )}

      <View style={styles.details}>
        {procedure.scheduledDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📅 Scheduled:</Text>
            <Text style={styles.detailValue}>
              {formatDate(procedure.scheduledDate)}
            </Text>
          </View>
        )}

        {status === "completed" && procedure.completedDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>✅ Completed:</Text>
            <Text style={styles.detailValue}>
              {formatDate(procedure.completedDate)}
            </Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: colors.medicalGreenLight,
  },
  statusScheduled: {
    backgroundColor: colors.medicalBlueBg,
  },
  statusPlanned: {
    backgroundColor: colors.greyscale200,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusTextCompleted: {
    color: colors.medicalGreenDark,
  },
  statusTextScheduled: {
    color: colors.medicalBlue,
  },
  statusTextPlanned: {
    color: colors.textSecondary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "500",
  },
});


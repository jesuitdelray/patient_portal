import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../lib/colors";

type Props = {
  plan: any;
};

export function TreatmentPlanCard({ plan }: Props) {
  const procedures = plan.procedures || [];
  const completedCount = procedures.filter(
    (p: any) => p.status === "completed"
  ).length;
  const totalCount = procedures.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{plan.title || "Treatment Plan"}</Text>
        <View
          style={[
            styles.statusBadge,
            plan.status === "active"
              ? styles.statusActive
              : styles.statusInactive,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              plan.status === "active"
                ? styles.statusTextActive
                : styles.statusTextInactive,
            ]}
          >
            {plan.status || "Unknown"}
          </Text>
        </View>
      </View>

      {totalCount > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedCount} of {totalCount} procedures completed
          </Text>
        </View>
      )}

      {procedures.length > 0 && (
        <View style={styles.proceduresContainer}>
          <Text style={styles.proceduresTitle}>Procedures:</Text>
          {procedures.slice(0, 3).map((procedure: any, index: number) => (
            <View key={procedure.id || index} style={styles.procedureItem}>
              <Text style={styles.procedureName}>
                • {procedure.title || "Procedure"}
              </Text>
              <View
                style={[
                  styles.procedureStatus,
                  procedure.status === "completed"
                    ? styles.procedureStatusCompleted
                    : styles.procedureStatusPending,
                ]}
              >
                <Text
                  style={[
                    styles.procedureStatusText,
                    procedure.status === "completed"
                      ? styles.procedureStatusTextCompleted
                      : styles.procedureStatusTextPending,
                  ]}
                >
                  {procedure.status || "planned"}
                </Text>
              </View>
            </View>
          ))}
          {procedures.length > 3 && (
            <Text style={styles.moreText}>
              +{procedures.length - 3} more procedures
            </Text>
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
    borderColor: colors.border,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: colors.medicalGreenLight,
  },
  statusInactive: {
    backgroundColor: colors.greyscale200,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusTextActive: {
    color: colors.medicalGreenDark,
  },
  statusTextInactive: {
    color: colors.textSecondary,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.primaryWhite,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.greyscale200,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.medicalGreen,
    borderRadius: 999,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  proceduresContainer: {
    marginTop: 8,
  },
  proceduresTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  procedureItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  procedureName: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  procedureStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  procedureStatusCompleted: {
    backgroundColor: colors.medicalGreenLight,
  },
  procedureStatusPending: {
    backgroundColor: colors.greyscale200,
  },
  procedureStatusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  procedureStatusTextCompleted: {
    color: colors.medicalGreenDark,
  },
  procedureStatusTextPending: {
    color: colors.textSecondary,
  },
  moreText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: "italic",
    marginTop: 4,
  },
});


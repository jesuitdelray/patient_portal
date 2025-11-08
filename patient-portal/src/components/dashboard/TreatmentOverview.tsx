import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { API_BASE, resolvePatientId } from "../../lib/api";
import { colors } from "../../lib/colors";
import { useBrandingTheme } from "../../lib/useBrandingTheme";

type Procedure = {
  id: string;
  title: string;
  status: string;
};

type Plan = {
  id: string;
  title: string;
  status: string;
  procedures?: Procedure[];
};

export function TreatmentOverview() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const theme = useBrandingTheme();

  useEffect(() => {
    (async () => {
      const patientId = await resolvePatientId();
      if (!patientId) return;
      const res = await fetch(`${API_BASE}/patients/${patientId}`);
      const data = await res.json();
      setPlans(data.plans || []);
    })();
  }, []);

  const calculateProgress = (plan: Plan) => {
    if (!plan.procedures || plan.procedures.length === 0) {
      return { percentage: 0, completed: 0, total: 0 };
    }
    const total = plan.procedures.length;
    const completed = plan.procedures.filter(
      (p) => p.status === "completed"
    ).length;
    const percentage = Math.round((completed / total) * 100);
    return { percentage, completed, total };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={{ fontSize: 18 }}>🩺</Text>
        <Text style={styles.title}>Treatment Overview</Text>
      </View>

      <View style={styles.content}>
        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active treatments</Text>
            <Text style={styles.emptySubtext}>
              Your treatment plans will appear here
            </Text>
          </View>
        ) : (
          plans.map((plan) => {
            const { percentage, completed, total } = calculateProgress(plan);
            const isCompleted = plan.status === "completed" || percentage === 100;

            return (
              <View key={plan.id} style={styles.treatmentCard}>
                <View style={styles.treatmentHeader}>
                  <View style={styles.treatmentInfo}>
                    <Text style={styles.treatmentName}>{plan.title}</Text>
                    <Text style={styles.treatmentStep}>
                      {plan.status === "completed"
                        ? "Completed"
                        : plan.status === "active"
                        ? "Active"
                        : plan.status}
                    </Text>
                  </View>
                  <View style={styles.progressInfo}>
                    <Text style={{ fontSize: 16 }}>
                      {isCompleted ? "✅" : "⏰"}
                    </Text>
                    <Text style={styles.progressText}>
                      {percentage}%
                    </Text>
                  </View>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${percentage}%`,
                        backgroundColor: theme.primary,
                      },
                      isCompleted && {
                        backgroundColor: theme.accent,
                      },
                    ]}
                  />
                </View>
                {total > 0 && (
                  <Text style={styles.progressLabel}>
                    {completed} of {total} procedures completed
                  </Text>
                )}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: colors.greyscale900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  content: {
    gap: 20,
  },
  treatmentCard: {
    gap: 8,
  },
  treatmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentName: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  treatmentStep: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.greyscale200,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.greyscale700,
    borderRadius: 4,
  },
  progressBarComplete: {
    backgroundColor: colors.greyscale800,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});

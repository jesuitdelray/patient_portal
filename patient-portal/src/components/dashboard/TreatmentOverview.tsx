import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { API_BASE, resolvePatientId } from "../../lib/api";
import { colors } from "../../lib/colors";

type Plan = { id: string; title: string; status: string; steps: any };

export function TreatmentOverview() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    (async () => {
      const patientId = await resolvePatientId();
      if (!patientId) return;
      const res = await fetch(`${API_BASE}/patients/${patientId}`);
      const data = await res.json();
      setPlans(data.plans || []);
    })();
  }, []);

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
          plans.map((plan) => (
            <View key={plan.id} style={styles.treatmentCard}>
              <View style={styles.treatmentHeader}>
                <View style={styles.treatmentInfo}>
                  <Text style={styles.treatmentName}>{plan.title}</Text>
                  <Text style={styles.treatmentStep}>{plan.status}</Text>
                </View>
                <View style={styles.progressInfo}>
                  <Text style={{ fontSize: 16 }}>
                    {plan.status === "completed" ? "✅" : "⏰"}
                  </Text>
                  <Text style={styles.progressText}>
                    {plan.status === "completed" ? "100%" : ""}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${plan.status === "completed" ? 100 : 30}%` },
                    plan.status === "completed" && styles.progressBarComplete,
                  ]}
                />
              </View>
            </View>
          ))
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

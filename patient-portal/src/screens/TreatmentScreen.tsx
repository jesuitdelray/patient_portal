import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE, resolvePatientId } from "../lib/api";
import { useAuth } from "../lib/queries";
import { Header } from "../components/Header";
import { Loader } from "../components/Loader";
import { colors } from "../lib/colors";

type TreatmentPlan = {
  id: string;
  title: string;
  status: string;
  procedures: Array<{
    id: string;
    title: string;
    description?: string;
    scheduledDate?: string;
    completedDate?: string;
    status: string;
    appointment?: {
      id: string;
      title: string;
      datetime: string;
    };
  }>;
};

export default function TreatmentScreen() {
  const { data: authData } = useAuth();
  const patientId = authData?.role === "patient" ? authData.userId : null;
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const id = patientId || (await resolvePatientId());
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/patients/${id}`, {
          credentials: "include",
        });
        const data = await res.json();
        setPlans(data.plans || []);
      } catch (error) {
        console.error("Failed to fetch treatments:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  const calculateProgress = (plan: TreatmentPlan) => {
    if (plan.procedures.length === 0) return 0;
    const completed = plan.procedures.filter(
      (p) => p.status === "completed"
    ).length;
    return Math.round((completed / plan.procedures.length) * 100);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loader />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Treatment" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >

        <View style={styles.treatmentsList}>
          {plans.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No active treatments</Text>
              <Text style={styles.emptySubtext}>
                Your treatment plans will appear here
              </Text>
            </View>
          ) : (
            plans.map((plan) => {
              const progress = calculateProgress(plan);
              const nextProcedure = plan.procedures.find(
                (p) => p.status !== "completed"
              );
              return (
                <View key={plan.id} style={styles.treatmentCard}>
                  <View style={styles.treatmentHeader}>
                    <View style={styles.treatmentInfo}>
                      <Text style={styles.treatmentName}>{plan.title}</Text>
                      <Text style={styles.treatmentDescription}>
                        {plan.procedures.length} procedure
                        {plan.procedures.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <View style={styles.progressInfo}>
                      <Text style={{ fontSize: 18 }}>
                        {plan.status === "completed" ? "✅" : "⏰"}
                      </Text>
                      <Text style={styles.progressText}>{progress}%</Text>
                    </View>
                  </View>

                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${progress}%` },
                        plan.status === "completed" &&
                          styles.progressBarComplete,
                      ]}
                    />
                  </View>

                  <View style={styles.treatmentDetails}>
                    {nextProcedure && (
                      <View style={styles.detailRow}>
                        <Text>➡️</Text>
                        <Text style={styles.detailText}>
                          Next: {nextProcedure.title}
                          {nextProcedure.scheduledDate
                            ? ` (${new Date(
                                nextProcedure.scheduledDate
                              ).toLocaleDateString()})`
                            : ""}
                        </Text>
                      </View>
                    )}
                    {plan.procedures.length > 0 && (
                      <View style={styles.detailRow}>
                        <Text>📋</Text>
                        <Text style={styles.detailText}>
                          {
                            plan.procedures.filter(
                              (p) => p.status === "completed"
                            ).length
                          }{" "}
                          of {plan.procedures.length} completed
                        </Text>
                      </View>
                    )}
                    {plan.procedures.some((p) => p.appointment) && (
                      <View style={styles.detailRow}>
                        <Text>📅</Text>
                        <Text style={styles.detailText}>
                          Linked to appointments
                        </Text>
                      </View>
                    )}
                  </View>

                  {plan.procedures.length > 0 && (
                    <View style={styles.proceduresList}>
                      <Text style={styles.proceduresTitle}>Procedures:</Text>
                      {plan.procedures.map((proc) => (
                        <View key={proc.id} style={styles.procedureItem}>
                          <Text style={styles.procedureName}>
                            {proc.status === "completed"
                              ? "✅"
                              : proc.status === "scheduled"
                              ? "📅"
                              : "⏸️"}{" "}
                            {proc.title}
                          </Text>
                          {proc.description && (
                            <Text style={styles.procedureDesc}>
                              {proc.description}
                            </Text>
                          )}
                          {proc.appointment && (
                            <Text style={styles.procedureAppt}>
                              📅 {proc.appointment.title} -{" "}
                              {new Date(
                                proc.appointment.datetime
                              ).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  proceduresList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  proceduresTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  procedureItem: {
    marginBottom: 8,
    paddingLeft: 8,
  },
  procedureName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 2,
  },
  procedureDesc: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  procedureAppt: {
    fontSize: 11,
    color: "#007AFF",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  treatmentsList: {
    gap: 20,
  },
  treatmentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  treatmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  treatmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  treatmentName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  treatmentDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: "#E5E5E5",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 5,
  },
  progressBarComplete: {
    backgroundColor: "#34C759",
  },
  treatmentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#666",
  },
});

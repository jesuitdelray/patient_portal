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
import { useBrandingTheme } from "../lib/useBrandingTheme";

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
    invoice?: {
      id: string;
      amount: number;
      status: string;
    };
  }>;
};

export default function TreatmentScreen() {
  const { data: authData } = useAuth();
  const patientId = authData?.role === "patient" ? authData.userId : null;
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useBrandingTheme();

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
                        {
                          width: `${progress}%`,
                          backgroundColor: colors.medicalGreen,
                        },
                        plan.status === "completed" && {
                          backgroundColor: colors.medicalGreen,
                        },
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
                      <View style={styles.phaseHeader}>
                        <Text style={styles.phaseTitle}>{plan.title}</Text>
                      </View>
                      <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                          <View style={[styles.tableHeaderCell, { width: 30 }]} />
                          <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Tooth</Text>
                          <Text style={[styles.tableHeaderText, { flex: 2.5 }]}>Procedure</Text>
                          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Price</Text>
                          <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Discount</Text>
                          <Text style={[styles.tableHeaderText, { flex: 0.6 }]}>Qty</Text>
                          <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Total</Text>
                        </View>
                        {plan.procedures.map((proc) => {
                          const price = proc.invoice?.amount || 0;
                          const discount = 0; // TODO: Add discount field if needed
                          const qty = 1;
                          const total = price * (1 - discount / 100) * qty;
                          const tooth = proc.description?.match(/\d+/)?.[0] || "-";
                          
                          return (
                            <View key={proc.id} style={styles.tableRow}>
                              <View style={[styles.tableCell, { width: 30, alignItems: "center" }]}>
                                <View style={styles.checkbox}>
                                  {proc.status === "completed" && (
                                    <Text style={styles.checkmark}>✓</Text>
                                  )}
                                </View>
                              </View>
                              <Text style={[styles.tableCell, styles.tableCellText, { flex: 0.8 }]}>
                                {tooth}
                              </Text>
                              <Text style={[styles.tableCell, styles.tableCellText, { flex: 2.5 }]}>
                                {proc.title}
                              </Text>
                              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1 }]}>
                                ${price.toFixed(2)}
                              </Text>
                              <Text style={[styles.tableCell, styles.tableCellText, { flex: 0.8 }]}>
                                {discount}%
                              </Text>
                              <Text style={[styles.tableCell, styles.tableCellText, { flex: 0.6 }]}>
                                {qty}
                              </Text>
                              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1.2 }]}>
                                ${total.toFixed(2)}
                              </Text>
                            </View>
                          );
                        })}
                        <View style={styles.tableFooter}>
                          <Text style={styles.footerText}>
                            {plan.title} total ($): ${plan.procedures.reduce((sum, proc) => {
                              const price = proc.invoice?.amount || 0;
                              const discount = 0;
                              const qty = 1;
                              return sum + (price * (1 - discount / 100) * qty);
                            }, 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>
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
  phaseHeader: {
    backgroundColor: colors.greyscale200,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 4,
  },
  phaseTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: colors.greyscale200,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primaryWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyscale200,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableHeaderCell: {
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "left",
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: colors.primaryWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyscale200,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableCell: {
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  tableCellText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.greyscale400,
    backgroundColor: colors.primaryWhite,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    fontSize: 12,
    color: colors.medicalGreen,
    fontWeight: "bold",
  },
  tableFooter: {
    backgroundColor: colors.greyscale100,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.greyscale200,
  },
  footerText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "right",
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
    backgroundColor: colors.primaryWhite,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.greyscale200,
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.medicalGreen,
    borderRadius: 999,
  },
  progressBarComplete: {
    backgroundColor: colors.medicalGreen,
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

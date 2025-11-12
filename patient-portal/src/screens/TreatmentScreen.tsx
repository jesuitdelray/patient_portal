import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
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
  steps?: {
    description?: string;
    phases?: Array<{
      title: string;
      description?: string;
      weeks?: string;
    }>;
  };
  procedures: Array<{
    id: string;
    title: string;
    description?: string;
    scheduledDate?: string;
    completedDate?: string;
    status: string;
    phase?: number;
    tooth?: string;
    price?: number;
    discount?: number;
    quantity?: number;
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

const mockTreatmentPlans: TreatmentPlan[] = [
  {
    id: "1",
    title: "Mock Treatments Plan Status",
    status: "Test Status",
    steps: {
      description:
        "Description bla bla bla.... Description bla bla bla... Description bla bla bla... Description bla bla bla... Description bla bla bla... Description bla bla bla...",
      phases: [
        {
          title: "First phase",
          description: "Second phase description",
          weeks: "Phases Weeks",
        },
        {
          title: "Second phase",
          description: "Second phase description",
          weeks: "Phases Weeks",
        },
        {
          title: "Third phase",
          description: "Second phase description",
          weeks: "Phases Weeks",
        },
      ],
    },
    procedures: [
      {
        id: "1",
        title: "Procedure Title First",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        completedDate: "18.08.2025",
        status: "Done",
        phase: 1,
        tooth: "11",
        price: 100,
        discount: 10,
        quantity: 1,
        appointment: {
          id: "1",
          title: "first appointment",
          datetime: "12.07.2026",
        },
        invoice: {
          id: "1",
          amount: 5,
          status: "In progress",
        },
      },
      {
        id: "2",
        title: "Procedure Title Second",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        completedDate: "18.08.2025",
        status: "Done",
        phase: 2,
        tooth: "12",
        price: 200,
        discount: 50,
        quantity: 2,
        appointment: {
          id: "2",
          title: "first appointment",
          datetime: "12.07.2026",
        },
        invoice: {
          id: "2",
          amount: 5,
          status: "In progress",
        },
      },
      {
        id: "3",
        title: "Procedure Title Third",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        completedDate: "18.08.2025",
        status: "Done",
        phase: 3,
        tooth: "13",
        price: 300,
        discount: 100,
        quantity: 2,
        appointment: {
          id: "1",
          title: "first appointment",
          datetime: "12.07.2026",
        },
        invoice: {
          id: "1",
          amount: 5,
          status: "In progress",
        },
      },
      {
        id: "4",
        title: "Procedure Title Third",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        completedDate: "18.08.2025",
        status: "Done",
        phase: 2,
        tooth: "13",
        price: 300,
        discount: 100,
        quantity: 2,
        appointment: {
          id: "1",
          title: "first appointment",
          datetime: "12.07.2026",
        },
        invoice: {
          id: "1",
          amount: 5,
          status: "In progress",
        },
      },
      {
        id: "5",
        title: "Procedure Title Third",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        completedDate: "18.08.2025",
        status: "Done",
        phase: 2,
        tooth: "13",
        price: 300,
        discount: 40,
        quantity: 2,
        appointment: {
          id: "1",
          title: "first appointment",
          datetime: "12.07.2026",
        },
        invoice: {
          id: "1",
          amount: 5,
          status: "In progress",
        },
      },
      {
        id: "6",
        title: "Procedure Title Third",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        completedDate: "18.08.2025",
        status: "Done",
        phase: 3,
        tooth: "13",
        price: 300,
        discount: 20,
        quantity: 2,
        appointment: {
          id: "1",
          title: "first appointment",
          datetime: "12.07.2026",
        },
        invoice: {
          id: "1",
          amount: 5,
          status: "In progress",
        },
      },
      {
        id: "7",
        title: "Procedure Title Third",
        description: "Procedure Description",
        scheduledDate: "12.06.2024",
        completedDate: "18.08.2025",
        status: "Done",
        phase: 3,
        tooth: "13",
        price: 100,
        discount: 0,
        quantity: 2,
        appointment: {
          id: "1",
          title: "first appointment",
          datetime: "12.07.2026",
        },
        invoice: {
          id: "1",
          amount: 5,
          status: "In progress",
        },
      },
    ],
  },
];

type Doctor = {
  id: string;
  name: string;
  email: string;
  picture?: string;
};

type Patient = {
  id: string;
  name: string;
  email: string;
  picture?: string;
};

export default function TreatmentScreen() {
  const { data: authData } = useAuth();
  const patientId = authData?.role === "patient" ? authData.userId : null;
  const [treatPlans, setPlans] = useState<TreatmentPlan[]>(mockTreatmentPlans);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = useBrandingTheme();

  const plans = mockTreatmentPlans;

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
        setDoctor(data.doctor || null);
        setPatient(data.patient || null);
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

  const groupProceduresByPhase = (procedures: TreatmentPlan["procedures"]) => {
    const grouped: Record<number, typeof procedures> = {};

    procedures.forEach((proc) => {
      const phase = proc.phase || 0;
      if (!grouped[phase]) {
        grouped[phase] = [];
      }
      grouped[phase].push(proc);
    });
    return grouped;
  };

  const calculatePhaseTotal = (procedures: TreatmentPlan["procedures"]) => {
    return procedures.reduce((sum, proc) => {
      const price = proc.price || proc.invoice?.amount || 0;
      const discount = proc.discount || 0;
      const qty = proc.quantity || 1;
      const total = price * (1 - discount / 100) * qty;
      return sum + total;
    }, 0);
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
              const groupedProcedures = groupProceduresByPhase(plan.procedures);
              const phases = plan.steps?.phases || [];
              const description = plan.steps?.description || "";

              console.log(phases, "phases");

              return (
                <View key={plan.id} style={styles.treatmentCard}>
                  {/* Header with title and status */}
                  <View style={styles.planHeader}>
                    <View style={styles.planHeaderLeft}>
                      <Text style={styles.planTitle}>Treatment plan</Text>
                      <View style={styles.statusButton}>
                        <Text style={styles.statusButtonText}>
                          {plan.status.charAt(0).toUpperCase() +
                            plan.status.slice(1)}
                        </Text>
                        {/* <Text style={styles.statusArrow}>▼</Text> */}
                      </View>
                    </View>
                    {/* <View style={styles.planHeaderRight}>
                      <TouchableOpacity style={styles.iconButton}>
                        <Text style={styles.iconText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconButton}>
                        <Text style={styles.iconText}>✕</Text>
                      </TouchableOpacity>
                    </View> */}
                  </View>

                  {/* Doctor and Patient Info */}
                  <View style={styles.doctorPatientInfo}>
                    <View style={styles.doctorPatientRow}>
                      <Text style={styles.doctorPatientLabel}>Doctor:</Text>
                      {doctor?.picture ? (
                        <Image
                          source={{ uri: doctor.picture }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                          <Text style={styles.avatarText}>
                            {doctor?.name?.charAt(0) || "D"}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.doctorPatientName}>
                        {doctor?.name || "Dr. Smith"}
                      </Text>
                    </View>
                    <View style={styles.doctorPatientRow}>
                      <Text style={styles.doctorPatientLabel}>Patient:</Text>
                      {patient?.picture ? (
                        <Image
                          source={{ uri: patient.picture }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                          <Text style={styles.avatarText}>
                            {patient?.name?.charAt(0) || "P"}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.doctorPatientName}>
                        {patient?.name || "Patient"}
                      </Text>
                    </View>
                  </View>

                  {/* Treatment Description */}
                  {description && (
                    <View style={styles.descriptionSection}>
                      <Text style={styles.descriptionTitle}>{plan.title}</Text>
                      <Text style={styles.descriptionText}>{description}</Text>
                    </View>
                  )}

                  {/* Phases */}
                  {Object.keys(groupedProcedures).length > 0 && (
                    <View style={styles.phasesContainer}>
                      {Object.keys(groupedProcedures)
                        .map(Number)
                        .sort((a, b) => a - b)
                        .map((phaseNum) => {
                          const phaseProcedures = groupedProcedures[phaseNum];
                          const phaseInfo = phases[phaseNum - 1] || {
                            title: `Phase ${phaseNum}`,
                          };
                          const phaseTotal =
                            calculatePhaseTotal(phaseProcedures);

                          console.log(phaseInfo, "phaseInfo");
                          console.log(groupedProcedures, "groupedProcedures");

                          console.log(
                            Object.keys(groupedProcedures).map(Number)
                          );

                          console.log(phaseTotal, "phaseTotal");

                          return (
                            <View key={phaseNum} style={styles.phaseSection}>
                              <View style={styles.phaseHeader}>
                                <Text style={styles.phaseTitle}>
                                  {phaseInfo.title}
                                  {phaseInfo.weeks
                                    ? ` (${phaseInfo.weeks})`
                                    : ""}
                                </Text>
                              </View>
                              <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={true}
                                style={styles.phaseScrollWrapper}
                              >
                                <View style={styles.tableContainer}>
                                  <View style={styles.tableHeader}>
                                    <View
                                      style={[
                                        styles.tableHeaderCell,
                                        { width: 30 },
                                      ]}
                                    />
                                    <Text
                                      style={[
                                        styles.tableHeaderText,
                                        { flex: 0.8 },
                                      ]}
                                    >
                                      Tooth
                                    </Text>
                                    <Text
                                      style={[
                                        styles.tableHeaderText,
                                        { flex: 2.5 },
                                      ]}
                                    >
                                      Procedure
                                    </Text>
                                    <Text
                                      style={[
                                        styles.tableHeaderText,
                                        { flex: 1 },
                                      ]}
                                    >
                                      Price
                                    </Text>
                                    <Text
                                      style={[
                                        styles.tableHeaderText,
                                        { flex: 0.8 },
                                      ]}
                                    >
                                      Discount
                                    </Text>
                                    <Text
                                      style={[
                                        styles.tableHeaderText,
                                        { flex: 0.6 },
                                      ]}
                                    >
                                      Qty
                                    </Text>
                                    <Text
                                      style={[
                                        styles.tableHeaderText,
                                        { flex: 1.2 },
                                      ]}
                                    >
                                      Total
                                    </Text>
                                  </View>
                                  {phaseProcedures.map((proc) => {
                                    const price =
                                      proc.price || proc.invoice?.amount || 0;
                                    const discount = proc.discount || 0;
                                    const qty = proc.quantity || 1;
                                    const total =
                                      price * (1 - discount / 100) * qty;
                                    const tooth =
                                      proc.tooth ||
                                      proc.description?.match(/\d+/)?.[0] ||
                                      "-";

                                    return (
                                      <View
                                        key={proc.id}
                                        style={styles.tableRow}
                                      >
                                        <View
                                          style={[
                                            styles.tableCell,
                                            { width: 30, alignItems: "center" },
                                          ]}
                                        >
                                          <View
                                            style={[
                                              styles.checkbox,
                                              proc.status === "completed" &&
                                                styles.checkboxCompleted,
                                            ]}
                                          >
                                            {proc.status === "completed" && (
                                              <Text style={styles.checkmark}>
                                                ✓
                                              </Text>
                                            )}
                                          </View>
                                        </View>
                                        <Text
                                          style={[
                                            styles.tableCell,
                                            styles.tableCellText,
                                            { flex: 0.8 },
                                          ]}
                                        >
                                          {tooth}
                                        </Text>
                                        <Text
                                          style={[
                                            styles.tableCell,
                                            styles.tableCellText,
                                            { flex: 2.5 },
                                          ]}
                                        >
                                          {proc.title}
                                        </Text>
                                        <Text
                                          style={[
                                            styles.tableCell,
                                            styles.tableCellText,
                                            { flex: 1 },
                                          ]}
                                        >
                                          ${price.toFixed(2)}
                                        </Text>
                                        <Text
                                          style={[
                                            styles.tableCell,
                                            styles.tableCellText,
                                            { flex: 0.8 },
                                          ]}
                                        >
                                          {discount}%
                                        </Text>
                                        <Text
                                          style={[
                                            styles.tableCell,
                                            styles.tableCellText,
                                            { flex: 0.6 },
                                          ]}
                                        >
                                          {qty}
                                        </Text>
                                        <Text
                                          style={[
                                            styles.tableCell,
                                            styles.tableCellText,
                                            { flex: 1.2 },
                                          ]}
                                        >
                                          ${total.toFixed(2)}
                                        </Text>
                                      </View>
                                    );
                                  })}
                                  <View style={styles.tableFooter}>
                                    <Text style={styles.footerText}>
                                      Phase {phaseNum} total ($): $
                                      {phaseTotal.toFixed(2)}
                                    </Text>
                                  </View>
                                </View>
                              </ScrollView>
                            </View>
                          );
                        })}
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
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  planHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.greyscale100,
    borderRadius: 6,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  statusArrow: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 18,
  },
  doctorPatientInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyscale200,
  },
  doctorPatientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  doctorPatientLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  doctorPatientName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: colors.greyscale300,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  phasesContainer: {
    // gap: 24,
  },
  phaseSection: {
    marginBottom: 16,
  },
  phaseScrollWrapper: {
    maxHeight: 400,
  },
  phaseHeader: {
    backgroundColor: "#F0EBF3",
    paddingVertical: 10,
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
    minWidth: 600,
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
  checkboxCompleted: {
    backgroundColor: colors.medicalGreen,
    borderColor: colors.medicalGreen,
  },
  checkmark: {
    fontSize: 12,
    color: colors.primaryWhite,
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

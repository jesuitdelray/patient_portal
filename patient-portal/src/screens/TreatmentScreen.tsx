import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { colors } from "../lib/colors";
import { useBrandingTheme } from "../lib/useBrandingTheme";
import {
  MOCK_DOCTOR,
  MOCK_PATIENT,
  MOCK_TREATMENT_PLANS,
  TreatmentPlan,
  TreatmentProcedure,
  TreatmentPerson,
} from "../mock/treatmentPlans";

export default function TreatmentScreen() {
  const theme = useBrandingTheme();
  const plans = useMemo<TreatmentPlan[]>(() => MOCK_TREATMENT_PLANS, []);
  const doctor: TreatmentPerson | null = MOCK_DOCTOR;
  const patient: TreatmentPerson | null = MOCK_PATIENT;

  const calculateProgress = (plan: TreatmentPlan) => {
    if (plan.procedures.length === 0) return 0;
    const completed = plan.procedures.filter(
      (p: TreatmentProcedure) => p.status === "completed"
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
              const overallTotal = calculatePhaseTotal(plan.procedures);

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
                              {Platform.OS === "web" ? (
                                <View style={styles.tableContainer}>
                                  <View style={styles.tableHeader}>
                                    <View
                                      style={[
                                        styles.tableHeaderCell,
                                        styles.columnCheckbox,
                                      ]}
                                    >
                                      <Text
                                        style={styles.tableHeaderText}
                                      ></Text>
                                    </View>
                                    <View
                                      style={[
                                        styles.tableHeaderCell,
                                        styles.columnTooth,
                                      ]}
                                    >
                                      <Text style={styles.tableHeaderText}>
                                        Tooth
                                      </Text>
                                    </View>
                                    <View
                                      style={[
                                        styles.tableHeaderCell,
                                        styles.columnProcedure,
                                      ]}
                                    >
                                      <Text style={styles.tableHeaderText}>
                                        Procedure
                                      </Text>
                                    </View>
                                    <View
                                      style={[
                                        styles.tableHeaderCell,
                                        styles.columnPrice,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.tableHeaderText,
                                          styles.textRight,
                                        ]}
                                      >
                                        Price
                                      </Text>
                                    </View>
                                    <View
                                      style={[
                                        styles.tableHeaderCell,
                                        styles.columnDiscount,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.tableHeaderText,
                                          styles.textRight,
                                        ]}
                                      >
                                        Discount
                                      </Text>
                                    </View>
                                    <View
                                      style={[
                                        styles.tableHeaderCell,
                                        styles.columnQty,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.tableHeaderText,
                                          styles.textCenter,
                                        ]}
                                      >
                                        Qty
                                      </Text>
                                    </View>
                                    <View
                                      style={[
                                        styles.tableHeaderCell,
                                        styles.columnTotal,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.tableHeaderText,
                                          styles.textRight,
                                        ]}
                                      >
                                        Total
                                      </Text>
                                    </View>
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
                                            styles.columnCheckbox,
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
                                        <View
                                          style={[
                                            styles.tableCell,
                                            styles.columnTooth,
                                          ]}
                                        >
                                          <Text style={styles.tableCellText}>
                                            {tooth}
                                          </Text>
                                        </View>
                                        <View
                                          style={[
                                            styles.tableCell,
                                            styles.columnProcedure,
                                          ]}
                                        >
                                          <Text style={styles.tableCellText}>
                                            {proc.title}
                                          </Text>
                                        </View>
                                        <View
                                          style={[
                                            styles.tableCell,
                                            styles.columnPrice,
                                          ]}
                                        >
                                          <Text
                                            style={[
                                              styles.tableCellText,
                                              styles.textRight,
                                            ]}
                                          >
                                            ${price.toFixed(2)}
                                          </Text>
                                        </View>
                                        <View
                                          style={[
                                            styles.tableCell,
                                            styles.columnDiscount,
                                          ]}
                                        >
                                          <Text
                                            style={[
                                              styles.tableCellText,
                                              styles.textRight,
                                            ]}
                                          >
                                            {discount}%
                                          </Text>
                                        </View>
                                        <View
                                          style={[
                                            styles.tableCell,
                                            styles.columnQty,
                                          ]}
                                        >
                                          <Text
                                            style={[
                                              styles.tableCellText,
                                              styles.textCenter,
                                            ]}
                                          >
                                            {qty}
                                          </Text>
                                        </View>
                                        <View
                                          style={[
                                            styles.tableCell,
                                            styles.columnTotal,
                                          ]}
                                        >
                                          <Text
                                            style={[
                                              styles.tableCellText,
                                              styles.textRight,
                                            ]}
                                          >
                                            ${total.toFixed(2)}
                                          </Text>
                                        </View>
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
                              ) : (
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
                                          styles.columnCheckbox,
                                        ]}
                                      >
                                        <Text
                                          style={styles.tableHeaderText}
                                        ></Text>
                                      </View>
                                      <View
                                        style={[
                                          styles.tableHeaderCell,
                                          styles.columnTooth,
                                        ]}
                                      >
                                        <Text style={styles.tableHeaderText}>
                                          Tooth
                                        </Text>
                                      </View>
                                      <View
                                        style={[
                                          styles.tableHeaderCell,
                                          styles.columnProcedure,
                                        ]}
                                      >
                                        <Text style={styles.tableHeaderText}>
                                          Procedure
                                        </Text>
                                      </View>
                                      <View
                                        style={[
                                          styles.tableHeaderCell,
                                          styles.columnPrice,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.tableHeaderText,
                                            styles.textRight,
                                          ]}
                                        >
                                          Price
                                        </Text>
                                      </View>
                                      <View
                                        style={[
                                          styles.tableHeaderCell,
                                          styles.columnDiscount,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.tableHeaderText,
                                            styles.textRight,
                                          ]}
                                        >
                                          Discount
                                        </Text>
                                      </View>
                                      <View
                                        style={[
                                          styles.tableHeaderCell,
                                          styles.columnQty,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.tableHeaderText,
                                            styles.textCenter,
                                          ]}
                                        >
                                          Qty
                                        </Text>
                                      </View>
                                      <View
                                        style={[
                                          styles.tableHeaderCell,
                                          styles.columnTotal,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.tableHeaderText,
                                            styles.textRight,
                                          ]}
                                        >
                                          Total
                                        </Text>
                                      </View>
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
                                              styles.columnCheckbox,
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
                                          <View
                                            style={[
                                              styles.tableCell,
                                              styles.columnTooth,
                                            ]}
                                          >
                                            <Text style={styles.tableCellText}>
                                              {tooth}
                                            </Text>
                                          </View>
                                          <View
                                            style={[
                                              styles.tableCell,
                                              styles.columnProcedure,
                                            ]}
                                          >
                                            <Text style={styles.tableCellText}>
                                              {proc.title}
                                            </Text>
                                          </View>
                                          <View
                                            style={[
                                              styles.tableCell,
                                              styles.columnPrice,
                                            ]}
                                          >
                                            <Text
                                              style={[
                                                styles.tableCellText,
                                                styles.textRight,
                                              ]}
                                            >
                                              ${price.toFixed(2)}
                                            </Text>
                                          </View>
                                          <View
                                            style={[
                                              styles.tableCell,
                                              styles.columnDiscount,
                                            ]}
                                          >
                                            <Text
                                              style={[
                                                styles.tableCellText,
                                                styles.textRight,
                                              ]}
                                            >
                                              {discount}%
                                            </Text>
                                          </View>
                                          <View
                                            style={[
                                              styles.tableCell,
                                              styles.columnQty,
                                            ]}
                                          >
                                            <Text
                                              style={[
                                                styles.tableCellText,
                                                styles.textCenter,
                                              ]}
                                            >
                                              {qty}
                                            </Text>
                                          </View>
                                          <View
                                            style={[
                                              styles.tableCell,
                                              styles.columnTotal,
                                            ]}
                                          >
                                            <Text
                                              style={[
                                                styles.tableCellText,
                                                styles.textRight,
                                              ]}
                                            >
                                              ${total.toFixed(2)}
                                            </Text>
                                          </View>
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
                              )}
                            </View>
                          );
                        })}
                    </View>
                  )}
                  <View style={styles.planTotalRow}>
                    <Text style={styles.planTotalText}>
                      Plan total ($): ${overallTotal.toFixed(2)}
                    </Text>
                  </View>
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
    backgroundColor: colors.greyscale200,
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
    ...(Platform.OS === "web" ? { width: "100%" } : { minWidth: 700 }),
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primaryWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyscale200,
    paddingVertical: 8,
    paddingHorizontal: 8,
    ...(Platform.OS === "web" ? { width: "100%" } : { minWidth: 700 }),
  },
  tableHeaderCell: {
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "left",
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: colors.primaryWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyscale200,
    paddingVertical: 10,
    paddingHorizontal: 8,
    ...(Platform.OS === "web" ? { width: "100%" } : { minWidth: 700 }),
  },
  tableCell: {
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  tableCellText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  columnCheckbox: {
    width: 50,
    minWidth: 50,
    maxWidth: 50,
    alignItems: "center",
    flexShrink: 0,
  },
  columnTooth: {
    width: 70,
    minWidth: 70,
    maxWidth: 70,
    flexShrink: 0,
  },
  columnProcedure: {
    ...(Platform.OS === "web"
      ? { flex: 1, minWidth: 200 }
      : { width: 250, minWidth: 250, maxWidth: 250 }),
    flexShrink: 0,
  },
  columnPrice: {
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  columnDiscount: {
    width: 90,
    minWidth: 90,
    maxWidth: 90,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  columnQty: {
    width: 60,
    minWidth: 60,
    maxWidth: 60,
    alignItems: "center",
    flexShrink: 0,
  },
  columnTotal: {
    width: 110,
    minWidth: 110,
    maxWidth: 110,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  textRight: {
    textAlign: "right",
  },
  textCenter: {
    textAlign: "center",
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
    ...(Platform.OS === "web" ? { width: "100%", maxWidth: "100%" } : {}),
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
  planTotalRow: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.greyscale200,
    backgroundColor:
      Platform.OS === "web" ? "rgba(15, 111, 255, 0.06)" : colors.greyscale100,
  },
  planTotalText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "right",
  },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, usePatient } from "../lib/queries";
import { API_BASE, resolvePatientId } from "../lib/api";
import { Header } from "../components/Header";
import { colors } from "../lib/colors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBrandingTheme } from "../lib/useBrandingTheme";

type Invoice = {
  id: string;
  procedureId: string;
  amount: number;
  status: "unpaid" | "paid";
  createdAt: string;
  paidAt: string | null;
  procedure: {
    id: string;
    title: string;
    description: string | null;
    completedDate: string | null;
  };
};

export default function InvoicesScreen() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const { data: authData } = useAuth();
  const queryClient = useQueryClient();
  const theme = useBrandingTheme();

  useEffect(() => {
    (async () => {
      const id = await resolvePatientId();
      setPatientId(id);
    })();
  }, []);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["invoices", patientId],
    queryFn: async () => {
      if (!patientId) return { invoices: [] };
      const res = await fetch(`${API_BASE}/patients/${patientId}/invoices`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!patientId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const invoices: Invoice[] = invoicesData?.invoices || [];

  const handleDownloadPDF = (invoiceId: string) => {
    const url = `${API_BASE}/invoices/${invoiceId}/pdf`;
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url).catch((err) => {
        console.error("Failed to open PDF:", err);
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Invoices" />
      <ScrollView style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading invoices...</Text>
          </View>
        ) : invoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📄</Text>
            <Text style={styles.emptyText}>No invoices yet</Text>
            <Text style={styles.emptySubtext}>
              Invoices will appear here when procedures are completed
            </Text>
          </View>
        ) : (
          <View style={styles.invoicesList}>
            {invoices.map((invoice) => (
              <View
                key={invoice.id}
                style={[
                  styles.invoiceCard,
                  {
                    borderColor: theme.primaryBorder,
                    shadowColor: theme.primary,
                  },
                ]}
              >
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceTitleRow}>
                    <Text style={[styles.invoiceTitle, { color: theme.primary }]}>
                      {invoice.procedure?.title || "Unknown Procedure"}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        invoice.status === "paid"
                          ? styles.statusBadgePaid
                          : styles.statusBadgeUnpaid,
                        invoice.status === "paid"
                          ? {
                              backgroundColor: theme.accentSoft,
                              borderColor: theme.accent,
                            }
                          : {
                              backgroundColor: theme.primarySoft,
                              borderColor: theme.primaryBorder,
                            },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          invoice.status === "paid"
                            ? styles.statusTextPaid
                            : styles.statusTextUnpaid,
                          invoice.status === "paid"
                            ? { color: theme.accentContrast }
                            : { color: theme.primary },
                        ]}
                      >
                        {invoice.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  {invoice.procedure?.description && (
                    <Text style={styles.invoiceDescription}>
                      {invoice.procedure.description}
                    </Text>
                  )}
                </View>

                <View style={styles.invoiceDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount:</Text>
                    <Text style={[styles.detailValue, { color: theme.primary }]}>
                      ${invoice.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  {invoice.paidAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Paid:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(invoice.paidAt).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  {invoice.procedure?.completedDate && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Completed:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(
                          invoice.procedure.completedDate
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.downloadButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={() => handleDownloadPDF(invoice.id)}
                >
                  <Text
                    style={[
                      styles.downloadButtonText,
                      { color: theme.primaryContrast },
                    ]}
                  >
                    📥 Download PDF
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryWhite,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  invoicesList: {
    gap: 16,
  },
  invoiceCard: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.greyscale200,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  invoiceHeader: {
    marginBottom: 12,
  },
  invoiceTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgePaid: {
    backgroundColor: "#E6F7E6",
  },
  statusBadgeUnpaid: {
    backgroundColor: "#FFE6E6",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextPaid: {
    color: "#00AA00",
  },
  statusTextUnpaid: {
    color: "#FF0000",
  },
  invoiceDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  invoiceDetails: {
    gap: 8,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.greyscale200,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  downloadButton: {
    backgroundColor: colors.greyscale700,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadButtonText: {
    color: colors.primaryWhite,
    fontSize: 16,
    fontWeight: "500",
  },
});



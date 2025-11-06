import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../../lib/colors";

type Props = {
  invoice: any;
  onDownload?: () => void;
};

export function InvoiceCard({ invoice, onDownload }: Props) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const procedure = invoice.procedure || {};
  const status = invoice.status || "unpaid";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {procedure.title || "Invoice"}
        </Text>
        <View
          style={[
            styles.statusBadge,
            status === "paid"
              ? styles.statusPaid
              : styles.statusUnpaid,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              status === "paid"
                ? styles.statusTextPaid
                : styles.statusTextUnpaid,
            ]}
          >
            {status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>💰 Amount:</Text>
          <Text style={styles.amount}>${invoice.amount?.toFixed(2) || "0.00"}</Text>
        </View>

        {procedure.description && (
          <View style={styles.row}>
            <Text style={styles.label}>📋 Description:</Text>
            <Text style={styles.value}>{procedure.description}</Text>
          </View>
        )}

        {invoice.createdAt && (
          <View style={styles.row}>
            <Text style={styles.label}>📅 Created:</Text>
            <Text style={styles.value}>{formatDate(invoice.createdAt)}</Text>
          </View>
        )}

        {status === "paid" && invoice.paidAt && (
          <View style={styles.row}>
            <Text style={styles.label}>✅ Paid on:</Text>
            <Text style={styles.value}>{formatDate(invoice.paidAt)}</Text>
          </View>
        )}
      </View>

      {onDownload && (
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={onDownload}
        >
          <Text style={styles.downloadButtonText}>📥 Download PDF</Text>
        </TouchableOpacity>
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
  statusPaid: {
    backgroundColor: colors.medicalGreenLight,
  },
  statusUnpaid: {
    backgroundColor: colors.greyscale200,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextPaid: {
    color: colors.medicalGreenDark,
  },
  statusTextUnpaid: {
    color: colors.greyscale600,
  },
  content: {
    gap: 8,
    marginBottom: 12,
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
  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.medicalBlue,
  },
  downloadButton: {
    backgroundColor: colors.medicalBlue,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryWhite,
  },
});


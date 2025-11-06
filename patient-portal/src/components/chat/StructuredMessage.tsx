import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { colors } from "../../lib/colors";
import { AppointmentCard } from "./AppointmentCard";
import { TreatmentPlanCard } from "./TreatmentPlanCard";
import { InvoiceCard } from "./InvoiceCard";
import { ProcedureCard } from "./ProcedureCard";
import { DoctorCard } from "./DoctorCard";
import { PromotionCard } from "./PromotionCard";

type StructuredMessageData = {
  action: string;
  title: string;
  data: any;
};

type Props = {
  content: string;
  onAction?: (action: string, data: any) => void;
};

export function StructuredMessage({ content, onAction }: Props) {
  let parsed: StructuredMessageData | null = null;

  try {
    parsed = JSON.parse(content);
  } catch (e) {
    // Not JSON, display as plain text
    return <Text style={styles.plainText}>{content}</Text>;
  }

  if (!parsed || !parsed.action) {
    return <Text style={styles.plainText}>{content}</Text>;
  }

  const { action, title, data } = parsed;
  const isEmpty = data === null || (Array.isArray(data) && data.length === 0);

  // Don't show title if it's empty or if there's a button with the same text
  const actionsWithButtons = [
    "book_appointment",
    "view_price_list",
    "view_promotions",
  ];
  const shouldShowTitle =
    title && title.trim() !== "" && !actionsWithButtons.includes(action);

  return (
    <View style={styles.container}>
      {shouldShowTitle && <Text style={styles.title}>{title}</Text>}

      {!isEmpty && (
        <View style={styles.dataContainer}>
          {renderDataByAction(action, data, onAction)}
        </View>
      )}

      {renderActionButton(action, data, onAction)}
    </View>
  );
}

function renderDataByAction(
  action: string,
  data: any,
  onAction?: (action: string, data: any) => void
) {
  switch (action) {
    case "view_treatment_plan_details":
      if (Array.isArray(data)) {
        return data.map((plan: any, index: number) => (
          <TreatmentPlanCard key={plan.id || index} plan={plan} />
        ));
      }
      return null;

    case "view_next_appointment":
    case "view_upcoming_appointments":
      if (Array.isArray(data)) {
        return data.map((apt: any, index: number) => (
          <AppointmentCard
            key={apt.id || index}
            appointment={apt}
            onReschedule={() => onAction?.("reschedule_appointment", apt)}
            onCancel={() => onAction?.("cancel_appointment", apt)}
          />
        ));
      } else if (data) {
        return (
          <AppointmentCard
            appointment={data}
            onReschedule={() => onAction?.("reschedule_appointment", data)}
            onCancel={() => onAction?.("cancel_appointment", data)}
          />
        );
      }
      return null;

    case "view_unpaid_invoices":
    case "view_past_invoices":
    case "view_all_invoices":
      if (Array.isArray(data)) {
        return data.map((invoice: any, index: number) => (
          <InvoiceCard
            key={invoice.id || index}
            invoice={invoice}
            onDownload={() => onAction?.("download_invoice", invoice)}
          />
        ));
      }
      return null;

    case "view_remaining_procedures":
    case "view_completed_treatments":
    case "view_next_procedure":
      if (Array.isArray(data)) {
        return data.map((procedure: any, index: number) => (
          <ProcedureCard key={procedure.id || index} procedure={procedure} />
        ));
      } else if (data) {
        return <ProcedureCard procedure={data} />;
      }
      return null;

    case "view_assigned_doctor":
      if (Array.isArray(data)) {
        return data.map((doctor: any, index: number) => (
          <DoctorCard key={doctor.id || index} doctor={doctor} />
        ));
      }
      return null;

    case "view_promotions":
      if (Array.isArray(data)) {
        return data.map((promotion: any, index: number) => (
          <PromotionCard key={promotion.id || index} promotion={promotion} />
        ));
      }
      return null;

    default:
      // For other actions, display data as formatted JSON
      return (
        <View style={styles.jsonContainer}>
          <Text style={styles.jsonText}>{JSON.stringify(data, null, 2)}</Text>
        </View>
      );
  }
}

function renderActionButton(
  action: string,
  data: any,
  onAction?: (action: string, data: any) => void
) {
  const actionButtons: Record<
    string,
    { label: string; variant?: "primary" | "secondary" }
  > = {
    book_appointment: { label: "Book Appointment", variant: "primary" },
    reschedule_appointment: { label: "Reschedule", variant: "secondary" },
    cancel_appointment: { label: "Cancel Appointment", variant: "secondary" },
    download_invoice: { label: "Download PDF", variant: "primary" },
    view_price_list: { label: "View Price List", variant: "primary" },
    view_promotions: { label: "View Promotions", variant: "primary" },
  };

  const buttonConfig = actionButtons[action];
  if (!buttonConfig || !onAction) return null;

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        buttonConfig.variant === "primary"
          ? styles.actionButtonPrimary
          : styles.actionButtonSecondary,
      ]}
      onPress={() => onAction(action, data)}
    >
      <Text
        style={[
          styles.actionButtonText,
          buttonConfig.variant === "primary"
            ? styles.actionButtonTextPrimary
            : styles.actionButtonTextSecondary,
        ]}
      >
        {buttonConfig.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  title: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  dataContainer: {
    gap: 12,
    marginBottom: 12,
  },
  plainText: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  jsonContainer: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jsonText: {
    fontSize: 12,
    fontFamily: Platform.OS === "web" ? "monospace" : "monospace",
    color: colors.textSecondary,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  actionButtonPrimary: {
    backgroundColor: colors.medicalBlue,
  },
  actionButtonSecondary: {
    backgroundColor: colors.greyscale200,
    borderWidth: 1,
    borderColor: colors.greyscale300,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtonTextPrimary: {
    color: colors.primaryWhite,
  },
  actionButtonTextSecondary: {
    color: colors.textPrimary,
  },
});

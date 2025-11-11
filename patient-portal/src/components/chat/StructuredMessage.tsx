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
    if (
      typeof parsed?.prompt === "string" ||
      typeof parsed?.initialMessage === "string"
    ) {
      const promptText =
        typeof parsed.prompt === "string" && parsed.prompt.trim().length > 0
          ? parsed.prompt.trim()
          : "What would you like to tell the clinic?";
      return (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>{promptText}</Text>
          <Text style={styles.infoSubtext}>
            Reply in the chat box below and we’ll send it to the front desk.
          </Text>
        </View>
      );
    }

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
    title &&
    title.trim() !== "" &&
    !actionsWithButtons.includes(action);

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
    case "cancel_appointment":
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
    case "view_procedure_details":
    case "view_dental_history":
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

    case "update_contact_info":
      if (!data) {
        return null;
      }
      return (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Please verify your contact details below.
          </Text>
          {data.name ? (
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name: </Text>
              {data.name}
            </Text>
          ) : null}
          {data.email ? (
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email: </Text>
              {data.email}
            </Text>
          ) : null}
          {data.phone ? (
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone: </Text>
              {data.phone}
            </Text>
          ) : null}
          {data.address ? (
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address: </Text>
              {data.address}
            </Text>
          ) : null}
          <Text style={styles.infoSubtext}>
            {data.instructions ||
              "Reply with the updated details and we will take care of it."}
          </Text>
        </View>
      );

    case "view_procedure_price": {
      const matches = Array.isArray(data?.matches)
        ? data.matches
        : Array.isArray(data)
        ? data
        : [];
      const query = data?.query;

      if (matches.length === 0) {
        return (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              {query
                ? `No procedures found for “${query}”.`
                : "No matching procedures found."}
            </Text>
            <Text style={styles.infoSubtext}>
              You can check the full price list for more procedures.
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.infoContainer}>
          {matches.map((item: any, index: number) => {
            const price =
              typeof item.price === "number"
                ? item.price
                : Number(item.price ?? 0);

            return (
              <View key={item.id || index} style={styles.priceListItem}>
                <Text style={styles.priceListTitle}>{item.title}</Text>
                <Text style={styles.priceListLine}>
                  <Text style={styles.infoLabel}>Price: </Text>${price.toFixed(2)}
                </Text>
                {item.duration ? (
                  <Text style={styles.priceListLine}>
                    <Text style={styles.infoLabel}>Duration: </Text>
                    {item.duration} min
                  </Text>
                ) : null}
                {item.category ? (
                  <Text style={styles.priceListLine}>
                    <Text style={styles.infoLabel}>Category: </Text>
                    {item.category}
                  </Text>
                ) : null}
                {item.description ? (
                  <Text style={styles.priceListDescription}>
                    {item.description}
                  </Text>
                ) : null}
                {index < matches.length - 1 ? (
                  <View style={styles.priceDivider} />
                ) : null}
              </View>
            );
          })}
        </View>
      );
    }

    case "view_available_slots": {
      const slots = Array.isArray(data?.slots)
        ? data.slots
        : Array.isArray(data)
        ? data
        : [];

      if (slots.length === 0) {
        return (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              No available time slots for the requested period.
            </Text>
            <Text style={styles.infoSubtext}>
              Tap the button below to request a booking and we will find the
              next open time for you.
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.slotGrid}>
          {slots.map((slot: any, index: number) => (
            <TouchableOpacity
              key={slot.start || index}
              style={styles.slotPill}
              onPress={() =>
                onAction?.("book_appointment", {
                  ...slot,
                  source: "suggested_slot",
                })
              }
            >
              <Text style={styles.slotDate}>{slot.dateLabel}</Text>
              <Text style={styles.slotTime}>{slot.timeLabel}</Text>
              {slot.isEstimated ? (
                <Text style={styles.slotMeta}>Estimated availability</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    case "send_message_to_front_desk": {
      return (
        <View style={styles.frontDeskPrompt}>
          <Text style={styles.frontDeskPromptMain}>
            Please write a message for our front desk — they’ll get back to you
            as soon as possible!
          </Text>
        </View>
      );
    }

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
    {
      label: string;
      variant?: "primary" | "secondary";
      onPress?: (data: any, handler?: (action: string, data: any) => void) => void;
    }
  > = {
    book_appointment: { label: "Book Appointment", variant: "primary" },
    reschedule_appointment: { label: "Reschedule", variant: "secondary" },
    cancel_appointment: {
      label: "Cancel Appointment",
      variant: "secondary",
      onPress: (payload, handler) => {
        const appointment = Array.isArray(payload) ? payload[0] : payload;
        if (appointment) {
          handler?.("cancel_appointment", appointment);
        }
      },
    },
    download_invoice: { label: "Download PDF", variant: "primary" },
    view_price_list: { label: "View Price List", variant: "primary" },
    view_promotions: { label: "View Promotions", variant: "primary" },
    view_available_slots: {
      label: "Book Appointment",
      variant: "primary",
      onPress: (slotsData, handler) => {
        const firstSlot = Array.isArray(slotsData?.slots)
          ? slotsData.slots[0]
          : Array.isArray(slotsData)
          ? slotsData[0]
          : null;
        handler?.("book_appointment", {
          ...(firstSlot || {}),
          source: "available_slots_button",
        });
      },
    },
  };

  const buttonConfig = actionButtons[action];
  if (!buttonConfig || !onAction) return null;

  const handlePress = () => {
    if (buttonConfig.onPress) {
      buttonConfig.onPress(data, onAction);
    } else {
      onAction(action, data);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        buttonConfig.variant === "primary"
          ? styles.actionButtonPrimary
          : styles.actionButtonSecondary,
      ]}
      onPress={handlePress}
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
  frontDeskPrompt: {
    gap: 4,
  },
  frontDeskPromptMain: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  frontDeskPromptHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoContainer: {
    backgroundColor: colors.greyscale100,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.greyscale200,
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  infoRow: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  infoLabel: {
    fontWeight: "600",
  },
  infoSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  infoPromptPreview: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.primaryWhite,
    borderWidth: 1,
    borderColor: colors.greyscale200,
    gap: 4,
  },
  priceListItem: {
    gap: 4,
  },
  priceListTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  priceListLine: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  priceListDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.greyscale200,
    marginVertical: 8,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotPill: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.medicalBlue,
    minWidth: 120,
  },
  slotDate: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.medicalBlue,
  },
  slotTime: {
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 2,
  },
  slotMeta: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
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

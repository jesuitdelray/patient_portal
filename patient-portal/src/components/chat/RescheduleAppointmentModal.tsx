import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { API_BASE } from "../../lib/api";
import Toast from "react-native-toast-message";
import { colors } from "../../lib/colors";
import { useBrandingTheme } from "../../lib/useBrandingTheme";

const WEB_DATE_INPUT_FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  appointment: any;
};

export function RescheduleAppointmentModal({
  visible,
  onClose,
  onSuccess,
  appointment,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(
    appointment?.datetime ? new Date(appointment.datetime) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newDateTime, setNewDateTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const theme = useBrandingTheme();

  React.useEffect(() => {
    if (visible && appointment?.datetime) {
      const appointmentDate = new Date(appointment.datetime);
      setSelectedDate(appointmentDate);
      setNewDateTime(appointmentDate.toISOString().slice(0, 16));
    }
  }, [visible, appointment]);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (Platform.OS === "ios" && event.type === "set" && date) {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setNewDateTime(date.toISOString().slice(0, 16));
    }
  };

  const handleSubmit = async () => {
    if (!newDateTime || !appointment?.id || isSubmitting) {
      Toast.show({
        type: "error",
        text1: "Please select a new date and time",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/appointments/${appointment.id}/reschedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ datetime: newDateTime }),
        }
      );

      if (res.ok) {
        const responseData = await res.json().catch(() => ({}));
        const updatedAppointment = responseData.appointment;
        
        Toast.show({
          type: "success",
          text1: "Appointment rescheduled successfully!",
        });
        onSuccess?.(updatedAppointment);
        onClose();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to reschedule appointment");
      }
    } catch (error: any) {
      console.error("[RescheduleAppointment] Error:", error);
      Toast.show({
        type: "error",
        text1: error.message || "Failed to reschedule appointment",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  const todayString = today.toISOString().slice(0, 16);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Reschedule Appointment</Text>
          <Text style={styles.subtitle}>
            {appointment?.title || "Appointment"}
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Date & Time</Text>
              {Platform.OS === "web" ? (
                <input
                  type="datetime-local"
                  value={newDateTime}
                  min={todayString}
                  onChange={(e) => {
                    setNewDateTime(e.target.value);
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value));
                    }
                  }}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    fontSize: 15,
                    fontFamily: WEB_DATE_INPUT_FONT,
                    fontWeight: 500,
                    backgroundColor: colors.primaryWhite,
                    color: colors.textPrimary,
                    outline: "none",
                  }}
                />
              ) : (
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {newDateTime
                      ? new Date(newDateTime).toLocaleString()
                      : "Select date and time"}
                  </Text>
                </TouchableOpacity>
              )}

              {showDatePicker && Platform.OS !== "web" && (
                <DateTimePicker
                  value={selectedDate}
                  mode="datetime"
                  minimumDate={today}
                  onChange={handleDateChange}
                />
              )}
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonCancel,
                { borderColor: colors.border },
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSubmit,
                { backgroundColor: theme.ctaBg },
                (isSubmitting || !newDateTime) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !newDateTime}
            >
              <Text style={[styles.buttonTextSubmit, { color: theme.ctaText }]}>
                {isSubmitting ? "Rescheduling..." : "Reschedule"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 500,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.primaryWhite,
  },
  dateText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonCancel: {
    backgroundColor: colors.greyscale200,
    borderWidth: 1,
    borderColor: colors.greyscale300,
  },
  buttonSubmit: {
    backgroundColor: colors.medicalBlue,
  },
  buttonTextCancel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  buttonTextSubmit: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primaryWhite,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});


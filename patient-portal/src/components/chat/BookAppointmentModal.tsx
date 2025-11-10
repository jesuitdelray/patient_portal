import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "../../lib/colors";
import { API_BASE, fetchWithAuth } from "../../lib/api";
import Toast from "react-native-toast-message";
import { useBrandingTheme } from "../../lib/useBrandingTheme";

type SuggestedSlot = {
  start?: string;
  end?: string;
  title?: string;
  dateLabel?: string;
  timeLabel?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  procedureTitle?: string;
  initialSlot?: SuggestedSlot | null;
};

export function BookAppointmentModal({
  visible,
  onClose,
  onSuccess,
  procedureTitle,
  initialSlot,
}: Props) {
  const [title, setTitle] = useState(procedureTitle || "");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datetime, setDatetime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const theme = useBrandingTheme();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const tomorrowString = tomorrow.toISOString().slice(0, 16);

  React.useEffect(() => {
    if (!visible) return;

    let initialDate = new Date();
    if (initialSlot?.start) {
      const slotDate = new Date(initialSlot.start);
      if (!Number.isNaN(slotDate.valueOf())) {
        initialDate = slotDate;
      }
    } else {
      initialDate.setDate(initialDate.getDate() + 1);
      initialDate.setHours(10, 0, 0, 0);
    }

    setSelectedDate(initialDate);
    setDatetime(initialDate.toISOString().slice(0, 16));

    if (procedureTitle) {
      setTitle(procedureTitle);
    } else if (initialSlot?.title) {
      setTitle(initialSlot.title);
    } else {
      setTitle("");
    }
  }, [visible, procedureTitle, initialSlot]);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (Platform.OS === "ios" && event.type === "set" && date) {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setDatetime(date.toISOString().slice(0, 16));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !datetime || isSubmitting) {
      Toast.show({
        type: "error",
        text1: "Please fill in all fields",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/appointments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          datetime,
          type: "consultation",
        }),
      });

      const responseText = await res.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error("[BookAppointment] Failed to parse response:", responseText);
        throw new Error("Failed to create appointment");
      }

      if (res.ok && responseData.appointment) {
        Toast.show({
          type: "success",
          text1: "Appointment booked successfully!",
        });
        onSuccess?.(responseData.appointment);
        onClose();
        setTitle("");
        setDatetime("");
      } else {
        throw new Error(responseData.error || "Failed to create appointment");
      }
    } catch (error: any) {
      console.error("[BookAppointment] Error:", error);
      Toast.show({
        type: "error",
        text1: error.message || "Failed to book appointment",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            {
              borderColor: theme.borderSubtle,
              backgroundColor: theme.surface,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.brand }]}>
            Book Appointment
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Title</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.borderSubtle,
                    backgroundColor: colors.primaryWhite,
                    color: theme.textPrimary,
                  },
                ]}
                placeholder="Appointment title"
                placeholderTextColor={theme.textSecondary}
                value={title}
                onChangeText={setTitle}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                Date & Time
              </Text>
              {Platform.OS === "web" ? (
                <input
                  type="datetime-local"
                  value={datetime}
                  min={tomorrowString}
                  onChange={(e) => {
                    setDatetime(e.target.value);
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value));
                    }
                  }}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${theme.borderSubtle}`,
                    fontSize: 15,
                    fontFamily: "inherit",
                    color: colors.textPrimary,
                    backgroundColor: colors.primaryWhite,
                  }}
                  className="datetime-input"
                />
              ) : (
                <TouchableOpacity
                  style={[
                    styles.dateInput,
                    {
                      borderColor: theme.borderSubtle,
                      backgroundColor: colors.primaryWhite,
                    },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.dateText, { color: theme.textPrimary }]}>
                    {datetime
                      ? new Date(datetime).toLocaleString()
                      : "Select date and time"}
                  </Text>
                </TouchableOpacity>
              )}

              {showDatePicker && Platform.OS !== "web" && (
                <DateTimePicker
                  value={selectedDate}
                  mode="datetime"
                  minimumDate={tomorrow}
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
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSubtle,
                },
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={onClose}
              disabled={isSubmitting}
            >
            <Text
              style={[
                styles.buttonTextCancel,
                  { color: theme.textPrimary },
              ]}
            >
              Cancel
            </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSubmit,
                { backgroundColor: theme.brand },
                (isSubmitting || !title.trim() || !datetime) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !title.trim() || !datetime}
            >
              <Text
                style={[
                  styles.buttonTextSubmit,
                  { color: theme.brandText },
                ]}
              >
                {isSubmitting ? "Booking..." : "Book Appointment"}
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
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 20,
  },
  form: {
    gap: 16,
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.primaryWhite,
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


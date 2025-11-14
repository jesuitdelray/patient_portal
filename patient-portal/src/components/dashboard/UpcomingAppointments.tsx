import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import { useAppointments } from "./AppointmentsContext";
import { API_BASE } from "../../lib/api";
import { useAuth } from "../../lib/queries";
import { colors } from "../../lib/colors";
import { useBrandingTheme } from "../../lib/useBrandingTheme";

const WEB_DATE_INPUT_FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif";

export function UpcomingAppointments() {
  const { appointments, setAppointments } = useAppointments();
  const { data: authData } = useAuth();
  const isAdmin = authData?.role === "admin";
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    location: "",
    type: "",
    datetime: "",
  });
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [newDateTime, setNewDateTime] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const theme = useBrandingTheme();
  const upcomingAppointments = useMemo(() => {
    const filtered = (appointments || []).filter((appointment: any) => {
      if (!appointment?.datetime) return false;
      // Don't show cancelled appointments
      if (appointment.isCancelled) return false;
      const appointmentDate = new Date(appointment.datetime);
      const now = new Date();
      return appointmentDate.getTime() >= now.getTime();
    });
    console.log("[UpcomingAppointments] Recalculated upcoming:", {
      total: appointments?.length || 0,
      upcoming: filtered.length,
    });
    return filtered;
  }, [appointments]);

  const today = new Date();
  const todayString = today.toISOString().slice(0, 16);

  const cancelAppointment = async (appointment: any) => {
    if (!appointment?.id) {
      Toast.show({
        type: "error",
        text1: "Invalid appointment",
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/appointments/${appointment.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to cancel appointment");
      }

      // Immediately update local state for instant UI feedback
      // Socket event will also update, providing redundancy
      const currentAppointments = appointments || [];
      const updatedAppointments = currentAppointments.filter(
        (appt) => appt.id !== appointment.id
      );
      setAppointments(updatedAppointments);

      console.log(
        "[UpcomingAppointments] Cancelled appointment, updated list:",
        {
          before: currentAppointments.length,
          after: updatedAppointments.length,
          cancelledId: appointment.id,
        }
      );

      Toast.show({
        type: "success",
        text1: "Appointment cancelled successfully",
      });
    } catch (error: any) {
      console.error("[UpcomingAppointments] Cancel error:", error);
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to cancel appointment",
      });
    }
  };

  const handleCancel = (appointment: any) => {
    const confirmCancellation = () => cancelAppointment(appointment);

    if (Platform.OS === "web") {
      if (window.confirm("Cancel this appointment?")) {
        confirmCancellation();
      }
    } else {
      Alert.alert(
        "Cancel Appointment",
        "Are you sure you want to cancel this appointment?",
        [
          { text: "No", style: "cancel" },
          { text: "Yes", style: "destructive", onPress: confirmCancellation },
        ]
      );
    }
  };

  const handleReschedule = async () => {
    if (isRescheduling || !newDateTime || !selectedAppointment?.id) return;
    setIsRescheduling(true);
    try {
      await fetch(
        `${API_BASE}/appointments/${selectedAppointment.id}/reschedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datetime: newDateTime }),
        }
      );
      // SSE на бэке пришлет обновление; локально только закрываем
      setIsRescheduleOpen(false);
      setNewDateTime("");
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleOpenEdit = (appointment: any) => {
    setSelectedAppointment(appointment);
    const appointmentDate = new Date(appointment.datetime || new Date());
    setSelectedDate(appointmentDate);
    setEditData({
      title: appointment.title || "",
      location: appointment.location || "",
      type: appointment.type || "",
      datetime: appointmentDate.toISOString().slice(0, 16),
    });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (
      isEditing ||
      !editData.title ||
      !editData.datetime ||
      !selectedAppointment?.id
    )
      return;
    setIsEditing(true);
    try {
      const res = await fetch(
        `${API_BASE}/appointments/${selectedAppointment.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: editData.title,
            location: editData.location,
            type: editData.type,
            datetime: editData.datetime,
          }),
        }
      );
      if (res.ok) {
        // SSE на бэке пришлет обновление; локально только закрываем
        setIsEditOpen(false);
        setEditData({ title: "", location: "", type: "", datetime: "" });
      } else {
        alert("Failed to update appointment");
      }
    } catch (error) {
      console.error("Edit appointment error:", error);
      alert("Failed to update appointment");
    } finally {
      setIsEditing(false);
    }
  };

  const handleOpenReschedule = (appointment: any) => {
    setSelectedAppointment(appointment);
    // Use appointment's current datetime as initial value
    const initialDate = appointment?.datetime
      ? new Date(appointment.datetime)
      : new Date();
    setSelectedDate(initialDate);
    setNewDateTime(initialDate.toISOString().slice(0, 16));
    setIsRescheduleOpen(true);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (Platform.OS === "ios") {
      // On iOS, allow toggle by keeping picker open if user wants to change again
      // But close if user selects a date
      if (event.type === "set" && date) {
        setShowDatePicker(false);
      }
    }
    if (date) {
      setSelectedDate(date);
      setNewDateTime(date.toISOString().slice(0, 16));
    }
  };

  if (upcomingAppointments.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.borderSubtle,
          backgroundColor: theme.highlightBg,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={{ fontSize: 18 }}>📅</Text>
        <Text style={[styles.title, { color: theme.highlightText }]}>
          Upcoming Appointments
        </Text>
      </View>

      <View style={styles.content}>
        {upcomingAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No upcoming appointments</Text>
            <Text style={styles.emptySubtext}>
              Your scheduled appointments will appear here
            </Text>
          </View>
        ) : (
          upcomingAppointments.map((appointment) => (
            <View
              key={appointment.id}
              style={[
                styles.appointmentCard,
                {
                  borderColor: theme.borderSubtle,
                  backgroundColor: colors.primaryWhite,
                },
              ]}
            >
              <View style={styles.appointmentContent}>
                <Text
                  style={[
                    styles.appointmentTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {appointment.title}
                </Text>
                {appointment.location ? (
                  <Text style={styles.appointmentDoctor}>
                    {appointment.location}
                  </Text>
                ) : null}

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <Text style={{ fontSize: 14 }}>📅</Text>
                    <Text
                      style={[
                        styles.detailText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {new Date(appointment.datetime).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={{ fontSize: 14 }}>⏰</Text>
                    <Text
                      style={[
                        styles.detailText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {new Date(appointment.datetime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={{ fontSize: 14 }}>📍</Text>
                    <Text
                      style={[
                        styles.detailText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {appointment.location || "Clinic"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionButtons}>
                {isAdmin ? (
                  <TouchableOpacity
                    style={[
                      styles.rescheduleButton,
                      {
                        borderColor: theme.ctaBg,
                        backgroundColor: theme.ctaBg,
                      },
                    ]}
                    onPress={() => handleOpenEdit(appointment)}
                  >
                    <Text
                      style={[
                        styles.rescheduleButtonText,
                        { color: theme.ctaText },
                      ]}
                    >
                      Edit
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.rescheduleButton,
                      {
                        borderColor: theme.ctaBg,
                        backgroundColor: theme.ctaBg,
                      },
                    ]}
                    onPress={() => handleOpenReschedule(appointment)}
                  >
                    <Text
                      style={[
                        styles.rescheduleButtonText,
                        { color: theme.ctaText },
                      ]}
                    >
                      Reschedule
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => handleCancel(appointment)}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <Modal
        visible={isRescheduleOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRescheduleOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reschedule Appointment</Text>
            <Text style={styles.modalDescription}>
              Reschedule your appointment with {selectedAppointment?.doctor} for{" "}
              {selectedAppointment?.title}.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Date & Time</Text>
              {Platform.OS === "web" ? (
                <View style={styles.dateTimeInputWrapper}>
                  <input
                    type="datetime-local"
                    value={newDateTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewDateTime(value);
                      // Also update selectedDate for consistency
                      if (value) {
                        setSelectedDate(new Date(value));
                      }
                    }}
                    min={todayString}
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "14px",
                      border: `1px solid ${theme.borderSubtle}`,
                      borderRadius: "8px",
                      backgroundColor: colors.primaryWhite,
                      fontFamily: WEB_DATE_INPUT_FONT,
                      fontWeight: 500,
                      boxSizing: "border-box",
                      color: theme.textPrimary,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  />
                </View>
              ) : (
                <>
                  {/* <TouchableOpacity
                    style={styles.dateTimeInput}
                    onPress={() => setShowDatePicker(!showDatePicker)}
                  >
                    <Text style={styles.dateTimeText}>
                      {selectedDate.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 20 }}>📅</Text>
                  </TouchableOpacity> */}
                  {/* {showDatePicker && ( */}
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="datetime"
                      display="default"
                      onChange={handleDateChange}
                      minimumDate={today}
                    />
                  </View>
                  {/* )} */}
                </>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setIsRescheduleOpen(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.ctaBg },
                  (isRescheduling || !newDateTime) && styles.saveButtonDisabled,
                ]}
                onPress={handleReschedule}
                disabled={isRescheduling || !newDateTime}
              >
                {isRescheduling ? (
                  <Text
                    style={[styles.saveButtonText, { color: theme.ctaText }]}
                  >
                    Rescheduling...
                  </Text>
                ) : (
                  <Text
                    style={[styles.saveButtonText, { color: theme.ctaText }]}
                  >
                    Reschedule
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isEditOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Appointment</Text>
            <Text style={styles.modalDescription}>
              Edit appointment details below.
            </Text>

            <ScrollView style={styles.modalForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editData.title}
                  onChangeText={(text) =>
                    setEditData({ ...editData, title: text })
                  }
                  placeholder="Appointment title"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.formInput}
                  value={editData.location}
                  onChangeText={(text) =>
                    setEditData({ ...editData, location: text })
                  }
                  placeholder="Location (optional)"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Type</Text>
                <TextInput
                  style={styles.formInput}
                  value={editData.type}
                  onChangeText={(text) =>
                    setEditData({ ...editData, type: text })
                  }
                  placeholder="Type (optional)"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Date & Time *</Text>
                {Platform.OS === "web" ? (
                  <View style={styles.dateTimeInputWrapper}>
                    <input
                      type="datetime-local"
                      value={editData.datetime}
                      onChange={(e) =>
                        setEditData({ ...editData, datetime: e.target.value })
                      }
                      min={todayString}
                      readOnly
                      onClick={() => {
                        // Trigger native date picker behavior
                        const input = document.querySelectorAll(
                          'input[type="datetime-local"]'
                        )[1] as HTMLInputElement;
                        if (input) {
                          input.showPicker?.();
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "14px",
                        border: `1px solid ${theme.borderSubtle}`,
                        borderRadius: "8px",
                        backgroundColor: colors.primaryWhite,
                        color: theme.textPrimary,
                        outline: "none",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        marginTop: 8,
                        fontFamily: WEB_DATE_INPUT_FONT,
                        fontWeight: 500,
                      }}
                    />
                  </View>
                ) : (
                  <>
                    {/* <TouchableOpacity
                      style={styles.dateTimeButton}
                      onPress={() => setShowDatePicker(!showDatePicker)}
                    >
                      <Text style={styles.dateTimeButtonText}>
                        {editData.datetime
                          ? new Date(editData.datetime).toLocaleString()
                          : "Select date & time"}
                      </Text>
                    </TouchableOpacity> */}
                    {/* {showDatePicker && ( */}
                    <View style={styles.datePickerContainer}>
                      <DateTimePicker
                        value={selectedDate}
                        mode="datetime"
                        display="default"
                        onChange={(event, date) => {
                          if (Platform.OS === "android") {
                            setShowDatePicker(false);
                          }
                          if (Platform.OS === "ios") {
                            // On iOS, allow toggle by keeping picker open if user wants to change again
                            // But close if user selects a date
                            if (event.type === "set" && date) {
                              setShowDatePicker(false);
                            }
                          }
                          if (date) {
                            setSelectedDate(date);
                            setEditData({
                              ...editData,
                              datetime: date.toISOString().slice(0, 16),
                            });
                          }
                        }}
                        minimumDate={today}
                      />
                    </View>
                    {/* )} */}
                  </>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setIsEditOpen(false);
                  setEditData({
                    title: "",
                    location: "",
                    type: "",
                    datetime: "",
                  });
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.ctaBg },
                  (!editData.title || !editData.datetime || isEditing) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleEdit}
                disabled={!editData.title || !editData.datetime || isEditing}
              >
                {isEditing ? (
                  <Text
                    style={[styles.saveButtonText, { color: theme.ctaText }]}
                  >
                    Saving...
                  </Text>
                ) : (
                  <Text
                    style={[styles.saveButtonText, { color: theme.ctaText }]}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.greyscale200,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryWhite,
  },
  content: {
    gap: 12,
  },
  appointmentCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primaryWhite,
    marginBottom: 4,
  },
  appointmentDoctor: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 8,
  },
  appointmentDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rescheduleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.greyscale200,
    backgroundColor: colors.primaryWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  rescheduleButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    overflow: "hidden",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  modalForm: {
    maxHeight: 400,
  },
  inputContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.greyscale200,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.primaryWhite,
    color: colors.textPrimary,
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: colors.greyscale200,
    borderRadius: 6,
    padding: 12,
    backgroundColor: colors.greyscale100,
    marginTop: 12,
  },
  dateTimeButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  cancelModalButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.greyscale100,
    marginRight: 8,
  },
  cancelModalButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  dateTimeInputWrapper: {
    width: "100%",
    overflow: "hidden",
    marginTop: 8,
  },
  datePickerContainer: {
    // marginTop: 12,
    marginLeft: -8,
  },
  dateTimeInput: {
    borderWidth: 1,
    borderColor: colors.greyscale200,
    borderRadius: 6,
    padding: 12,
    backgroundColor: colors.greyscale100,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  dateTimeText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 20,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: colors.greyscale700,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.primaryWhite,
    fontSize: 14,
    fontWeight: "500",
  },
});

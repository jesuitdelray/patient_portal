import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Header } from "../components/Header";
import { useAppointments } from "../components/dashboard/AppointmentsContext";
import { useBrandingTheme } from "../lib/useBrandingTheme";
import { colors } from "../lib/colors";
import { AppointmentCard } from "../components/chat/AppointmentCard";
import { RescheduleAppointmentModal } from "../components/chat/RescheduleAppointmentModal";
import { API_BASE } from "../lib/api";
import Toast from "react-native-toast-message";

type FilterKey = "upcoming" | "past";

export default function AppointmentsScreen() {
  const { appointments, setAppointments } = useAppointments();
  const theme = useBrandingTheme();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<FilterKey>("upcoming");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(
    null
  );

  const sections = useMemo(() => {
    const now = new Date();
    // Don't show cancelled appointments
    const activeAppointments = (appointments || []).filter(
      (appointment: any) => !appointment.isCancelled
    );
    const upcoming = activeAppointments.filter((appointment: any) => {
      if (!appointment?.datetime) return false;
      return new Date(appointment.datetime).getTime() >= now.getTime();
    });
    const past = activeAppointments.filter((appointment: any) => {
      if (!appointment?.datetime) return false;
      return new Date(appointment.datetime).getTime() < now.getTime();
    });
    return {
      upcoming,
      past,
    };
  }, [appointments]);

  const filteredAppointments = sections[filter];

  const handleReschedule = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
  };

  const handleRescheduleSuccess = (updatedAppointment?: any) => {
    if (!updatedAppointment) return;
    setAppointments((prev) =>
      prev.map((appt) =>
        appt.id === updatedAppointment.id ? updatedAppointment : appt
      )
    );
  };

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
      
      Toast.show({
        type: "success",
        text1: "Appointment cancelled successfully",
      });
    } catch (error: any) {
      console.error("[Appointments] Cancel error:", error);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.pageBg }]}>
      <Header title="Appointments" />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.filterContainer}>
            {(
              [
                { key: "upcoming", label: "Upcoming" },
                { key: "past", label: "Past" },
              ] as Array<{ key: FilterKey; label: string }>
            ).map((item) => {
              const isActive = filter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.filterChip,
                    isActive && {
                      backgroundColor: colors.medicalBlue,
                      borderColor: colors.medicalBlue,
                    },
                  ]}
                  onPress={() => setFilter(item.key)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && { color: colors.primaryWhite },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.bookButton, { backgroundColor: colors.medicalBlue }]}
            onPress={() => navigation.navigate("PriceList")}
          >
            <Text style={styles.bookButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={
            filteredAppointments.length === 0 ? styles.emptyContent : undefined
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {filter === "upcoming"
                  ? "No upcoming appointments"
                  : "No past appointments"}
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                {filter === "upcoming"
                  ? "When your dentist schedules something new, it will appear here."
                  : "Once you’ve completed visits, they will be listed for quick reference."}
              </Text>
            </View>
          ) : (
            filteredAppointments.map((appointment: any) => (
              <View style={styles.cardWrapper} key={appointment.id}>
                <AppointmentCard
                  appointment={appointment}
                  onReschedule={
                    filter === "upcoming"
                      ? () => handleReschedule(appointment)
                      : undefined
                  }
                  onCancel={
                    filter === "upcoming"
                      ? () => handleCancel(appointment)
                      : undefined
                  }
                />
              </View>
            ))
          )}
        </ScrollView>
      </View>
      <RescheduleAppointmentModal
        visible={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onSuccess={handleRescheduleSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primaryWhite,
    borderWidth: 1,
    borderColor: colors.greyscale200,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryWhite,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.primaryWhite,
    borderWidth: 1,
    borderColor: colors.greyscale200,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  listContainer: {
    flex: 1,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: "center",
    textAlign: "center",
    maxWidth: 320,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptySubtitle: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  cardWrapper: {
    // marginBottom: 16,
  },
});

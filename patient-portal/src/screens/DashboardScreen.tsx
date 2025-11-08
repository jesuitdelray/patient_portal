import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AppointmentBanner } from "../components/dashboard/AppointmentBanner";
import { QuickStats } from "../components/dashboard/QuickStats";
import { UpcomingAppointments } from "../components/dashboard/UpcomingAppointments";
import { TreatmentOverview } from "../components/dashboard/TreatmentOverview";
import { ActiveDiscountCard } from "../components/dashboard/ActiveDiscountCard";
import { AppointmentsProvider } from "../components/dashboard/AppointmentsContext";
import { useAuth, usePatient } from "../lib/queries";
import { colors } from "../lib/colors";
import { Header } from "../components/Header";
import { useBrandingTheme } from "../lib/useBrandingTheme";

export default function DashboardScreen() {
  const { data: authData } = useAuth();
  const patientId = authData?.role === "patient" ? authData.userId : null;
  const { data: patientData } = usePatient(patientId);
  const navigation = useNavigation<any>();
  const theme = useBrandingTheme();

  const patientName = authData?.name || patientData?.patient?.name || "there";

  const handleBookAppointment = () => {
    navigation.navigate("PriceList");
  };

  return (
    <AppointmentsProvider>
      <SafeAreaView style={styles.container}>
        <Header title="Dashboard" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>
                Welcome back{patientName ? `, ${patientName}` : ""}
              </Text>
              <Text style={styles.subtitle}>
                Here's an overview of your dental health journey
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.bookButton, { backgroundColor: theme.primary }]}
              onPress={handleBookAppointment}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.bookButtonText, { color: theme.primaryContrast }]}
              >
                Book Appointment
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 16 }}>
            <AppointmentBanner />
          </View>

          <ActiveDiscountCard />

          <View style={{ marginTop: 24 }}>
            <QuickStats />
          </View>

          <View style={styles.grid}>
            <View style={{ marginBottom: 24 }}>
              <UpcomingAppointments />
            </View>
            <TreatmentOverview />
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppointmentsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryWhite,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 140,
  },
  bookButtonText: {
    color: colors.primaryWhite,
    fontSize: 14,
    fontWeight: "600",
  },
  grid: {
    marginTop: 24,
  },
});

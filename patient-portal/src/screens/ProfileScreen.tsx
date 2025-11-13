import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, usePatient } from "../lib/queries";
import { logout, API_BASE } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { colors } from "../lib/colors";
import { Header } from "../components/Header";
import { Loader } from "../components/Loader";

const screenWidth = Dimensions.get("window").width;

type TreatmentPlan = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

export default function ProfileScreen() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    location: "",
  });
  const [currentTreatments, setCurrentTreatments] = useState<TreatmentPlan[]>(
    []
  );
  const [completedTreatments, setCompletedTreatments] = useState<
    TreatmentPlan[]
  >([]);
  const [patientSince, setPatientSince] = useState<string>("");

  const [formData, setFormData] = useState(profileData);

  // Use TanStack Query hooks
  const { data: authData } = useAuth();
  const patientId = authData?.role === "patient" ? authData.userId : null;
  const { data: patientData, isLoading: isLoadingPatient } =
    usePatient(patientId);
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      // Clear all queries first to stop retries
      queryClient.clear();
      queryClient.cancelQueries();
      // Then logout (which will redirect)
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      // Force redirect even on error
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  };

  useEffect(() => {
    if (isLoadingPatient) {
      setLoading(true);
      return;
    }

    setLoading(false);

    const patient = patientData?.patient || {};
    const authName = authData?.name || "";
    const authEmail = authData?.email || "";

    // Set profile data
    const profile = {
      name: patient.name || authName || "Patient",
      email: patient.email || authEmail || "",
      phone: patient.phone || "",
      birthDate: patient.dateOfBirth
        ? new Date(patient.dateOfBirth).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "",
      location: patient.address || "",
    };
    setProfileData(profile);
    setFormData(profile);

    // Set patient since date
    if (patient.createdAt) {
      const year = new Date(patient.createdAt).getFullYear();
      setPatientSince(`Patient since ${year}`);
    }

    // Load treatment plans
    const plans: TreatmentPlan[] = patientData?.plans || [];
    setCurrentTreatments(
      plans.filter((p: TreatmentPlan) => p.status !== "completed")
    );
    setCompletedTreatments(
      plans
        .filter((p: TreatmentPlan) => p.status === "completed")
        .sort(
          (a: TreatmentPlan, b: TreatmentPlan) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    );
  }, [patientData, isLoadingPatient, authData]);

  useEffect(() => {
    if (isEditOpen) {
      setIsModalVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsModalVisible(false);
      });
    }
  }, [isEditOpen, slideAnim]);

  const handleSaveProfile = () => {
    if (isSaving) return;

    setIsSaving(true);
    setTimeout(() => {
      setProfileData(formData);
      setIsEditOpen(false);
      setIsSaving(false);
    }, 1000);
  };

  const handleCancelEdit = () => {
    setFormData(profileData);
    setIsEditOpen(false);
  };

  const handleOpenEdit = () => {
    setFormData(profileData);
    setIsEditOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loader />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Profile" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.grid}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={{ fontSize: 20, color: "#007AFF" }}>👤</Text>
              <Text style={styles.cardTitle}>Personal Information</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(profileData.name)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.profileName}>
                    {profileData.name || "Loading..."}
                  </Text>
                  <Text style={styles.profileSubtext}>
                    {patientSince || ""}
                  </Text>
                </View>
              </View>

              <View style={styles.infoList}>
                {profileData.email ? (
                  <View style={styles.infoRow}>
                    <Text>✉️</Text>
                    <Text style={styles.infoText}>{profileData.email}</Text>
                  </View>
                ) : null}
                {profileData.phone ? (
                  <View style={styles.infoRow}>
                    <Text>📞</Text>
                    <Text style={styles.infoText}>{profileData.phone}</Text>
                  </View>
                ) : null}
                {profileData.birthDate ? (
                  <View style={styles.infoRow}>
                    <Text>📅</Text>
                    <Text style={styles.infoText}>
                      Date of Birth: {profileData.birthDate}
                    </Text>
                  </View>
                ) : null}
                {profileData.location ? (
                  <View style={styles.infoRow}>
                    <Text>📍</Text>
                    <Text style={styles.infoText}>{profileData.location}</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.editButton}
                onPress={handleOpenEdit}
              >
                <Text style={{ color: "#fff" }}>✏️</Text>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Medical History</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>Current Treatments</Text>
                {currentTreatments.length === 0 ? (
                  <Text style={styles.historyItem}>No active treatments</Text>
                ) : (
                  <View style={styles.historyList}>
                    {currentTreatments.map((plan) => (
                      <Text key={plan.id} style={styles.historyItem}>
                        • {plan.title} ({plan.status})
                      </Text>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>Completed Treatments</Text>
                {completedTreatments.length === 0 ? (
                  <Text style={styles.historyItem}>
                    No completed treatments
                  </Text>
                ) : (
                  <View style={styles.historyList}>
                    {completedTreatments.map((plan) => {
                      const date = new Date(plan.createdAt);
                      const month = date.toLocaleDateString("en-US", {
                        month: "short",
                      });
                      const year = date.getFullYear();
                      return (
                        <Text key={plan.id} style={styles.historyItem}>
                          • {plan.title} ({month} {year})
                        </Text>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Logout Button */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <SafeAreaView style={styles.modalContentInner}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={handleCancelEdit}
                >
                  <Text style={{ fontSize: 24 }}>✖️</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <View style={{ width: 24 }} />
              </View>
              <Text style={styles.modalDescription}>
                Make changes to your profile information here.
              </Text>

              <ScrollView style={styles.modalForm}>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                    placeholder="Name"
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.email}
                    onChangeText={(text) =>
                      setFormData({ ...formData, email: text })
                    }
                    placeholder="Email"
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Phone</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.phone}
                    onChangeText={(text) =>
                      setFormData({ ...formData, phone: text })
                    }
                    placeholder="Phone"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Birth Date</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.birthDate}
                    onChangeText={(text) =>
                      setFormData({ ...formData, birthDate: text })
                    }
                    placeholder="Birth Date"
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Location</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.location}
                    onChangeText={(text) =>
                      setFormData({ ...formData, location: text })
                    }
                    placeholder="Location"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    isSaving && styles.disabledButton,
                  ]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  ) : (
                    <Text style={styles.saveButtonText}>Save changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
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
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  cardContent: {
    gap: 16,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  profileSubtext: {
    fontSize: 14,
    color: "#666",
  },
  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#000",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  historySection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  historyList: {
    gap: 4,
  },
  historyItem: {
    fontSize: 14,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
  },
  modalContent: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContentInner: {
    flex: 1,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  modalDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  modalForm: {
    maxHeight: 400,
  },
  formRow: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 20,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  cancelButtonText: {
    color: "#000",
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

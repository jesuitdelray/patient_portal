import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Header } from "../components/Header";
import { Loader } from "../components/Loader";
import { colors } from "../lib/colors";
import { API_BASE, fetchWithAuth } from "../lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { useBrandingTheme } from "../lib/useBrandingTheme";
import { useAuth } from "../lib/queries";

type PriceItem = {
  id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  duration?: number;
};

const WEB_DATE_INPUT_FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif";

export default function PriceListScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newDateTime, setNewDateTime] = useState("");
  const queryClient = useQueryClient();
  const theme = useBrandingTheme();
  const { data: authData } = useAuth();
  const patientId =
    authData?.role === "patient" && authData?.userId
      ? authData.userId
      : undefined;

  const today = new Date();
  // Minimum date is tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const tomorrowString = tomorrow.toISOString().slice(0, 16);

  // Fetch all categories once (never reload)
  const { data: categoriesData } = useQuery({
    queryKey: ["price-list-categories"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/price-list`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch price list");
      return res.json();
    },
    staleTime: Infinity, // Never refetch categories
    cacheTime: Infinity,
  });

  // Fetch filtered price list
  const { data, isLoading } = useQuery({
    queryKey: ["price-list", selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`${API_BASE}/price-list?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch price list");
      return res.json();
    },
    // Keep previous data while loading new data
    keepPreviousData: true,
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      datetime: string;
      type: string;
      procedureIds?: string[];
    }) => {
      console.log("[PriceList] Starting appointment creation...");
      console.log("[PriceList] Data to send:", {
        title: data.title,
        datetime: data.datetime,
        type: data.type,
      });
      console.log("[PriceList] API_BASE:", API_BASE);
      console.log("[PriceList] Full URL:", `${API_BASE}/appointments`);

      try {
        const requestBody = {
          title: data.title,
          datetime: data.datetime,
          type: data.type,
          ...(patientId ? { patientId } : {}),
          ...(data.procedureIds && data.procedureIds.length > 0
            ? { procedureIds: data.procedureIds }
            : {}),
        };
        console.log("[PriceList] Request body:", JSON.stringify(requestBody));

        const res = await fetchWithAuth(`${API_BASE}/appointments/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        console.log("[PriceList] Response status:", res.status);
        console.log("[PriceList] Response statusText:", res.statusText);
        console.log(
          "[PriceList] Response headers:",
          Object.fromEntries(res.headers.entries())
        );

        const text = await res.text();
        console.log("[PriceList] Response text (raw):", text);
        console.log("[PriceList] Response text length:", text.length);

        if (!res.ok) {
          console.error("[PriceList] Request failed with status:", res.status);
          try {
            const error = JSON.parse(text);
            console.error("[PriceList] Parsed error:", error);
            throw new Error(error.error || "Failed to create appointment");
          } catch (e) {
            console.error("[PriceList] Error parsing error response:", e);
            console.error("[PriceList] Raw error text:", text);
            throw new Error(text || "Failed to create appointment");
          }
        }

        if (!text) {
          console.error("[PriceList] Empty response from server");
          throw new Error("Empty response from server");
        }

        try {
          const parsed = JSON.parse(text);
          console.log("[PriceList] Successfully parsed response:", parsed);
          return parsed;
        } catch (e) {
          console.warn("[PriceList] Response is not JSON, but status is OK");
          console.warn("[PriceList] Response text:", text);
          // If response is not JSON but status is OK, consider it success
          return { success: true };
        }
      } catch (error: any) {
        console.error("[PriceList] Error in mutationFn:", error);
        console.error("[PriceList] Error message:", error.message);
        console.error("[PriceList] Error stack:", error.stack);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowAppointmentModal(false);
      setSelectedProcedures([]);
      setNewDateTime("");
      setSelectedDate(new Date());
      Toast.show({
        type: "success",
        text1: "Appointment created",
        text2: "Your appointment request has been submitted",
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Failed to create appointment",
        text2: error.message || "Please try again",
      });
    },
  });

  const toggleProcedureSelection = (procedureId: string) => {
    setSelectedProcedures((prev) =>
      prev.includes(procedureId)
        ? prev.filter((id) => id !== procedureId)
        : [...prev, procedureId]
    );
  };

  const handleBookAppointment = () => {
    if (selectedProcedures.length === 0) {
      Toast.show({
        type: "error",
        text1: "Please select at least one procedure",
      });
      return;
    }
    const initialDate = new Date();
    initialDate.setDate(initialDate.getDate() + 1);
    initialDate.setHours(10, 0, 0, 0);
    setSelectedDate(initialDate);
    setNewDateTime(initialDate.toISOString().slice(0, 16));
    setShowAppointmentModal(true);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (Platform.OS === "ios") {
      if (event.type === "set" && date) {
        setShowDatePicker(false);
      }
    }
    if (date) {
      setSelectedDate(date);
      setNewDateTime(date.toISOString().slice(0, 16));
    }
  };

  const handleCreateAppointment = () => {
    console.log("[PriceList] handleCreateAppointment called");
    console.log("[PriceList] selectedProcedures:", selectedProcedures);
    console.log("[PriceList] newDateTime:", newDateTime);

    if (selectedProcedures.length === 0 || !newDateTime) {
      console.error("[PriceList] Missing required data:", {
        hasProcedures: selectedProcedures.length > 0,
        hasDateTime: !!newDateTime,
      });
      Toast.show({
        type: "error",
        text1: "Please select procedures and date/time",
      });
      return;
    }

    // Ensure datetime is in ISO format
    let datetimeToSend = newDateTime;
    console.log("[PriceList] Initial datetimeToSend:", datetimeToSend);

    if (!datetimeToSend.includes("T")) {
      // If it's just a date, add time
      datetimeToSend = `${datetimeToSend}T00:00:00`;
      console.log("[PriceList] Added time, datetimeToSend:", datetimeToSend);
    }

    // Convert to ISO string if needed
    try {
      const dateObj = new Date(datetimeToSend);
      console.log("[PriceList] Created Date object:", dateObj);
      console.log(
        "[PriceList] Date object isValid:",
        !isNaN(dateObj.getTime())
      );

      if (isNaN(dateObj.getTime())) {
        console.error("[PriceList] Invalid date object");
        Toast.show({
          type: "error",
          text1: "Invalid date or time",
        });
        return;
      }
      datetimeToSend = dateObj.toISOString();
      console.log("[PriceList] Final ISO datetimeToSend:", datetimeToSend);
    } catch (e) {
      console.error("[PriceList] Error converting date:", e);
      Toast.show({
        type: "error",
        text1: "Invalid date format",
      });
      return;
    }

    const selectedItems = filteredList.filter((item: PriceItem) =>
      selectedProcedures.includes(item.id)
    );
    const titles = selectedItems.map((item: PriceItem) => item.title);
    const totalPrice = selectedItems.reduce(
      (sum: number, item: PriceItem) => sum + item.price,
      0
    );

    const mutationData = {
      title:
        selectedItems.length === 1
          ? selectedItems[0].title
          : `${selectedItems.length} Procedures`,
      datetime: datetimeToSend,
      type: selectedItems[0]?.category || "General",
      procedureIds: selectedProcedures,
    };

    console.log("[PriceList] Calling mutation with data:", mutationData);
    createAppointmentMutation.mutate(mutationData);
  };

  // Use categories from the separate query (never reloads)
  const categories = categoriesData?.categories || [];
  // Use filtered price list from the filtered query
  const priceList = data?.priceList || [];
  const grouped = data?.grouped || {};

  const filteredList = selectedCategory
    ? grouped[selectedCategory] || []
    : priceList;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Price List" />
      <View style={styles.content}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search procedures..."
            placeholderTextColor={colors.greyscale400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Filter - Always show all filters, never reload */}
        <View style={styles.categoryFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContainer}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === null && {
                  backgroundColor: theme.brandSoft,
                  borderColor: theme.borderSubtle,
                },
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === null && { color: colors.primaryWhite },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.length > 0
              ? categories.map((cat: string) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat && {
                        backgroundColor: theme.brandSoft,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === cat && {
                          color: colors.primaryWhite,
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))
              : // Show placeholder only on initial load
                !categoriesData && (
                  <View
                    style={[styles.categoryChip, styles.categoryChipDisabled]}
                  >
                    <Text style={styles.categoryChipText}>Loading...</Text>
                  </View>
                )}
          </ScrollView>
        </View>

        {/* Price List */}
        <ScrollView
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.centerContainer}>
              <Loader />
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No procedures found</Text>
            </View>
          ) : (
            filteredList.map((item: PriceItem) => {
              const isSelected = selectedProcedures.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.priceItem,
                    {
                      borderColor: isSelected
                        ? colors.medicalBlue
                        : theme.borderSubtle,
                      shadowColor: theme.brand,
                      backgroundColor: isSelected
                        ? "rgba(15, 111, 255, 0.05)"
                        : theme.surface,
                    },
                  ]}
                  onPress={() => toggleProcedureSelection(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.checkboxContainer}>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected
                            ? colors.medicalBlue
                            : colors.greyscale300,
                          backgroundColor: isSelected
                            ? colors.medicalBlue
                            : colors.primaryWhite,
                        },
                      ]}
                    >
                      {isSelected && (
                        <Text style={styles.checkboxCheck}>✓</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.priceItemContent}>
                    <View style={styles.priceItemHeader}>
                      <Text
                        style={[
                          styles.priceItemTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          styles.priceItemPrice,
                          { color: colors.textPrimary },
                        ]}
                      >
                        ${item.price.toFixed(2)}
                      </Text>
                    </View>
                    {item.description && (
                      <Text style={styles.priceItemDescription}>
                        {item.description}
                      </Text>
                    )}
                    <View style={styles.priceItemFooter}>
                      {item.duration && (
                        <Text
                          style={[
                            styles.priceItemDuration,
                            { color: colors.textSecondary },
                          ]}
                        >
                          ⏱ {item.duration} min
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.priceItemCategory,
                          {
                            backgroundColor: theme.brandSoft,
                            color: colors.primaryWhite,
                          },
                        ]}
                      >
                        {item.category || "General"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Book Appointment Button */}
        {selectedProcedures.length > 0 && (
          <View style={styles.bookButtonContainer}>
            <TouchableOpacity
              style={[
                styles.bookButton,
                { backgroundColor: colors.medicalBlue },
              ]}
              onPress={handleBookAppointment}
            >
              <Text style={styles.bookButtonText}>
                Book Appointment ({selectedProcedures.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Appointment Modal */}
      <Modal
        visible={showAppointmentModal}
        animationType="none"
        transparent={true}
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                borderColor: theme.borderSubtle,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Book Appointment
            </Text>
            {selectedProcedures.length > 0 && (
              <>
                <View style={styles.modalProceduresList}>
                  <Text
                    style={[
                      styles.modalProceduresLabel,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Selected Procedures ({selectedProcedures.length}):
                  </Text>
                  {filteredList
                    .filter((item: PriceItem) =>
                      selectedProcedures.includes(item.id)
                    )
                    .map((item: PriceItem) => (
                      <View
                        key={item.id}
                        style={[
                          styles.modalProcedureInfo,
                          {
                            borderColor: theme.borderSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalProcedureTitle,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[
                            styles.modalProcedurePrice,
                            { color: colors.textPrimary },
                          ]}
                        >
                          ${item.price.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                </View>

                <View style={styles.modalForm}>
                  <Text
                    style={[styles.modalLabel, { color: theme.textPrimary }]}
                  >
                    Date & Time
                  </Text>
                  {Platform.OS === "web" ? (
                    <View style={styles.dateTimeInputWrapper}>
                      <input
                        type="datetime-local"
                        value={newDateTime}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewDateTime(value);
                          if (value) {
                            setSelectedDate(new Date(value));
                          }
                        }}
                        min={tomorrowString}
                        style={{
                          width: "100%",
                          padding: "12px",
                          fontSize: "14px",
                          border: `1px solid ${theme.borderSubtle}`,
                          borderRadius: "6px",
                          backgroundColor: colors.primaryWhite,
                          fontFamily: WEB_DATE_INPUT_FONT,
                          fontWeight: 500,
                          boxSizing: "border-box",
                          maxWidth: "100%",
                          color: theme.textPrimary,
                          outline: "none",
                          cursor: "pointer",
                          marginTop: 8,
                        }}
                      />
                    </View>
                  ) : (
                    <>
                      {/* <TouchableOpacity
                        style={[
                          styles.dateTimeInput,
                          {
                            borderColor: theme.borderSubtle,
                            backgroundColor: colors.primaryWhite,
                          },
                        ]}
                        onPress={() => setShowDatePicker(!showDatePicker)}
                      >
                        <Text
                          style={[
                            styles.dateTimeText,
                            { color: theme.textPrimary },
                          ]}
                        >
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
                          minimumDate={tomorrow}
                        />
                      </View>
                      {/* )} */}
                    </>
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalButtonCancel,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                    onPress={() => setShowAppointmentModal(false)}
                  >
                    <Text
                      style={[
                        styles.modalButtonCancelText,
                        { color: theme.brandSoftText },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalButtonConfirm,
                      {
                        backgroundColor: theme.brand,
                        borderColor: theme.brand,
                      },
                      (createAppointmentMutation.isPending || !newDateTime) && [
                        styles.modalButtonDisabled,
                        {
                          backgroundColor: theme.brandSoft,
                          borderColor: theme.borderSubtle,
                        },
                      ],
                    ]}
                    onPress={handleCreateAppointment}
                    disabled={
                      createAppointmentMutation.isPending || !newDateTime
                    }
                  >
                    <Text
                      style={[
                        styles.modalButtonConfirmText,
                        { color: theme.brandText },
                      ]}
                    >
                      {createAppointmentMutation.isPending
                        ? "Booking..."
                        : "Book Appointment"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.greyscale200,
  },
  categoryFilterContainer: {
    marginBottom: 16,
  },
  categoryScroll: {
    marginBottom: 0,
  },
  categoryContainer: {
    paddingRight: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.primaryWhite,
    borderWidth: 1,
    borderColor: colors.greyscale200,
    minWidth: 80,
    alignItems: "center",
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: colors.primaryWhite,
  },
  categoryChipDisabled: {
    opacity: 0.5,
  },
  listContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.greyscale400,
  },
  emptyText: {
    fontSize: 16,
    color: colors.greyscale400,
  },
  priceItem: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.greyscale200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  priceItemContent: {
    flex: 1,
  },
  priceItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  priceItemTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  priceItemPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  priceItemDescription: {
    fontSize: 14,
    color: colors.greyscale600,
    marginBottom: 8,
    lineHeight: 20,
  },
  priceItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceItemDuration: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceItemCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.greyscale100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCheck: {
    color: colors.primaryWhite,
    fontSize: 16,
    fontWeight: "bold",
  },
  bookButtonContainer: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  bookButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primaryWhite,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    ...(Platform.OS === "web" && {
      maxHeight: "80vh",
      overflow: "auto",
    }),
    borderWidth: 1,
    borderColor: colors.greyscale200,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 24,
  },
  modalProceduresList: {
    // marginBottom: 20,
  },
  modalProceduresLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  modalProcedureInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.greyscale200,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalProcedureTitle: {
    fontSize: 18,
    fontWeight: "600",
    // marginBottom: 8,
  },
  modalProcedurePrice: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalForm: {
    // marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  dateTimeInputWrapper: {
    marginBottom: 16,
  },
  dateTimeInput: {
    backgroundColor: colors.greyscale100,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.greyscale200,
    marginTop: 8,
  },
  dateTimeText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  datePickerContainer: {
    // marginTop: 12,
    marginLeft: -8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  modalButtonCancel: {
    backgroundColor: colors.primaryWhite,
    borderColor: colors.greyscale200,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primaryWhite,
  },
});

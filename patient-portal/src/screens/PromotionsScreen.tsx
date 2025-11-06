import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Header } from "../components/Header";
import { colors } from "../lib/colors";
import { storage } from "../lib/storage";

const promotions = [
  {
    id: 1,
    title: "20% Off Teeth Whitening",
    description:
      "Get a brighter smile with our professional teeth whitening service. Limited time offer for existing patients.",
    discount: "20% OFF",
    validUntil: "Dec 31, 2025",
    category: "Cosmetic",
  },
  {
    id: 2,
    title: "Free Dental Checkup",
    description:
      "Book your regular checkup this month and get a complimentary oral health assessment worth $150.",
    discount: "FREE",
    validUntil: "Nov 30, 2025",
    category: "Checkup",
  },
  {
    id: 3,
    title: "Family Package - Save $500",
    description:
      "Bring your family for comprehensive dental care. Special package includes checkups, cleaning, and X-rays for up to 4 members.",
    discount: "$500 OFF",
    validUntil: "Jan 15, 2026",
    category: "Package",
  },
];

export default function PromotionsScreen() {
  const [claimedOffers, setClaimedOffers] = useState<number[]>([]);
  const [loadingOffers, setLoadingOffers] = useState<number[]>([]);
  const [activeDiscount, setActiveDiscount] = useState<number | null>(null);

  // Load claimed offers and active discount from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await storage.getItem("claimedOffers");
        if (saved) {
          const parsed = JSON.parse(saved);
          setClaimedOffers(parsed);
        }
        const active = await storage.getItem("activeDiscount");
        if (active) {
          setActiveDiscount(parseInt(active));
        }
      } catch (e) {
        console.error("Error loading promotions:", e);
      }
    };
    loadData();
  }, []);

  const handleClaimOffer = async (offerId: number, offerTitle: string) => {
    if (claimedOffers.includes(offerId)) {
      return;
    }

    if (loadingOffers.includes(offerId)) {
      return;
    }

    setLoadingOffers((prev) => [...prev, offerId]);
           setTimeout(async () => {
             const newClaimed = [...claimedOffers, offerId];
             setClaimedOffers(newClaimed);
             setLoadingOffers((prev) => prev.filter((id) => id !== offerId));
             
             // Save to storage
             try {
               await storage.setItem("claimedOffers", JSON.stringify(newClaimed));
               // Trigger custom event for same-tab updates (ActiveDiscountCard)
               if (typeof window !== "undefined") {
                 window.dispatchEvent(new CustomEvent("claimedOffersUpdated", {
                   detail: { newValue: JSON.stringify(newClaimed) },
                 }));
               }
             } catch (e) {
               console.error("Error saving promotions:", e);
             }
           }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Promotions" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >

        <View style={styles.grid}>
          {promotions.map((promo) => (
            <View key={promo.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeContainer}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {promo.category}
                    </Text>
                  </View>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>
                      {promo.discount}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{promo.title}</Text>
                <Text style={styles.cardDescription}>{promo.description}</Text>
                <View style={styles.validUntilRow}>
                  <Feather name="clock" size={14} color="#666" />
                  <Text style={styles.validUntilText}>
                    Valid until {promo.validUntil}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.claimButton,
                    claimedOffers.includes(promo.id) &&
                      styles.claimButtonClaimed,
                    loadingOffers.includes(promo.id) &&
                      styles.claimButtonLoading,
                  ]}
                  onPress={() => handleClaimOffer(promo.id, promo.title)}
                  disabled={
                    claimedOffers.includes(promo.id) ||
                    loadingOffers.includes(promo.id)
                  }
                >
                  {loadingOffers.includes(promo.id) ? (
                    <Text style={styles.claimButtonText}>Claiming...</Text>
                  ) : claimedOffers.includes(promo.id) ? (
                    <>
                      <Feather name="check-circle" size={16} color="#666" />
                      <Text style={styles.claimButtonTextClaimed}>Claimed</Text>
                    </>
                  ) : (
                    <Text style={styles.claimButtonText}>Claim Offer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  badgeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  discountBadge: {
    backgroundColor: colors.medicalBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  cardContent: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  validUntilRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  validUntilText: {
    fontSize: 12,
    color: "#666",
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.medicalBlue,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  claimButtonClaimed: {
    backgroundColor: "#F5F5F5",
  },
  claimButtonLoading: {
    opacity: 0.7,
  },
  claimButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  claimButtonTextClaimed: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
});

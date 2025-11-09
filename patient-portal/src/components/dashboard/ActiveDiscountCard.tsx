import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { colors } from "../../lib/colors";
import { storage } from "../../lib/storage";
import { useBrandingTheme } from "../../lib/useBrandingTheme";

const promotions = [
  {
    id: 1,
    title: "20% Off Teeth Whitening",
    discount: "20% OFF",
    category: "Cosmetic",
  },
  {
    id: 2,
    title: "Free Dental Checkup",
    discount: "FREE",
    category: "Checkup",
  },
  {
    id: 3,
    title: "Family Package - Save $500",
    discount: "$500 OFF",
    category: "Package",
  },
];

export function ActiveDiscountCard() {
  const [claimedOffers, setClaimedOffers] = useState<number[]>([]);
  const theme = useBrandingTheme();

  useEffect(() => {
    const loadDiscounts = async () => {
      try {
        const saved = await storage.getItem("claimedOffers");
        if (saved) {
          const parsed = JSON.parse(saved);
          setClaimedOffers(parsed);
        }
      } catch (e) {
        console.error("Error loading discounts:", e);
      }
    };
    loadDiscounts();
    
    // Listen for custom events (when discount is claimed)
    const handleClaimedOffersUpdated = (e: any) => {
      try {
        if (e.detail?.newValue) {
          const parsed = JSON.parse(e.detail.newValue);
          setClaimedOffers(parsed);
        } else {
          // Fallback: reload from storage
          loadDiscounts();
        }
      } catch (err) {
        console.error("Error handling claimedOffersUpdated event:", err);
        // Fallback: reload from storage
        loadDiscounts();
      }
    };
    
    // Use custom event listener for cross-platform compatibility
    // Only add listener on web platform where window.addEventListener is available
    if (Platform.OS === "web" && typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("claimedOffersUpdated", handleClaimedOffersUpdated);
      return () => {
        if (window.removeEventListener) {
          window.removeEventListener("claimedOffersUpdated", handleClaimedOffersUpdated);
        }
      };
    }
  }, []);

  // Show all claimed discounts
  const activePromotions = promotions.filter((p) => claimedOffers.includes(p.id));

  if (activePromotions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {activePromotions.map((promotion) => (
        <View
          key={promotion.id}
          style={[
            styles.card,
            {
              backgroundColor: theme.promoBg,
              shadowColor: theme.brand,
            },
          ]}
        >
          <View style={styles.content}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.brandSoft },
              ]}
            >
              <Text style={styles.icon}>🏷️</Text>
            </View>
            <View style={styles.textContainer}>
              <Text
                style={[styles.label, { color: theme.promoText }]}
              >
                Active Discount
              </Text>
              <Text
                style={[styles.title, { color: theme.promoText }]}
              >
                {promotion.title}
              </Text>
              <Text
                style={[styles.discount, { color: theme.promoText }]}
              >
                {promotion.discount}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.brandSoft },
              ]}
            >
              <Text
                style={[styles.badgeText, { color: theme.brandSoftText }]}
              >
                {promotion.category}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.medicalBlue,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.medicalBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
    fontWeight: "500",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primaryWhite,
    marginBottom: 4,
  },
  discount: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primaryWhite,
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    color: colors.primaryWhite,
    fontWeight: "600",
  },
});


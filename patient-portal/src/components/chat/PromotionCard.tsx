import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../lib/colors";

type Props = {
  promotion: any;
};

export function PromotionCard({ promotion }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {promotion.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{promotion.category}</Text>
          </View>
        )}
        {promotion.discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{promotion.discount}</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{promotion.title || "Promotion"}</Text>

      {promotion.description && (
        <Text style={styles.description}>{promotion.description}</Text>
      )}

      {promotion.validUntil && (
        <View style={styles.validityRow}>
          <Text style={styles.validityLabel}>⏰ Valid until:</Text>
          <Text style={styles.validityValue}>{promotion.validUntil}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: colors.greyscale200,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  discountBadge: {
    backgroundColor: colors.medicalBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 12,
    color: colors.primaryWhite,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  validityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  validityLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  validityValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "500",
  },
});


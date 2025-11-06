"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

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

export function PatientDiscountBadge({ patientId }: { patientId: string }) {
  const [activeDiscount, setActiveDiscount] = useState<number | null>(null);

  useEffect(() => {
    // Try to get discount from localStorage (if patient is viewing in same browser)
    // This is a temporary solution - in production, this should come from API/database
    const checkDiscount = () => {
      try {
        const active = localStorage.getItem("activeDiscount");
        if (active) {
          setActiveDiscount(parseInt(active));
        }
      } catch (e) {
        // localStorage not available or cross-origin
      }
    };
    checkDiscount();
    
    // Also try to get from API (when implemented)
    // fetch(`${API_BASE}/patients/${patientId}/discount`)
    //   .then(res => res.json())
    //   .then(data => {
    //     if (data.activeDiscount) {
    //       setActiveDiscount(data.activeDiscount);
    //     }
    //   })
    //   .catch(() => {});
  }, [patientId]);

  if (!activeDiscount) {
    return null;
  }

  const promotion = promotions.find((p) => p.id === activeDiscount);
  if (!promotion) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
      <span>🏷️</span>
      <span>{promotion.discount}</span>
      <span className="text-xs opacity-75">- {promotion.title}</span>
    </div>
  );
}


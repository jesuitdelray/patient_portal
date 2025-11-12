import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Estimated height of BottomNavigation component:
 * - paddingTop: 8px
 * - content height (icons + text): ~40-50px (with scale transform can be more)
 * - paddingBottom: 4px
 * - SafeArea bottom padding (iOS): ~34px on devices with notch, 0 on older devices
 * 
 * Base height: ~52px (paddingTop 8 + content ~40 + paddingBottom 4)
 * Total: ~52-86px depending on device (iOS with notch: ~86px, Android: ~52px)
 */
export const BOTTOM_NAV_BASE_HEIGHT = 52; // Base height: paddingTop 8 + content ~40 + paddingBottom 4

/**
 * Hook to get the actual bottom navigation height including SafeArea padding
 * Use this in screens that need to account for BottomNavigation height
 * Returns 0 on web since BottomNavigation is not shown there
 */
export function useBottomNavHeight(): number {
  const insets = useSafeAreaInsets();
  
  // Only add SafeArea padding on mobile (not web)
  if (Platform.OS === "web") {
    return 0; // BottomNavigation is not shown on web
  }
  
  // Base height + SafeArea bottom padding
  // Adding some extra padding (8px) to ensure content is not cut off
  return BOTTOM_NAV_BASE_HEIGHT + insets.bottom + 8;
}


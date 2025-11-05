import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<any>();

export function navigate(routeName: string, params?: Record<string, any>) {
  try {
    if (navigationRef.isReady()) {
      // Check if the route exists in the current navigator
      const currentRoute = navigationRef.getCurrentRoute();
      const state = navigationRef.getRootState();
      
      // Check if route exists in navigator state
      const routeExists = state?.routes?.some((route: any) => route.name === routeName);
      
      if (routeExists) {
        console.log("[navigate] Navigating to:", routeName);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigationRef.navigate(routeName as any, params as any);
      } else {
        console.warn("[navigate] Route not found in navigator:", routeName, "Available routes:", state?.routes?.map((r: any) => r.name));
      }
    } else {
      console.warn("[navigate] Navigator not ready, cannot navigate to:", routeName);
    }
  } catch (e) {
    console.error("[navigate] Navigation error:", e, "Route:", routeName);
  }
}

import { Platform } from "react-native";

// Universal storage interface for web and native
// Uses localStorage on web, AsyncStorage on native
let AsyncStorage: any = null;

// Lazy load AsyncStorage for native platforms
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    AsyncStorage = require("@react-native-async-storage/async-storage").default;
  } catch (e) {
    console.warn("[storage] AsyncStorage not available, falling back to in-memory storage");
  }
}

// In-memory fallback storage
const memoryStorage: Record<string, string> = {};

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (e) {
        console.error("[storage] Error getting item from localStorage:", e);
      }
      return null;
    } else {
      // Native: use AsyncStorage
      if (AsyncStorage) {
        try {
          return await AsyncStorage.getItem(key);
        } catch (e) {
          console.error("[storage] Error getting item from AsyncStorage:", e);
          return memoryStorage[key] || null;
        }
      } else {
        // Fallback to memory
        return memoryStorage[key] || null;
      }
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (e) {
        console.error("[storage] Error setting item in localStorage:", e);
      }
    } else {
      // Native: use AsyncStorage
      if (AsyncStorage) {
        try {
          await AsyncStorage.setItem(key, value);
        } catch (e) {
          console.error("[storage] Error setting item in AsyncStorage:", e);
          // Fallback to memory
          memoryStorage[key] = value;
        }
      } else {
        // Fallback to memory
        memoryStorage[key] = value;
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {
        console.error("[storage] Error removing item from localStorage:", e);
      }
    } else {
      // Native: use AsyncStorage
      if (AsyncStorage) {
        try {
          await AsyncStorage.removeItem(key);
        } catch (e) {
          console.error("[storage] Error removing item from AsyncStorage:", e);
          delete memoryStorage[key];
        }
      } else {
        delete memoryStorage[key];
      }
    }
  },
};

// Synchronous versions for web (for backwards compatibility)
export const storageSync = {
  getItem(key: string): string | null {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (e) {
        console.error("[storageSync] Error getting item:", e);
      }
      return null;
    } else {
      // Native: return from memory (not ideal, but for sync compatibility)
      return memoryStorage[key] || null;
    }
  },

  setItem(key: string, value: string): void {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (e) {
        console.error("[storageSync] Error setting item:", e);
      }
    } else {
      // Native: store in memory and trigger async storage
      memoryStorage[key] = value;
      if (AsyncStorage) {
        AsyncStorage.setItem(key, value).catch((err: any) => {
          console.error("[storageSync] Error syncing to AsyncStorage:", err);
        });
      }
    }
  },

  removeItem(key: string): void {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {
        console.error("[storageSync] Error removing item:", e);
      }
    } else {
      delete memoryStorage[key];
      if (AsyncStorage) {
        AsyncStorage.removeItem(key).catch((err: any) => {
          console.error("[storageSync] Error removing from AsyncStorage:", err);
        });
      }
    }
  },
};


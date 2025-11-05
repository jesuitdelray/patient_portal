import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";

// Clipboard API - use different methods for web vs native
let clipboardAPI: {
  setString: (text: string) => void | Promise<void>;
} | null = null;

if (Platform.OS === "web") {
  // Web: use navigator.clipboard or fallback
  clipboardAPI = {
    setString: async (text: string) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    },
  };
} else {
  // Native: try to use @react-native-clipboard/clipboard or fallback
  try {
    const Clipboard = require("@react-native-clipboard/clipboard").default;
    clipboardAPI = {
      setString: (text: string) => Clipboard.setString(text),
    };
  } catch {
    // Fallback to deprecated Clipboard (if available)
    try {
      const { Clipboard } = require("react-native");
      clipboardAPI = {
        setString: (text: string) => Clipboard.setString(text),
      };
    } catch {
      clipboardAPI = null;
    }
  }
}

interface LogEntry {
  id: string;
  level: "log" | "warn" | "error";
  message: string;
  timestamp: Date;
}

const logs: LogEntry[] = [];
const listeners: Set<() => void> = new Set();
let isProcessingLog = false; // Prevent infinite loops

function addLog(level: "log" | "warn" | "error", ...args: any[]) {
  // Prevent infinite loops - if we're already processing a log, skip
  if (isProcessingLog) {
    return;
  }

  isProcessingLog = true;

  try {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
      )
      .join(" ");

    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      level,
      message,
      timestamp: new Date(),
    };

    logs.push(entry);

    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.shift();
    }

    // Also log to console FIRST (but avoid infinite loop - use original methods)
    // This must happen BEFORE notifying listeners to prevent recursion
    const originalMethods = (globalThis as any).__originalConsoleMethods;
    if (originalMethods) {
      if (level === "error") {
        originalMethods.error(...args);
      } else if (level === "warn") {
        originalMethods.warn(...args);
      } else {
        originalMethods.log(...args);
      }
    }

    // Notify listeners AFTER console logging (use setTimeout to break call stack)
    setTimeout(() => {
      listeners.forEach((listener) => {
        try {
          listener();
        } catch (e) {
          // Ignore errors in listeners
        }
      });
    }, 0);
  } finally {
    // Reset flag after a small delay to allow async operations
    setTimeout(() => {
      isProcessingLog = false;
    }, 10);
  }
}

// Override console methods IMMEDIATELY when module loads
// This ensures we capture all logs, even from early code execution
(function setupConsoleInterception() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Store originals globally to avoid infinite loops
  (globalThis as any).__originalConsoleMethods = {
    log: originalLog,
    warn: originalWarn,
    error: originalError,
  };

  console.log = (...args: any[]) => {
    originalLog(...args);
    addLog("log", ...args);
  };

  console.warn = (...args: any[]) => {
    originalWarn(...args);
    addLog("warn", ...args);
  };

  console.error = (...args: any[]) => {
    originalError(...args);
    addLog("error", ...args);
  };

  // Test that it's working - this should appear in logs immediately
  originalLog("[DebugLogs] Console interception active");
  addLog("log", "[DebugLogs] Console interception active");
})();

export function DebugLogs() {
  const [isVisible, setIsVisible] = useState(__DEV__);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [copied, setCopied] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const copyLogs = async () => {
    if (logs.length === 0) {
      if (Platform.OS === "web") {
        alert("No logs to copy");
      } else {
        Alert.alert("No logs", "No logs to copy");
      }
      return;
    }

    const logsText = logs
      .map((log) => {
        const time = log.timestamp.toLocaleTimeString();
        const level = log.level.toUpperCase().padEnd(5);
        return `[${time}] ${level}: ${log.message}`;
      })
      .join("\n");

    try {
      if (!clipboardAPI) {
        throw new Error("Clipboard API not available");
      }

      await clipboardAPI.setString(logsText);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      console.log("[DebugLogs] Logs copied to clipboard");
    } catch (error) {
      console.error("[DebugLogs] Failed to copy logs:", error);
      if (Platform.OS === "web") {
        alert("Failed to copy logs");
      } else {
        Alert.alert("Error", "Failed to copy logs");
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const listener = () => {
      if (!isMounted) return;

      // Use requestAnimationFrame to batch updates and prevent stack overflow
      requestAnimationFrame(() => {
        if (!isMounted) return;
        setForceUpdate((prev) => prev + 1);
        // Auto-scroll to bottom when new logs arrive
        setTimeout(() => {
          if (isMounted && scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      });
    };

    listeners.add(listener);

    // Force an update to show existing logs (after a delay to ensure component is mounted)
    setTimeout(() => {
      if (isMounted) {
        setForceUpdate(1);
        // Auto-scroll to bottom initially
        setTimeout(() => {
          if (isMounted && scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: false });
          }
        }, 200);
      }
    }, 100);

    return () => {
      isMounted = false;
      listeners.delete(listener);
    };
  }, []);

  if (!__DEV__ && !isVisible) return null;

  return (
    <View style={styles.container}>
      {isVisible ? (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>Debug Logs ({logs.length})</Text>
            <TouchableOpacity
              style={[styles.copyButton, copied && styles.copyButtonActive]}
              onPress={copyLogs}
            >
              <Text style={styles.copyButtonText}>
                {copied ? "✓ Copied" : "Copy"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                logs.length = 0;
                setForceUpdate((prev) => prev + 1);
              }}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={styles.logsContainer}
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            }}
          >
            {logs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No logs yet. Try clicking a button or triggering an action.
                </Text>
              </View>
            ) : (
              logs.map((log) => (
                <View
                  key={log.id}
                  style={[styles.logEntry, styles[`log${log.level}`]]}
                >
                  <Text style={styles.timestamp}>
                    {log.timestamp.toLocaleTimeString()}
                  </Text>
                  <Text style={[styles.logText, styles[`text${log.level}`]]}>
                    {log.message}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </>
      ) : (
        <TouchableOpacity
          style={styles.showButton}
          onPress={() => setIsVisible(true)}
        >
          <Text style={styles.showButtonText}>📋 Show Logs</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 20 : 100,
    right: Platform.OS === "web" ? 20 : 10,
    width: Platform.OS === "web" ? 400 : 300,
    maxHeight: Platform.OS === "web" ? 500 : 300,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    zIndex: 9999,
    ...(Platform.OS === "web" ? {} : { elevation: 10 }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerText: {
    flex: 1,
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  copyButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#0066cc",
    borderRadius: 4,
    marginRight: 8,
  },
  copyButtonActive: {
    backgroundColor: "#00aa00",
  },
  copyButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#444",
    borderRadius: 4,
    marginRight: 8,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 10,
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  logsContainer: {
    maxHeight: Platform.OS === "web" ? 450 : 250,
  },
  logEntry: {
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  loglog: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  logwarn: {
    backgroundColor: "rgba(255, 193, 7, 0.1)",
  },
  logerror: {
    backgroundColor: "rgba(244, 67, 54, 0.2)",
  },
  timestamp: {
    color: "#888",
    fontSize: 9,
    marginBottom: 2,
  },
  logText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: Platform.OS === "web" ? "monospace" : "monospace",
  },
  textlog: {
    color: "#ccc",
  },
  textwarn: {
    color: "#ffc107",
  },
  texterror: {
    color: "#f44336",
  },
  showButton: {
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 8,
    alignItems: "center",
  },
  showButtonText: {
    color: "#fff",
    fontSize: 12,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyStateText: {
    color: "#888",
    fontSize: 11,
    textAlign: "center",
  },
});

import { Alert, Platform } from "react-native";
import { signOut } from "firebase/auth";
import { router } from "expo-router";
import { auth } from "./config";

/**
 * Sign out the current user from Firebase Auth and redirect to /login.
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Firebase logout error:", error);
  } finally {
    router.replace("/login");
  }
};

/**
 * Prompt confirmation (cross-platform: native Alert on iOS/Android, window.confirm on Web)
 * and perform logout if confirmed.
 */
export const confirmLogout = (
  customMessage: string = "Are you sure you want to logout?",
  onBeforeLogout?: () => void
): void => {
  const doLogout = async () => {
    if (onBeforeLogout) {
      onBeforeLogout();
    }
    await logoutUser();
  };

  if (Platform.OS === "web") {
    // In react-native-web, Alert.alert is an empty no-op function.
    // Use window.confirm for web browsers.
    const confirmed =
      typeof window !== "undefined" && typeof window.confirm === "function"
        ? window.confirm(customMessage)
        : true;

    if (confirmed) {
      doLogout();
    }
  } else {
    Alert.alert("Logout", customMessage, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: doLogout,
      },
    ]);
  }
};

/**
 * Prompt confirmation (cross-platform: native Alert on iOS/Android, window.confirm on Web)
 * for destructive or state-changing actions.
 */
export const confirmAction = (
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText: string = "Confirm"
): void => {
  if (Platform.OS === "web") {
    const confirmed =
      typeof window !== "undefined" && typeof window.confirm === "function"
        ? window.confirm(`${title}\n\n${message}`)
        : true;

    if (confirmed) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: confirmText,
        style: "destructive",
        onPress: onConfirm,
      },
    ]);
  }
};

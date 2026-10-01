import { Platform } from "react-native";
import Constants from "expo-constants";

export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      const hostname = window.location.hostname;
      return `http://${hostname}:5000`;
    }
    return "http://localhost:5000";
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const ip = hostUri ? hostUri.split(":")[0] : "10.212.185.129";
  return `http://${ip}:5000`;
}

export const API_URL = getApiUrl();

export async function loginUser(email: string, password: string) {
  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || data.error || "Login failed"
    );
  }

  return data;
}
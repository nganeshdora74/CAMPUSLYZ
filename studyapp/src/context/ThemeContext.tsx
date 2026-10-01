import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "Light" | "Dark" | "System";

export interface ThemeColors {
  background: string;
  card: string;
  surface: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryLight: string;
  danger: string;
  dangerBg: string;
  inputBg: string;
  inputBorder: string;
  modalBg: string;
  modalOverlay: string;
  isDark: boolean;

  // Admin Portal Palette
  adminBg: string;
  adminCard: string;
  adminCardBorder: string;
  adminTopBar: string;
  adminTopBarBorder: string;
  adminSidebar: string;
  adminSidebarBorder: string;
  adminSearchBg: string;
  adminInputBg: string;
  adminInputBorder: string;
  adminText: string;
  adminTextSecondary: string;
  adminSurfaceAlt: string;
}

export const lightColors: ThemeColors = {
  background: "#F7F7FB",
  card: "#FFFFFF",
  surface: "#F1F3F9",
  text: "#111827",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  primary: "#7048E8",
  primaryLight: "#EDE9FE",
  danger: "#EF4444",
  dangerBg: "#FEE2E2",
  inputBg: "#FAFAFC",
  inputBorder: "#DFE0E6",
  modalBg: "#FFFFFF",
  modalOverlay: "rgba(0, 0, 0, 0.5)",
  isDark: false,

  // Admin Portal Light
  adminBg: "#F8FAFC",
  adminCard: "#FFFFFF",
  adminCardBorder: "#E2E8F0",
  adminTopBar: "#FFFFFF",
  adminTopBarBorder: "#E2E8F0",
  adminSidebar: "#2A174E",
  adminSidebarBorder: "#3B2268",
  adminSearchBg: "#F1F5F9",
  adminInputBg: "#FFFFFF",
  adminInputBorder: "#CBD5E1",
  adminText: "#0F172A",
  adminTextSecondary: "#64748B",
  adminSurfaceAlt: "#F8FAFC",
};

export const darkColors: ThemeColors = {
  background: "#0F172A",
  card: "#1E293B",
  surface: "#334155",
  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  border: "#334155",
  primary: "#8B5CF6",
  primaryLight: "#2E1065",
  danger: "#F87171",
  dangerBg: "#450A0A",
  inputBg: "#1E293B",
  inputBorder: "#475569",
  modalBg: "#1E293B",
  modalOverlay: "rgba(0, 0, 0, 0.75)",
  isDark: true,

  // Admin Portal Dark
  adminBg: "#0B0F19",
  adminCard: "#1E293B",
  adminCardBorder: "#334155",
  adminTopBar: "#111827",
  adminTopBarBorder: "#1F2937",
  adminSidebar: "#0C081B",
  adminSidebarBorder: "#1E1438",
  adminSearchBg: "#1F2937",
  adminInputBg: "#0F172A",
  adminInputBorder: "#374151",
  adminText: "#F8FAFC",
  adminTextSecondary: "#94A3B8",
  adminSurfaceAlt: "#162032",
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = "@campusly_theme_mode";

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "Light",
  isDark: false,
  colors: lightColors,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("Light");
  const [isLoaded, setIsLoaded] = useState(false);

  const normalizeThemeMode = (mode: string | null | undefined): ThemeMode => {
    if (!mode) return "Light";
    const lower = mode.toLowerCase();
    if (lower === "dark") return "Dark";
    if (lower === "system") return "System";
    return "Light";
  };

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode) {
          setThemeModeState(normalizeThemeMode(savedMode));
        }
      } catch (err) {
        console.warn("Error loading theme from storage:", err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode | string) => {
    const normalized = normalizeThemeMode(mode);
    setThemeModeState(normalized);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch (err) {
      console.warn("Error saving theme to storage:", err);
    }
  };

  const isDark =
    normalizeThemeMode(themeMode) === "Dark" ||
    (normalizeThemeMode(themeMode) === "System" && systemScheme === "dark");

  const toggleTheme = async () => {
    const nextMode = isDark ? "Light" : "Dark";
    await setThemeMode(nextMode);
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeMode: normalizeThemeMode(themeMode), isDark, colors, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);

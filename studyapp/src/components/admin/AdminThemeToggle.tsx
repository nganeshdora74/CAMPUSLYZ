import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

type Props = {
  size?: number;
};

export default function AdminThemeToggle({ size = 18 }: Props) {
  const { isDark, toggleTheme } = useAppTheme();

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
          borderColor: isDark ? "#334155" : "#E2E8F0",
        },
      ]}
      onPress={toggleTheme}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Ionicons
        name={isDark ? "sunny" : "moon"}
        size={size}
        color={isDark ? "#FBBF24" : "#6366F1"}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

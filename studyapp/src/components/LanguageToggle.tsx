import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../context/LanguageContext";
import { useAppTheme } from "../context/ThemeContext";

interface Props {
  compact?: boolean;
}

export default function LanguageToggle({ compact = false }: Props) {
  const { languageCode, setLanguage } = useLanguage();
  const { colors, isDark } = useAppTheme();

  const isOdia = languageCode === "or";

  const toggleLanguage = () => {
    setLanguage(isOdia ? "en" : "or");
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactBtn,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9",
            borderColor: colors.border,
          },
        ]}
        onPress={toggleLanguage}
        activeOpacity={0.7}
      >
        <Ionicons name="language-outline" size={16} color={colors.primary} />
        <Text style={[styles.compactText, { color: colors.text }]}>
          {isOdia ? "ଓଡ଼ିଆ" : "ENG"}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
          borderColor: isDark ? "#334155" : "#E2E8F0",
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="language" size={16} color={colors.primary} />
        <Text style={[styles.label, { color: colors.text }]}>Language / ଭାଷା</Text>
      </View>

      <View style={styles.pillRow}>
        <TouchableOpacity
          style={[
            styles.pill,
            !isOdia && [styles.pillActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setLanguage("en")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.pillText,
              { color: !isOdia ? "#FFFFFF" : colors.textSecondary },
            ]}
          >
            ● English
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pill,
            isOdia && [styles.pillActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setLanguage("or")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.pillText,
              { color: isOdia ? "#FFFFFF" : colors.textSecondary },
            ]}
          >
            ● Odia (ଓଡ଼ିଆ)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  pillActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  compactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  compactText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

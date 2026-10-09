import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../context/ThemeContext";
import { SUPPORTED_LANGUAGES, useLanguage } from "../context/LanguageContext";

interface Props {
  compact?: boolean;
  showTheme?: boolean;
  showLanguage?: boolean;
  iconSize?: number;
}

export default function UniversalRoleControls({
  compact = false,
  showTheme = true,
  showLanguage = true,
  iconSize = 18,
}: Props) {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { languageCode, setLanguage } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === languageCode) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <View style={styles.container}>
      {/* 1. DARK / BRIGHT MODE TOGGLE */}
      {showTheme && (
        <TouchableOpacity
          style={[
            styles.btn,
            compact && styles.compactBtn,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9",
              borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0",
            },
          ]}
          onPress={toggleTheme}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isDark ? "Switch to bright mode" : "Switch to dark mode"}
        >
          <Ionicons
            name={isDark ? "sunny" : "moon"}
            size={compact ? 16 : iconSize}
            color={isDark ? "#FBBF24" : "#6366F1"}
          />
          {!compact && (
            <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>
              {isDark ? "Bright" : "Dark"}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* 2. LANGUAGE PICKER BUTTON */}
      {showLanguage && (
        <TouchableOpacity
          style={[
            styles.btn,
            compact && styles.compactBtn,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9",
              borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0",
            },
          ]}
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Change language"
        >
          <Ionicons
            name="globe-outline"
            size={compact ? 16 : iconSize}
            color={colors.primary}
          />
          <Text
            style={[
              styles.langCodeText,
              { color: colors.text },
              compact && { fontSize: 11 },
            ]}
          >
            {currentLang.code.toUpperCase()}
          </Text>
          <Ionicons
            name="chevron-down"
            size={compact ? 11 : 13}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      )}

      {/* 3. ELEGANT LANGUAGE SELECTOR MODAL (8 INDIAN LANGUAGES) */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLangModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: colors.card || (isDark ? "#1E293B" : "#FFFFFF"),
                    borderColor: colors.border || (isDark ? "#334155" : "#E2E8F0"),
                  },
                ]}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.headerLeftRow}>
                    <View
                      style={[
                        styles.langIconCircle,
                        { backgroundColor: colors.primaryLight || "#EDE9FE" },
                      ]}
                    >
                      <Ionicons name="language" size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>
                        Select Language
                      </Text>
                      <Text
                        style={[
                          styles.modalSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Choose your preferred language / ଭାଷା ବାଛନ୍ତୁ
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setLangModalVisible(false)}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Grid of Languages */}
                <View style={styles.langGrid}>
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = lang.code === languageCode;
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        style={[
                          styles.langOptionCard,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryLight || "#EDE9FE"
                              : isDark
                              ? "rgba(255,255,255,0.04)"
                              : "#F8FAFC",
                            borderColor: isSelected
                              ? colors.primary
                              : isDark
                              ? "#334155"
                              : "#E2E8F0",
                          },
                        ]}
                        onPress={() => {
                          setLanguage(lang.code);
                          setLangModalVisible(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.langOptionInfo}>
                          <Text
                            style={[
                              styles.langOptionNative,
                              {
                                color: isSelected ? colors.primary : colors.text,
                                fontWeight: isSelected ? "700" : "600",
                              },
                            ]}
                          >
                            {lang.nativeName}
                          </Text>
                          <Text
                            style={[
                              styles.langOptionEnglish,
                              {
                                color: isSelected
                                  ? colors.primary
                                  : colors.textSecondary,
                              },
                            ]}
                          >
                            {lang.name} ({lang.code.toUpperCase()})
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
  },
  compactBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    minHeight: 28,
    gap: 3,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  langCodeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
  },
  headerLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  langGrid: {
    gap: 6,
  },
  langOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  langOptionInfo: {
    flex: 1,
  },
  langOptionNative: {
    fontSize: 14,
  },
  langOptionEnglish: {
    fontSize: 11,
    marginTop: 2,
  },
});

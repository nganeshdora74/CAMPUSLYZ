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
import { SUPPORTED_LANGUAGES, useLanguage } from "../context/LanguageContext";
import { useAppTheme } from "../context/ThemeContext";

interface Props {
  compact?: boolean;
}

export default function LanguageToggle({ compact = false }: Props) {
  const { languageCode, setLanguage } = useLanguage();
  const { colors, isDark } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const currentOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === languageCode) ||
    SUPPORTED_LANGUAGES[0];

  const renderModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
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
                      Language / ଭାଷା ବାଛନ୍ତୁ
                    </Text>
                    <Text
                      style={[
                        styles.modalSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Select from 8 regional Indian languages
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

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
                        setModalVisible(false);
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
  );

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={[
            styles.compactBtn,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9",
              borderColor: colors.border,
            },
          ]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Switch language"
        >
          <Ionicons name="globe-outline" size={15} color={colors.primary} />
          <Text style={[styles.compactText, { color: colors.text }]}>
            {currentOption.code.toUpperCase()}
          </Text>
          <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
        </TouchableOpacity>
        {renderModal()}
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
            borderColor: isDark ? "#334155" : "#E2E8F0",
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <Ionicons name="globe-outline" size={16} color={colors.primary} />
          <Text style={[styles.label, { color: colors.text }]}>
            Language: {currentOption.nativeName} ({currentOption.code.toUpperCase()})
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.textSecondary}
            style={{ marginLeft: "auto" }}
          />
        </View>
      </TouchableOpacity>
      {renderModal()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
  },
  headerLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  langIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  langGrid: {
    gap: 8,
  },
  langOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
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

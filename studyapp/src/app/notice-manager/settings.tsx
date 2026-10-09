import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";

export default function SettingsScreen() {
  const { isDark, setThemeMode } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [language, setLanguage] = useState("English");

  const handleSave = () => {
    Alert.alert("Settings Saved", "Your Notice Manager preferences have been updated.");
  };

  const bg = isDark ? "#0F172A" : "#F4F7FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: textColor }]}>⚙️ Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Preferences</Text>

          {/* 1. Notifications */}
          <View style={[styles.row, { borderBottomColor: borderColor }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowTitle, { color: textColor }]}>Notifications</Text>
              <Text style={[styles.rowSub, { color: subTextColor }]}>
                Get notified about new notices and student requests
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
              thumbColor={notifications ? "#2563EB" : "#F1F5F9"}
            />
          </View>

          {/* 2. Email Alerts */}
          <View style={[styles.row, { borderBottomColor: borderColor }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowTitle, { color: textColor }]}>Email Alerts</Text>
              <Text style={[styles.rowSub, { color: subTextColor }]}>
                Receive important updates and analytics via email
              </Text>
            </View>
            <Switch
              value={emailAlerts}
              onValueChange={setEmailAlerts}
              trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
              thumbColor={emailAlerts ? "#2563EB" : "#F1F5F9"}
            />
          </View>

          {/* 3. Dark Mode */}
          <View style={[styles.row, { borderBottomColor: borderColor }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.rowTitle, { color: textColor }]}>Dark Mode</Text>
              <Text style={[styles.rowSub, { color: subTextColor }]}>
                Switch between light and dark visual themes
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) => setThemeMode(val ? "Dark" : "Light")}
              trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
              thumbColor={isDark ? "#2563EB" : "#F1F5F9"}
            />
          </View>

          {/* 4. Language */}
          <View style={[styles.row, { borderBottomColor: borderColor }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: textColor }]}>Language</Text>
              <Text style={[styles.rowSub, { color: subTextColor }]}>Select application display language</Text>
            </View>
            <TouchableOpacity
              style={styles.langBtn}
              onPress={() => Alert.alert("Language", "Selected: English")}
            >
              <Text style={styles.langBtnText}>{language} ▾</Text>
            </TouchableOpacity>
          </View>

          {/* Save Changes Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: { fontSize: 20, fontWeight: "800" },
  card: {
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowTitle: { fontSize: 14, fontWeight: "700" },
  rowSub: { fontSize: 12, marginTop: 2 },
  langBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  langBtnText: { color: "#2563EB", fontWeight: "700", fontSize: 12 },
  saveBtn: {
    backgroundColor: "#2563EB",
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
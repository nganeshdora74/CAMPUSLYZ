import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { confirmLogout } from "../../firebase/auth";

export default function TeacherSettingsScreen() {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { languageCode, languageName, setLanguage } = useLanguage();

  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [notifPush, setNotifPush] = useState(true);

  const handlePasswordUpdate = () => {
    if (!currentPwd || !newPwd) {
      Alert.alert("Incomplete", "Please fill in all password fields.");
      return;
    }
    setPasswordModal(false);
    setCurrentPwd("");
    setNewPwd("");
    Alert.alert("Success", "Password updated successfully.");
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#0B132B" : "#F4F7FC" }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.push("/teacher")} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text>
            <Text style={styles.pageSub}>Manage your account preferences</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentPadding} showsVerticalScrollIndicator={false}>
        {/* Settings List (Matching Screen 10 in Image 2) */}
        <View style={[styles.card, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
          {/* Change Password */}
          <TouchableOpacity style={styles.settingRow} onPress={() => setPasswordModal(true)}>
            <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="lock-closed-outline" size={17} color="#2563EB" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Change Password</Text>
              <Text style={styles.settingSub}>Update your password</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
          </TouchableOpacity>

          {/* Notifications */}
          <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}>
            <View style={[styles.iconCircle, { backgroundColor: "#FFF7ED" }]}>
              <Ionicons name="notifications-outline" size={17} color="#EA580C" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Notifications</Text>
              <Text style={styles.settingSub}>Manage notifications & class alerts</Text>
            </View>
            <Switch
              value={notifPush}
              onValueChange={setNotifPush}
              trackColor={{ false: "#CBD5E1", true: "#BFDBFE" }}
              thumbColor={notifPush ? "#2563EB" : "#94A3B8"}
            />
          </View>

          {/* Language */}
          <TouchableOpacity
            style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}
            onPress={() => setLanguage(languageCode === "en" ? "hi" : "en")}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="language-outline" size={17} color="#059669" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Language</Text>
              <Text style={styles.settingSub}>{languageName}</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
          </TouchableOpacity>

          {/* Theme */}
          <TouchableOpacity
            style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}
            onPress={toggleTheme}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#FAF5FF" }]}>
              <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={17} color="#7C3AED" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Theme</Text>
              <Text style={styles.settingSub}>{isDark ? "Dark Mode" : "Light Mode"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}
            onPress={() => confirmLogout()}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#FFF1F2" }]}>
              <Ionicons name="log-out-outline" size={17} color="#E11D48" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.settingTitle, { color: "#E11D48" }]}>Logout</Text>
              <Text style={styles.settingSub}>Sign out from your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="#E11D48" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Password Modal */}
      <Modal visible={passwordModal} transparent animationType="fade" onRequestClose={() => setPasswordModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Update Password</Text>
              <TouchableOpacity onPress={() => setPasswordModal(false)}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={currentPwd}
              onChangeText={setCurrentPwd}
            />

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={newPwd}
              onChangeText={setNewPwd}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPasswordModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handlePasswordUpdate}>
                <Text style={styles.saveBtnText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 15, fontWeight: "900" },
  pageSub: { fontSize: 10, color: "#64748B" },
  contentScroll: { flex: 1 },
  contentPadding: { padding: 12, paddingBottom: 30 },
  card: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: { fontSize: 12.5, fontWeight: "700" },
  settingSub: { fontSize: 10, color: "#64748B", marginTop: 1 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 14 },
  modalCard: { width: "100%", maxWidth: 360, borderRadius: 10, padding: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: 13, fontWeight: "800" },
  inputLabel: { fontSize: 10, fontWeight: "700", color: "#64748B", marginBottom: 3 },
  inputField: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, marginBottom: 8 },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 5 },
  cancelBtnText: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  saveBtn: { backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  saveBtnText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
});
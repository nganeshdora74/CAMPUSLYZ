import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { onAuthStateChanged, sendPasswordResetEmail, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { confirmLogout } from "../../firebase/auth";
import { useAppTheme, ThemeMode } from "../../context/ThemeContext";
import { useLanguage, SUPPORTED_LANGUAGES } from "../../context/LanguageContext";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";

// =====================================================
// SIDEBAR NAVIGATION ITEMS
// =====================================================
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "home", route: "/admin" },
  { id: "students", label: "Students", icon: "person", route: "/admin/student" },
  { id: "faculty", label: "Faculty", icon: "people", route: "/admin/faculty" },
  { id: "academics", label: "Academics", icon: "book", route: "/admin/academics" },
  { id: "special-notes", label: "Special Notes", icon: "document-text", route: "/admin/special-notes" },
  { id: "messages", label: "Messages", icon: "chatbubbles", route: "/messages?role=teacher" },
  { id: "schedule", label: "Schedule", icon: "calendar", route: "/admin/schedule" },
  { id: "attendance", label: "Attendance", icon: "checkbox", route: "/admin/attendence" },
  { id: "certificates", label: "Certificates", icon: "ribbon", route: "/admin/certificate" },
  { id: "ai-assistant", label: "AI Assistant", icon: "sparkles", route: "/admin/ai-assistant" },
  { id: "hostel", label: "Hostel", icon: "business", route: "/admin/hostel" },
  { id: "mess", label: "Mess", icon: "restaurant", route: "/admin/mess" },
  { id: "fees", label: "Fees", icon: "wallet", route: "/admin/fees" },
  { id: "notices", label: "Notices", icon: "megaphone", route: "/admin/notices" },
  { id: "requests", label: "Requests", icon: "document-text", route: "/admin/requests" },
  { id: "reports", label: "Reports", icon: "bar-chart", route: "/admin/reports" },
  { id: "settings", label: "Settings", icon: "settings", route: "/admin/settings" },
  { id: "profile", label: "Profile", icon: "person-circle", route: "/admin/profile" },
];

export default function AdminSettingsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { themeMode, isDark, colors, setThemeMode } = useAppTheme();
  const { languageCode, languageName, setLanguage, t } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [themeModal, setThemeModal] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);

  // Administrative Notification Switches
  const [notifStudentReg, setNotifStudentReg] = useState(true);
  const [notifAttendanceAlerts, setNotifAttendanceAlerts] = useState(true);
  const [notifFoodFeedback, setNotifFoodFeedback] = useState(true);
  const [notifGatepassRequests, setNotifGatepassRequests] = useState(true);
  const [notifFeeAlerts, setNotifFeeAlerts] = useState(false);

  // Clock & Academic System Preferences
  const [use24HourClock, setUse24HourClock] = useState(false);
  const [defaultSemester, setDefaultSemester] = useState("Semester 6");
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Load Auth Data
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const prefDoc = await getDoc(doc(db, "users", user.uid, "settings", "adminPrefs"));
          if (prefDoc.exists()) {
            const data = prefDoc.data();
            if (data.notifStudentReg !== undefined) setNotifStudentReg(data.notifStudentReg);
            if (data.notifAttendanceAlerts !== undefined) setNotifAttendanceAlerts(data.notifAttendanceAlerts);
            if (data.notifFoodFeedback !== undefined) setNotifFoodFeedback(data.notifFoodFeedback);
            if (data.notifGatepassRequests !== undefined) setNotifGatepassRequests(data.notifGatepassRequests);
            if (data.notifFeeAlerts !== undefined) setNotifFeeAlerts(data.notifFeeAlerts);
            if (data.use24HourClock !== undefined) setUse24HourClock(data.use24HourClock);
            if (data.defaultSemester) setDefaultSemester(data.defaultSemester);
          }
        } catch (e) {
          // Keep defaults
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Save Preferences to Firestore
  const savePreferences = async (updates: Record<string, any>) => {
    if (!currentUser) return;
    try {
      await setDoc(
        doc(db, "users", currentUser.uid, "settings", "adminPrefs"),
        {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("Could not save admin preferences:", e);
    }
  };

  const handleResetPassword = () => {
    const email = currentUser?.email || "admin@campusly.com";
    Alert.alert(
      "Reset Password",
      `Send a password reset email to ${email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Email",
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              Alert.alert("Email Sent", `A password reset link has been dispatched to ${email}.`);
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to send reset email.");
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    confirmLogout("Are you sure you want to sign out of Campusly Administrative Portal?");
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Admin Settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.mainLayout}>
        {/* Standardized Admin Sidebar */}
        <AdminSidebar
          activeNav="settings"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        {/* Content Area */}
        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          {/* Standardized Top Bar */}
          <AdminTopBar
            title="Administrative Settings"
            subtitle="Configure theme, language, notifications & student connection"
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            adminName={currentUser?.displayName || "Admin"}
          />

          {/* Scrollable Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header Banner */}
            <View style={[styles.headerBanner, { backgroundColor: isDark ? "#312E81" : "#5D3EBC" }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.bannerTitle}>Administrative Control & Preferences</Text>
                  <View style={styles.adminTag}>
                    <Text style={styles.adminTagText}>PORTAL SETTINGS</Text>
                  </View>
                </View>
                <Text style={styles.bannerSubtitle}>
                  Set active theme, language translations, clock timings, and teacher-student connectivity.
                </Text>
              </View>
              {isDesktop && (
                <Ionicons name="options-outline" size={48} color="rgba(255,255,255,0.85)" />
              )}
            </View>

            {/* TWO COLUMN GRID */}
            <View style={[styles.gridRow, !isDesktop && styles.gridRowMobile]}>
              {/* LEFT COLUMN: APPEARANCE, LANGUAGE & SYSTEM */}
              <View style={styles.col}>
                {/* 1. APPEARANCE & THEME */}
                <View style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.cardBoxHeader, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerLeftWithIcon}>
                      <Ionicons name="color-palette" size={18} color={colors.primary} />
                      <Text style={[styles.cardBoxTitle, { color: colors.text }]}>
                        {t("appearance", "Appearance & Display")}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.settingRow, { borderBottomColor: colors.border }]}
                    onPress={() => setThemeModal(true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingIconBox, { backgroundColor: "#EDE9FE" }]}>
                      <Ionicons name={isDark ? "moon" : "sunny"} size={17} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>
                        {t("theme", "Color Theme")}
                      </Text>
                      <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                        Currently:{" "}
                        <Text style={{ fontWeight: "700", color: colors.primary }}>
                          {themeMode === "Dark"
                            ? "Dark Mode 🌙"
                            : themeMode === "Light"
                            ? "Light Mode ☀️"
                            : "System Default ⚙️"}
                        </Text>
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {/* 24-Hour Clock Timing */}
                  <View style={styles.settingRowNoBorder}>
                    <View style={[styles.settingIconBox, { backgroundColor: "#E0F2FE" }]}>
                      <Ionicons name="time" size={17} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>
                        24-Hour Military Clock
                      </Text>
                      <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                        Display 14:30 instead of 02:30 PM across attendance & schedule
                      </Text>
                    </View>
                    <Switch
                      value={use24HourClock}
                      onValueChange={(val) => {
                        setUse24HourClock(val);
                        savePreferences({ use24HourClock: val });
                      }}
                      trackColor={{ false: "#CBD5E1", true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                {/* 2. LANGUAGE & LOCALIZATION */}
                <View style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.cardBoxHeader, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerLeftWithIcon}>
                      <Ionicons name="globe" size={18} color="#16A34A" />
                      <Text style={[styles.cardBoxTitle, { color: colors.text }]}>
                        {t("language", "Language & Localization")}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.settingRowNoBorder}
                    onPress={() => setLanguageModal(true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingIconBox, { backgroundColor: "#DCFCE7" }]}>
                      <Ionicons name="language" size={17} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>
                        System Language
                      </Text>
                      <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                        Currently:{" "}
                        <Text style={{ fontWeight: "700", color: "#16A34A" }}>{languageName}</Text>
                      </Text>
                    </View>
                    <View style={styles.changePill}>
                      <Text style={styles.changePillText}>Change</Text>
                      <Ionicons name="chevron-forward" size={13} color="#16A34A" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* RIGHT COLUMN: NOTIFICATIONS, SECURITY & ACTIONS */}
              <View style={styles.col}>
                {/* 4. ADMINISTRATIVE NOTIFICATIONS */}
                <View style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.cardBoxHeader, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerLeftWithIcon}>
                      <Ionicons name="notifications" size={18} color="#EA580C" />
                      <Text style={[styles.cardBoxTitle, { color: colors.text }]}>
                        Notification Alerts
                      </Text>
                    </View>
                  </View>

                  {/* Student Registrations */}
                  <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>New Student Registrations</Text>
                      <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                        Alert when a student registers or requests enrollment
                      </Text>
                    </View>
                    <Switch
                      value={notifStudentReg}
                      onValueChange={(val) => {
                        setNotifStudentReg(val);
                        savePreferences({ notifStudentReg: val });
                      }}
                      trackColor={{ false: "#CBD5E1", true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Attendance Alerts */}
                  <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>Attendance & Absence Alerts</Text>
                      <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                        Notify when student attendance falls below 75%
                      </Text>
                    </View>
                    <Switch
                      value={notifAttendanceAlerts}
                      onValueChange={(val) => {
                        setNotifAttendanceAlerts(val);
                        savePreferences({ notifAttendanceAlerts: val });
                      }}
                      trackColor={{ false: "#CBD5E1", true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Mess Food Feedback */}
                  <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>Daily Food Feedback</Text>
                      <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                        Instant alert when student submits low mess rating
                      </Text>
                    </View>
                    <Switch
                      value={notifFoodFeedback}
                      onValueChange={(val) => {
                        setNotifFoodFeedback(val);
                        savePreferences({ notifFoodFeedback: val });
                      }}
                      trackColor={{ false: "#CBD5E1", true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Gatepass / Leave Requests */}
                  <View style={styles.settingRowNoBorder}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>Leave & Gatepass Submissions</Text>
                      <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                        Notify for warden and mentor out-pass approvals
                      </Text>
                    </View>
                    <Switch
                      value={notifGatepassRequests}
                      onValueChange={(val) => {
                        setNotifGatepassRequests(val);
                        savePreferences({ notifGatepassRequests: val });
                      }}
                      trackColor={{ false: "#CBD5E1", true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                {/* 5. SECURITY & ACCOUNT ACTIONS */}
                <View style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.cardBoxHeader, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerLeftWithIcon}>
                      <Ionicons name="shield-checkmark" size={18} color="#2563EB" />
                      <Text style={[styles.cardBoxTitle, { color: colors.text }]}>Security & Account</Text>
                    </View>
                  </View>

                  {/* Reset Password */}
                  <TouchableOpacity
                    style={[styles.settingRow, { borderBottomColor: colors.border }]}
                    onPress={handleResetPassword}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingIconBox, { backgroundColor: "#EFF6FF" }]}>
                      <Ionicons name="key" size={17} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>Reset Password</Text>
                      <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                        Send email link to reset admin password
                      </Text>
                    </View>
                    <Ionicons name="mail-outline" size={18} color="#2563EB" />
                  </TouchableOpacity>

                  {/* Manage Full Profile */}
                  <TouchableOpacity
                    style={[styles.settingRow, { borderBottomColor: colors.border }]}
                    onPress={() => router.push("/admin/profile")}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingIconBox, { backgroundColor: "#F3EEFD" }]}>
                      <Ionicons name="person" size={17} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>Admin Profile Details</Text>
                      <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                        Edit name, phone, department, and employee ID
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {/* Log Out */}
                  <TouchableOpacity
                    style={styles.settingRowNoBorder}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingIconBox, { backgroundColor: "#FEE2E2" }]}>
                      <Ionicons name="log-out" size={17} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.settingTitle, { color: "#DC2626" }]}>Sign Out of Admin</Text>
                      <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                        Securely terminate your current administrator session
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* ==================================================== */}
      {/* THEME SELECTION MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={themeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setThemeModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setThemeModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="color-palette" size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select App Theme</Text>
              </View>
              <TouchableOpacity onPress={() => setThemeModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16, gap: 10 }}>
              {[
                { id: "Light", label: "Light Mode ☀️", sub: "Clean, high-contrast white appearance" },
                { id: "Dark", label: "Dark Mode 🌙", sub: "Deep purple & dark slate for low-light" },
                { id: "System", label: "System Default ⚙️", sub: "Automatically matches your OS setting" },
              ].map((m) => {
                const isSelected = themeMode.toLowerCase() === m.id.toLowerCase();
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.choiceItem,
                      { borderColor: colors.border, backgroundColor: isDark ? colors.background : "#F8FAFC" },
                      isSelected && { borderColor: colors.primary, backgroundColor: isDark ? "#312E81" : "#EEF2FF" },
                    ]}
                    onPress={() => {
                      setThemeMode(m.id as ThemeMode);
                      setThemeModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.choiceTitle, { color: colors.text }, isSelected && { color: colors.primary, fontWeight: "700" }]}>
                        {m.label}
                      </Text>
                      <Text style={[styles.choiceSub, { color: colors.textSecondary }]}>{m.sub}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================================================== */}
      {/* LANGUAGE SELECTION MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={languageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLanguageModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLanguageModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, maxHeight: "80%" }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="globe" size={20} color="#16A34A" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Language</Text>
              </View>
              <TouchableOpacity onPress={() => setLanguageModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: 16 }}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = languageCode === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.choiceItem,
                      { borderColor: colors.border, backgroundColor: isDark ? colors.background : "#F8FAFC", marginBottom: 8 },
                      isSelected && { borderColor: "#16A34A", backgroundColor: isDark ? "#064E3B" : "#DCFCE7" },
                    ]}
                    onPress={() => {
                      setLanguage(lang.code);
                      setLanguageModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.choiceTitle, { color: colors.text }, isSelected && { color: "#16A34A", fontWeight: "700" }]}>
                        {lang.name}
                      </Text>
                      <Text style={[styles.choiceSub, { color: colors.textSecondary }]}>{lang.nativeName}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#16A34A" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 250,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRightWidth: 1,
  },
  mobileSidebar: {
    width: 280,
    height: "100%",
  },
  mobileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row",
  },
  sidebarBrand: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#321D5A",
  },
  brandIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  brandSubtitle: {
    fontSize: 11,
    color: "#A78BFA",
  },
  closeSidebarBtn: {
    marginLeft: "auto",
    padding: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 10,
  },
  navItemActive: {
    backgroundColor: "#7C3AED",
  },
  navLabel: {
    fontSize: 13.5,
    color: "#C4B5FD",
    fontWeight: "600",
  },
  navLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sidebarFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#321D5A",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  logoutBtnText: {
    color: "#F87171",
    fontSize: 13,
    fontWeight: "600",
  },
  contentArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuHamburger: {
    marginRight: 12,
    padding: 4,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  profileQuickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  profileQuickChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerBanner: {
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  bannerSubtitle: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    lineHeight: 18,
  },
  adminTag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminTagText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: "row",
    gap: 16,
  },
  gridRowMobile: {
    flexDirection: "column",
  },
  col: {
    flex: 1,
    gap: 16,
  },
  cardBox: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardBoxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeftWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardBoxTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingRowNoBorder: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  settingSub: {
    fontSize: 12,
    marginTop: 2,
  },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  changePillText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },
  editCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editCodeBtnText: {
    color: "#6366F1",
    fontSize: 12,
    fontWeight: "700",
  },
  credentialsBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  credRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  credLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  credVal: {
    fontSize: 13,
    fontWeight: "800",
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 18,
    overflow: "hidden",
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  choiceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  choiceSub: {
    fontSize: 12,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  modalFooterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
    marginBottom: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

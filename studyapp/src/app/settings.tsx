import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { confirmLogout } from "../firebase/auth";
import { useAppTheme, ThemeMode } from "../context/ThemeContext";
import { useLanguage, SUPPORTED_LANGUAGES } from "../context/LanguageContext";
import {
  connectStudentToTeacher,
  disconnectStudentFromTeacher,
  updateTeacherCode,
  seedDefaultTeacherCode,
  ConnectedTeacherInfo,
} from "../firebase/teacherStudent";

export default function SettingsScreen() {
  const { themeMode, isDark, colors, setThemeMode } = useAppTheme();
  const { languageCode, languageName, setLanguage, t } = useLanguage();

  const [notifications, setNotifications] = useState(true);

  const [themeModal, setThemeModal] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [connectModal, setConnectModal] = useState(false);

  // Student Connect Form
  const [studentTeacherId, setStudentTeacherId] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectedTeachers, setConnectedTeachers] = useState<ConnectedTeacherInfo[]>([]);

  // Teacher Portal Form (Update ID & Password)
  const [teacherCredsModal, setTeacherCredsModal] = useState(false);
  const [teacherIdInput, setTeacherIdInput] = useState("TEACH-CSE-101");
  const [teacherPasswordInput, setTeacherPasswordInput] = useState("123");
  const [teacherNameInput, setTeacherNameInput] = useState("Prof. Ganesh Sharma");
  const [teacherSubjectInput, setTeacherSubjectInput] = useState("Data Structures & Algorithms Mastery");
  const [updatingTeacherCode, setUpdatingTeacherCode] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // --------------------------------------------------
  // REAL-TIME TEACHER / STUDENT SYNC
  // --------------------------------------------------
  React.useEffect(() => {
    seedDefaultTeacherCode();

    // Listen to current teacher code
    const unsubTeacher = onSnapshot(
      doc(db, "system", "teacherCode"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.teacherId) setTeacherIdInput(data.teacherId);
          if (data.password) setTeacherPasswordInput(data.password);
          if (data.teacherName) setTeacherNameInput(data.teacherName);
          if (data.subject) setTeacherSubjectInput(data.subject);
        }
      },
      () => {}
    );

    const user = auth.currentUser;
    if (!user) return unsubTeacher;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.connectedTeachers)) {
          setConnectedTeachers(data.connectedTeachers);
        }
      }
    });

    return () => {
      unsubTeacher();
      unsubscribe();
    };
  }, []);

  const handleUpdateTeacherCredentials = async () => {
    if (!teacherIdInput.trim() || !teacherPasswordInput.trim()) {
      Alert.alert("Missing Details", "Please provide both Teacher ID and Password.");
      return;
    }

    try {
      setUpdatingTeacherCode(true);
      const uid = auth.currentUser?.uid || "teacher-host";
      await updateTeacherCode(uid, {
        teacherId: teacherIdInput.trim(),
        password: teacherPasswordInput.trim(),
        teacherName: teacherNameInput.trim() || "Professor",
        subject: teacherSubjectInput.trim() || "Academic Mentorship",
      });
      setTeacherCredsModal(false);
      Alert.alert(
        "Teacher Portal Updated! 🔗",
        `Students can now connect using Teacher ID "${teacherIdInput.trim()}" and Password "${teacherPasswordInput.trim()}".`
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not update connection credentials.");
    } finally {
      setUpdatingTeacherCode(false);
    }
  };

  const handleConnectTeacher = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Login Required", "Please log in before connecting to a teacher.");
      return;
    }
    if (!studentTeacherId.trim() || !studentPassword.trim()) {
      Alert.alert("Missing Fields", "Please enter both Teacher ID and Password.");
      return;
    }

    try {
      setConnecting(true);
      const res = await connectStudentToTeacher(
        user.uid,
        user.displayName || "Student",
        user.email || "",
        studentTeacherId,
        studentPassword
      );

      if (res.success && res.teacher) {
        Alert.alert(
          "Connected Successfully! 🎉",
          `You are now connected to ${res.teacher.teacherName} for "${res.teacher.subject}".\n\nYou can now:\n• Send messages & study photos in Messages\n• Access exclusive class notices with photos & videos in Notices`
        );
        setConnectModal(false);
        setStudentTeacherId("");
        setStudentPassword("");
      } else {
        Alert.alert("Connection Failed", res.error || "Please check the Teacher ID and Password.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not connect to teacher.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = (tId: string, name: string) => {
    Alert.alert(
      "Disconnect Teacher",
      `Are you sure you want to disconnect from ${name}? You will lose access to their private class notices and messages.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;
            await disconnectStudentFromTeacher(user.uid, tId);
          },
        },
      ]
    );
  };

  // --------------------------------------------------
  // CHANGE PASSWORD
  // --------------------------------------------------

  const changePassword = async () => {
    if (changingPassword) {
      return;
    }

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      Alert.alert(
        "Missing information",
        "Enter your current password, new password, and confirmation."
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Weak password",
        "Your new password must be at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Password mismatch",
        "New password and confirmation do not match."
      );
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        "Choose a new password",
        "Your new password must be different from your current password."
      );
      return;
    }

    const user = auth.currentUser;

    if (!user || !user.email) {
      Alert.alert(
        "Not logged in",
        "Please log in again before changing your password."
      );
      return;
    }

    try {
      setChangingPassword(true);

      const credential =
        EmailAuthProvider.credential(
          user.email,
          currentPassword
        );

      // Firebase requires recent authentication
      // for sensitive account changes.
      await reauthenticateWithCredential(
        user,
        credential
      );

      await updatePassword(
        user,
        newPassword
      );

      setPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      Alert.alert(
        "Password changed",
        "Your Firebase password has been updated successfully."
      );
    } catch (error: any) {
      console.error(
        "Change password error:",
        error
      );

      let message =
        "Unable to change your password.";

      switch (error?.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
          message =
            "Your current password is incorrect.";
          break;

        case "auth/weak-password":
          message =
            "Your new password is too weak. Use at least 6 characters.";
          break;

        case "auth/requires-recent-login":
          message =
            "For security, please log out and log in again, then change your password.";
          break;

        case "auth/network-request-failed":
          message =
            "Network error. Please check your internet connection.";
          break;

        case "auth/too-many-requests":
          message =
            "Too many attempts. Please wait and try again.";
          break;

        default:
          if (error?.message) {
            message = error.message;
          }
      }

      Alert.alert(
        "Password change failed",
        message
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // --------------------------------------------------
  // FORGOT PASSWORD: SEND RESET EMAIL
  // --------------------------------------------------
  const handleSendResetEmail = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert("No Email", "No logged in user email found to send reset link.");
      return;
    }

    try {
      setSendingResetEmail(true);
      await sendPasswordResetEmail(auth, user.email.trim());
      Alert.alert(
        t("resetEmailSent", "Password Reset Email Sent"),
        `${t(
          "resetEmailSentDesc",
          "A password reset link has been sent to your registered email."
        )}\n\nSent to: ${user.email}`
      );
      setPasswordModal(false);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not send password reset email.");
    } finally {
      setSendingResetEmail(false);
    }
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout = () => {
    if (loggingOut) {
      return;
    }

    confirmLogout(
      "Are you sure you want to logout from this device?",
      () => setLoggingOut(true)
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* BACK */}
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={loggingOut}
        >
          <Text style={[styles.back, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>
          {t("settings", "Settings")}
        </Text>

        {/* ACCOUNT */}
        <Text style={[styles.section, { color: colors.textSecondary }]}>
          {t("account", "Account").toUpperCase()}
        </Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/(tab)/profile")}
          disabled={loggingOut}
        >
          <Text style={[styles.icon, { color: colors.text }]}>○</Text>
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            {t("editProfile", "Edit Profile")}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setPasswordModal(true)}
          disabled={loggingOut}
        >
          <Text style={styles.icon}>🔒</Text>
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            {t("password", "Password")}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.icon, { color: colors.text }]}>♢</Text>
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            {t("notifications", "Notifications")}
          </Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{
              false: isDark ? "#334155" : "#DDD",
              true: colors.primary,
            }}
            thumbColor={notifications ? "#FFF" : isDark ? "#94A3B8" : "#FFF"}
          />
        </View>

        {/* PREFERENCES */}
        <Text style={[styles.section, { color: colors.textSecondary }]}>
          {t("preferences", "Preferences").toUpperCase()}
        </Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setThemeModal(true)}
          disabled={loggingOut}
        >
          <Text style={styles.icon}>☼</Text>
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            {t("theme", "Theme")}
          </Text>
          <Text style={[styles.current, { color: colors.textSecondary }]}>
            {themeMode}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setLanguageModal(true)}
          disabled={loggingOut}
        >
          <Text style={styles.icon}>文</Text>
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            {t("language", "Language")}
          </Text>
          <Text style={[styles.current, { color: colors.textSecondary }]}>
            {languageName}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* COLLEGE */}
        <Text style={[styles.section, { color: colors.textSecondary }]}>
          {t("college", "College").toUpperCase()}
        </Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() =>
            Alert.alert(
              t("accountRole", "Account Role"),
              "You are currently using the Student account."
            )
          }
          disabled={loggingOut}
        >
          <Text style={styles.icon}>♙</Text>
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            {t("accountRole", "Account Role")}
          </Text>
          <Text style={[styles.current, { color: colors.textSecondary }]}>
            {t("student", "Student")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/(tab)/profile")}
          disabled={loggingOut}
        >
          <Text style={styles.icon}>▣</Text>
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            {t("academicDetails", "Academic Details")}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* TEACHER & CLASSROOM CONNECTION */}
        <Text style={[styles.section, { color: colors.textSecondary }]}>
          {t("teacherConnection", "Teacher & Classroom Connection").toUpperCase()}
        </Text>

        {/* 1. Student Connect with Teacher */}
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setConnectModal(true)}
          disabled={loggingOut}
        >
          <Text style={styles.icon}>🎓</Text>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {t("connectTeacher", "Connect with Teacher (Join Class)")}
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }}>
              {connectedTeachers.length > 0
                ? `${connectedTeachers.length} Connected: ${connectedTeachers.map((t) => t.teacherName).join(", ")}`
                : "Enter Teacher ID & Password to unlock chats & notices"}
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* 2. Messages, Photos & PDFs Link */}
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/messages")}
          disabled={loggingOut}
        >
          <Text style={styles.icon}>💬</Text>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {t("teacherMessages", "Teacher Messages, Photos & PDFs")}
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }}>
              Chat with teachers, ask doubts & share files
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* 3. Teacher Portal (Update ID & Password) */}
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setTeacherCredsModal(true)}
          disabled={loggingOut}
        >
          <Text style={styles.icon}>🔑</Text>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {t("teacherPortal", "Teacher Portal (Update ID & Password)")}
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 2 }}>
              Configure teacher connection credentials for your students
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* SUPPORT */}
        <Text style={[styles.section, { color: colors.textSecondary }]}>
          {t("support", "Support").toUpperCase()}
        </Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() =>
            Alert.alert(
              t("helpFaq", "Help & FAQ"),
              "Contact your college administrator for account or timetable issues."
            )
          }
          disabled={loggingOut}
        >
          <Text style={[styles.icon, { color: colors.text }]}>?</Text>
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            {t("helpFaq", "Help & FAQ")}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* LOGOUT */}
        <TouchableOpacity
          style={[
            styles.logout,
            { backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FFF0F0" },
            loggingOut && styles.disabledLogout,
          ]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <View style={styles.logoutLoading}>
              <ActivityIndicator
                size="small"
                color="#D94B4B"
              />
              <Text style={styles.logoutText}>
                {t("loggingOut", "Logging out...")}
              </Text>
            </View>
          ) : (
            <Text style={styles.logoutText}>
              {t("logout", "Logout")}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* THEME MODAL */}
      <Modal
        transparent
        visible={themeModal}
        animationType="fade"
        onRequestClose={() => setThemeModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalBg, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setThemeModal(false)}
        >
          <TouchableOpacity
            style={[styles.modal, { backgroundColor: colors.modalBg }]}
            activeOpacity={1}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("chooseTheme", "Choose Theme")}
            </Text>

            {(["Light", "Dark", "System"] as ThemeMode[]).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.option, { borderBottomColor: colors.border }]}
                onPress={async () => {
                  await setThemeMode(item);
                  setThemeModal(false);
                }}
              >
                <Text style={{ color: colors.text, fontSize: 15 }}>
                  {item === "Light"
                    ? t("light", "Light")
                    : item === "Dark"
                    ? t("dark", "Dark")
                    : t("system", "System")}
                </Text>

                {themeMode === item && (
                  <Text style={[styles.check, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* LANGUAGE MODAL */}
      <Modal
        transparent
        visible={languageModal}
        animationType="fade"
        onRequestClose={() => setLanguageModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalBg, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setLanguageModal(false)}
        >
          <TouchableOpacity
            style={[styles.modal, { backgroundColor: colors.modalBg }]}
            activeOpacity={1}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("chooseLanguage", "Choose Language")}
            </Text>

            <ScrollView style={{ maxHeight: 320 }}>
              {SUPPORTED_LANGUAGES.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.option, { borderBottomColor: colors.border }]}
                  onPress={async () => {
                    await setLanguage(item.code);
                    setLanguageModal(false);
                  }}
                >
                  <View>
                    <Text style={{ color: colors.text, fontSize: 15 }}>{item.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {item.nativeName}
                    </Text>
                  </View>

                  {languageCode === item.code && (
                    <Text style={[styles.check, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* PASSWORD MODAL */}
      <Modal
        transparent
        visible={passwordModal}
        animationType="slide"
        onRequestClose={() => setPasswordModal(false)}
      >
        <View style={[styles.modalBg, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.modalBg }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t("changePassword", "Change Password")}
                </Text>
                {auth.currentUser?.email ? (
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {auth.currentUser.email}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => {
                  setPasswordModal(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={changingPassword || sendingResetEmail}
              >
                <Text style={[styles.close, { color: colors.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Current Password Field */}
            <View style={{ position: "relative" }}>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t("currentPassword", "Current password")}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showCurrentPassword}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.text,
                    paddingRight: 40,
                  },
                ]}
                editable={!changingPassword && !sendingResetEmail}
              />
              <TouchableOpacity
                style={{ position: "absolute", right: 12, top: 22 }}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons
                  name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Current Password Option */}
            <TouchableOpacity
              style={{ marginTop: 8, marginBottom: 2 }}
              onPress={handleSendResetEmail}
              disabled={sendingResetEmail || changingPassword}
            >
              {sendingResetEmail ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={{ fontSize: 12, color: colors.primary }}>
                  {t("forgotPasswordPrompt", "Forgot current password?")}{" "}
                  <Text style={{ fontWeight: "700", textDecorationLine: "underline" }}>
                    {t("sendResetEmail", "Send Reset Link to Email")}
                  </Text>
                </Text>
              )}
            </TouchableOpacity>

            {/* New Password Field */}
            <View style={{ position: "relative" }}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t("newPassword", "New password")}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showNewPassword}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.text,
                    paddingRight: 40,
                  },
                ]}
                editable={!changingPassword && !sendingResetEmail}
              />
              <TouchableOpacity
                style={{ position: "absolute", right: 12, top: 22 }}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Field */}
            <View style={{ position: "relative" }}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t("confirmPassword", "Confirm new password")}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirmPassword}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.text,
                    paddingRight: 40,
                  },
                ]}
                editable={!changingPassword && !sendingResetEmail}
              />
              <TouchableOpacity
                style={{ position: "absolute", right: 12, top: 22 }}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.passwordHint, { color: colors.textSecondary }]}>
              {t("passwordHint", "Password must be at least 6 characters.")}
            </Text>

            <TouchableOpacity
              style={[
                styles.save,
                { backgroundColor: colors.primary },
                changingPassword && styles.disabledButton,
              ]}
              onPress={changePassword}
              disabled={changingPassword || sendingResetEmail}
            >
              {changingPassword ? (
                <View style={styles.buttonLoading}>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveText}>
                    {t("updating", "Updating...")}
                  </Text>
                </View>
              ) : (
                <Text style={styles.saveText}>
                  {t("changePassword", "Change Password")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* CONNECT WITH TEACHER MODAL (STUDENT) */}
      {/* ==================================================== */}
      <Modal
        transparent
        visible={connectModal}
        animationType="slide"
        onRequestClose={() => setConnectModal(false)}
      >
        <View style={[styles.modalBg, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.modalBg, maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Connect with Teacher
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Join your class to message teachers & unlock class notices
                </Text>
              </View>
              <TouchableOpacity onPress={() => setConnectModal(false)}>
                <Text style={[styles.close, { color: colors.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Quick Demo Fill Chip */}
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primaryLight,
                  padding: 10,
                  borderRadius: 12,
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                onPress={() => {
                  setStudentTeacherId("TEACH-CSE-101");
                  setStudentPassword("123");
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                  💡 Tap to Auto-Fill Demo Code:
                </Text>
                <Text style={{ fontSize: 11.5, color: colors.text, marginTop: 2 }}>
                  ID: <Text style={{ fontWeight: "700" }}>TEACH-CSE-101</Text> • Password: <Text style={{ fontWeight: "700" }}>123</Text> (Prof. Ganesh Sharma)
                </Text>
              </TouchableOpacity>

              {/* Teacher ID Field */}
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, marginBottom: 4 }}>
                Teacher / Class ID *
              </Text>
              <TextInput
                value={studentTeacherId}
                onChangeText={setStudentTeacherId}
                placeholder="e.g. TEACH-CSE-101"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                ]}
              />

              {/* Access Password Field */}
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 4 }}>
                Access Password / Passcode *
              </Text>
              <TextInput
                value={studentPassword}
                onChangeText={setStudentPassword}
                placeholder="Enter password provided by teacher"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                ]}
              />

              {/* Connect Button */}
              <TouchableOpacity
                style={[
                  styles.save,
                  { backgroundColor: colors.primary, marginTop: 16 },
                  connecting && styles.disabledButton,
                ]}
                onPress={handleConnectTeacher}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>Connect & Join Class</Text>
                )}
              </TouchableOpacity>

              {/* Connected Teachers List */}
              {connectedTeachers.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 8 }}>
                    Currently Connected Teachers ({connectedTeachers.length}):
                  </Text>
                  {connectedTeachers.map((tItem) => (
                    <View
                      key={tItem.teacherId}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: colors.inputBg,
                        padding: 10,
                        borderRadius: 12,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontWeight: "700", fontSize: 13, color: colors.text }}>
                          {tItem.teacherName}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                          {tItem.subject} • ID: {tItem.teacherId}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDisconnect(tItem.teacherId, tItem.teacherName)}
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* TEACHER PORTAL (UPDATE ID & PASSWORD) MODAL */}
      {/* ==================================================== */}
      <Modal
        transparent
        visible={teacherCredsModal}
        animationType="slide"
        onRequestClose={() => setTeacherCredsModal(false)}
      >
        <View style={[styles.modalBg, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.modalBg, maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Teacher Portal Settings
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Update your teacher credentials for student connections
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTeacherCredsModal(false)}>
                <Text style={[styles.close, { color: colors.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, marginBottom: 4 }}>
                Teacher / Class ID *
              </Text>
              <TextInput
                value={teacherIdInput}
                onChangeText={setTeacherIdInput}
                placeholder="e.g. TEACH-CSE-101"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                ]}
              />

              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 4 }}>
                Access Password *
              </Text>
              <TextInput
                value={teacherPasswordInput}
                onChangeText={setTeacherPasswordInput}
                placeholder="e.g. 123"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                ]}
              />

              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 4 }}>
                Teacher Name *
              </Text>
              <TextInput
                value={teacherNameInput}
                onChangeText={setTeacherNameInput}
                placeholder="e.g. Prof. Ganesh Sharma"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                ]}
              />

              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 4 }}>
                Subject / Department
              </Text>
              <TextInput
                value={teacherSubjectInput}
                onChangeText={setTeacherSubjectInput}
                placeholder="e.g. Data Structures & Algorithms"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                ]}
              />

              <TouchableOpacity
                style={[
                  styles.save,
                  { backgroundColor: "#6366F1", marginTop: 18 },
                  updatingTeacherCode && styles.disabledButton,
                ]}
                onPress={handleUpdateTeacherCredentials}
                disabled={updatingTeacherCode}
              >
                {updatingTeacherCode ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>Save Teacher Credentials</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7FB",
  },

  content: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },

  back: {
    fontSize: 32,
    color: "#111827",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 10,
    color: "#111827",
  },

  section: {
    color: "#777B87",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 28,
    marginBottom: 8,
  },

  row: {
    minHeight: 55,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 9,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 35,
    fontSize: 18,
  },

  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },

  current: {
    color: "#777B87",
    fontSize: 12,
    marginRight: 7,
  },

  arrow: {
    fontSize: 25,
    color: "#6246E5",
  },

  logout: {
    height: 50,
    marginTop: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F0",
    borderRadius: 12,
  },

  disabledLogout: {
    opacity: 0.7,
  },

  logoutLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  logoutText: {
    color: "#D94B4B",
    fontWeight: "800",
  },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 25,
  },

  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 12,
    color: "#111827",
  },

  close: {
    fontSize: 30,
    color: "#555",
  },

  option: {
    height: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F2",
  },

  check: {
    color: "#6246E5",
    fontSize: 20,
    fontWeight: "800",
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#DFE0E6",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 10,
    color: "#222",
    backgroundColor: "#FAFAFC",
  },

  passwordHint: {
    color: "#888",
    fontSize: 11,
    marginTop: 7,
  },

  save: {
    height: 48,
    backgroundColor: "#6246E5",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  disabledButton: {
    opacity: 0.7,
  },

  buttonLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  saveText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
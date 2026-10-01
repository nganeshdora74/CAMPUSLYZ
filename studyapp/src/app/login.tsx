import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase/config";

type UserRole = "admin" | "teacher" | "student";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  // Helper to route authenticated user to appropriate dashboard
  const routeUserByRole = async (user: any, fallbackEmail: string) => {
    let finalRole: UserRole = "student";
    const normalizedEmail = (user.email || fallbackEmail).trim().toLowerCase();

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.isBlocked || data.status === "blocked") {
          await signOut(auth);
          Alert.alert(
            "Account Blocked",
            "Your student account has been blocked by the college administration. Please contact your college administrator for assistance."
          );
          return;
        }
        if (data.role === "admin" || data.role === "teacher" || data.role === "student") {
          finalRole = data.role as UserRole;
        } else if (data.isTeacher) {
          finalRole = "teacher";
        } else {
          // Detect role by email
          if (normalizedEmail.includes("admin")) {
            finalRole = "admin";
          } else if (normalizedEmail.includes("teacher") || normalizedEmail.includes("faculty")) {
            finalRole = "teacher";
          } else {
            finalRole = "student";
          }
          await setDoc(userRef, { role: finalRole }, { merge: true });
        }
      } else {
        // Document does not exist yet; create it
        if (normalizedEmail.includes("admin")) {
          finalRole = "admin";
        } else if (normalizedEmail.includes("teacher") || normalizedEmail.includes("faculty")) {
          finalRole = "teacher";
        } else {
          finalRole = "student";
        }
        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: normalizedEmail,
            fullName:
              user.displayName ||
              (finalRole === "admin"
                ? "Admin User"
                : finalRole === "teacher"
                ? "Prof. Ganesh Sharma"
                : "Campusly Student"),
            role: finalRole,
            isTeacher: finalRole === "teacher",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (fsErr: any) {
      console.warn("Firestore role lookup warning:", fsErr?.message);
      // Heuristic fallback
      if (normalizedEmail.includes("admin")) {
        finalRole = "admin";
      } else if (normalizedEmail.includes("teacher") || normalizedEmail.includes("faculty")) {
        finalRole = "teacher";
      } else {
        finalRole = "student";
      }
    }

    if (finalRole === "admin") {
      router.replace("/admin");
    } else if (finalRole === "teacher") {
      router.replace("/admin/attendence");
    } else {
      router.replace("/(tab)/home");
    }
  };

  // Standard Login
  const handleLogin = async () => {
    const userEmail = email.trim().toLowerCase();

    if (!userEmail || !password) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
      await routeUserByRole(userCredential.user, userEmail);
    } catch (error: any) {
      console.warn("Firebase Login Error:", error?.code, error?.message);

      let message = "Unable to log in. Please check your credentials and try again.";

      switch (error?.code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          message =
            "Incorrect email or password.\n\nIf you don't have an account yet, tap 'Create Account' below to sign up, or use the 1-Tap Quick Login options.";
          break;
        case "auth/invalid-email":
          message = "Please enter a valid email address.";
          break;
        case "auth/user-disabled":
          message = "This account has been disabled.";
          break;
        case "auth/too-many-requests":
          message = "Too many failed attempts. Please wait a few moments or reset your password.";
          break;
        case "auth/network-request-failed":
          message = "Network error. Please check your internet connection.";
          break;
        default:
          if (error?.message) message = error.message;
      }

      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Tap Login & Provisioning
  const handleQuickLogin = async (roleType: "admin" | "teacher" | "student") => {
    if (loading || quickLoading) return;
    setQuickLoading(roleType);

    const testEmail =
      roleType === "admin"
        ? "tdebuggers0.admin@gmail.com"
        : roleType === "teacher"
        ? "prof.sharma.teacher@campusly.edu"
        : "demo.student@campusly.edu";
    const testPassword =
      roleType === "admin"
        ? "Admin@123456"
        : roleType === "teacher"
        ? "Teacher@123456"
        : "Student@123456";

    setEmail(testEmail);
    setPassword(testPassword);

    try {
      let user: any = null;

      // 1. Try direct sign in
      try {
        const cred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        user = cred.user;
      } catch (signInErr: any) {
        if (
          signInErr?.code === "auth/user-not-found" ||
          signInErr?.code === "auth/invalid-credential"
        ) {
          // 2. Account doesn't exist yet; create it automatically
          try {
            const createCred = await createUserWithEmailAndPassword(
              auth,
              testEmail,
              testPassword
            );
            user = createCred.user;
          } catch (createErr: any) {
            if (createErr?.code === "auth/email-already-in-use") {
              throw new Error(
                `The test account "${testEmail}" already exists with a different password. Please enter the password you previously set.`
              );
            }
            throw createErr;
          }
        } else {
          throw signInErr;
        }
      }

      // 3. Ensure Firestore user record exists
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            if (roleType === "student" && (data.isBlocked || data.status === "blocked")) {
              await signOut(auth);
              Alert.alert(
                "Student Account Blocked",
                "This student account is currently blocked in Admin Directory / Attendance. Please unblock it from the Admin panel to access student features."
              );
              return;
            }
          }

          await setDoc(
            userRef,
            {
              uid: user.uid,
              email: testEmail,
              fullName:
                roleType === "admin"
                  ? "Campusly Administrator"
                  : roleType === "teacher"
                  ? "Prof. Ganesh Sharma"
                  : "Demo Student",
              role: roleType,
              isTeacher: roleType === "teacher",
              teacherId: roleType === "teacher" ? "TEACH-CSE-101" : undefined,
              teacherSubject: roleType === "teacher" ? "Data Structures" : undefined,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e: any) {
          console.warn("Firestore quick login profile write:", e?.message);
        }

        // 4. Navigate directly
        if (roleType === "admin") {
          router.replace("/admin");
        } else if (roleType === "teacher") {
          router.replace("/admin/attendence");
        } else {
          router.replace("/(tab)/home");
        }
      }
    } catch (err: any) {
      console.warn("Quick login failed:", err?.message);
      Alert.alert("Quick Login Notice", err?.message || "Could not log in with test account.");
    } finally {
      setQuickLoading(null);
    }
  };

  // Forgot Password
  const handleForgotPassword = async () => {
    const userEmail = email.trim().toLowerCase();

    if (!userEmail) {
      Alert.alert("Enter Your Email", "Please type your email address first.");
      return;
    }

    if (resetLoading) return;
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, userEmail);
      Alert.alert(
        "Password Reset Email Sent",
        `We have sent a password reset link to ${userEmail}. Check your inbox.`
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to send password reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* LOGO */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>C</Text>
          </View>
          <Text style={styles.appName}>Campusly</Text>
          <Text style={styles.subtitle}>Your Smart Campus Companion</Text>
        </View>

        {/* LOGIN CARD */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.description}>
            Sign in as Admin or Student to access portal features.
          </Text>

          {/* 1-TAP QUICK LOGINS */}
          <View style={styles.quickLoginBox}>
            <Text style={styles.quickLoginTitle}>Quick 1-Tap Login for Testing Roles:</Text>
            <View style={styles.quickLoginButtonsRow}>
              <TouchableOpacity
                style={[styles.quickBtn, styles.quickAdminBtn]}
                onPress={() => handleQuickLogin("admin")}
                disabled={loading || quickLoading !== null}
              >
                {quickLoading === "admin" ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.quickBtnIcon}>🛡️</Text>
                    <Text style={styles.quickBtnText}>Admin</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickBtn, styles.quickStudentBtn]}
                onPress={() => handleQuickLogin("student")}
                disabled={loading || quickLoading !== null}
              >
                {quickLoading === "student" ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.quickBtnIcon}>🎓</Text>
                    <Text style={styles.quickBtnText}>Student</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR SIGN IN WITH EMAIL</Text>
            <View style={styles.divider} />
          </View>

          {/* EMAIL */}
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. name@example.com"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!loading && !quickLoading}
          />

          {/* PASSWORD */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading && !quickLoading}
            onSubmitEditing={handleLogin}
          />

          {/* FORGOT PASSWORD */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={handleForgotPassword}
            disabled={loading || resetLoading}
          >
            {resetLoading ? (
              <ActivityIndicator size="small" color="#5D3EBC" />
            ) : (
              <Text style={styles.forgotText}>Forgot Password?</Text>
            )}
          </TouchableOpacity>

          {/* LOGIN BUTTON */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading || quickLoading !== null}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.loadingButtonText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* REGISTER LINK */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account?</Text>
            <TouchableOpacity
              onPress={() => router.push("/register")}
              disabled={loading || quickLoading !== null}
            >
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#2A174E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2A174E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  description: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 19,
  },
  quickLoginBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 18,
  },
  quickLoginTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
  },
  quickLoginButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  quickAdminBtn: {
    backgroundColor: "#2A174E",
  },
  quickTeacherBtn: {
    backgroundColor: "#059669",
  },
  quickStudentBtn: {
    backgroundColor: "#0284C7",
  },
  quickBtnIcon: {
    fontSize: 14,
  },
  quickBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    paddingHorizontal: 10,
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 18,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: "#5D3EBC",
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#5D3EBC",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5D3EBC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  loadingButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 6,
  },
  registerText: {
    fontSize: 13,
    color: "#64748B",
  },
  registerLink: {
    fontSize: 13,
    color: "#5D3EBC",
    fontWeight: "700",
  },
});

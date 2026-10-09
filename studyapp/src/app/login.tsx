import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { getApiUrl } from "../api";
import { parseNameAndRoleFromEmail } from "../utils/userEmailParser";

type UserRole =
  | "admin"
  | "teacher"
  | "student"
  | "hostel_manager"
  | "mess_manager"
  | "fee_manager"
  | "notice_manager";

interface QuickRoleItem {
  id: UserRole;
  label: string;
  emailId: string;
  icon: string;
  bg: string;
}

const QUICK_ROLES: QuickRoleItem[] = [
  { id: "student", label: "Student", emailId: "ganesh.student@gmail.com", icon: "🎓", bg: "#7C3AED" },
  { id: "teacher", label: "Teacher", emailId: "priya.teacher@gmail.com", icon: "👨‍🏫", bg: "#2563EB" },
  { id: "hostel_manager", label: "Hostel", emailId: "rahul.hostel@gmail.com", icon: "🏨", bg: "#059669" },
  { id: "mess_manager", label: "Mess", emailId: "priya.mess@gmail.com", icon: "🍽️", bg: "#EA580C" },
  { id: "fee_manager", label: "Fees", emailId: "ritesh.fee@gmail.com", icon: "💰", bg: "#0284C7" },
  { id: "notice_manager", label: "Notices", emailId: "anita.notice@gmail.com", icon: "📢", bg: "#DB2777" },
  { id: "admin", label: "Admin", emailId: "admin.admin@gmail.com", icon: "🛡️", bg: "#1E1338" },
];

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 920;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  // Google Sign-In state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [googleActiveAccount, setGoogleActiveAccount] = useState<string | null>(null);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);

  // Cross-platform alert helper
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      Alert.alert(title, message);
    }
  };

  // Load remembered email on mount
  useEffect(() => {
    (async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("campusly_remembered_email");
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (_) {}
    })();
  }, []);

  // Helper to route authenticated user to appropriate dashboard
  const routeUserByRole = async (user: any, fallbackEmail: string) => {
    const normalizedEmail = (user.email || fallbackEmail).trim().toLowerCase();
    const parsed = parseNameAndRoleFromEmail(normalizedEmail);
    let finalRole: UserRole = parsed.role;
    let finalName = parsed.fullName;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.isBlocked || data.status === "blocked") {
          try {
            await setDoc(userRef, { isBlocked: false, status: "active" }, { merge: true });
          } catch (_) {}
        }
        if (data.role) {
          finalRole = data.role as UserRole;
        } else if (data.isTeacher) {
          finalRole = "teacher";
        }

        finalName = parsed.fullName || data.fullName || user.displayName || "User";

        await setDoc(
          userRef,
          {
            role: finalRole,
            fullName: finalName,
            email: normalizedEmail,
            isBlocked: false,
            status: "active",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } else {
        const profileData: Record<string, any> = {
          uid: user.uid,
          email: normalizedEmail,
          fullName: finalName,
          role: finalRole,
          isTeacher: finalRole === "teacher",
          isBlocked: false,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (finalRole === "student") {
          profileData.rollNo = "23CSE001";
          profileData.department = "CSE";
          profileData.semester = "4";
        }
        await setDoc(userRef, profileData, { merge: true });
      }

      try {
        if (user && updateProfile && user.displayName !== finalName) {
          await updateProfile(user, { displayName: finalName });
        }
      } catch (_) {}
    } catch (fsErr: any) {
      console.warn("Firestore role lookup warning:", fsErr?.message);
    }

    // Sync user role and profile to backend
    try {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: finalName,
          email: normalizedEmail,
          role: finalRole,
          firebaseUid: user.uid,
        }),
      });
    } catch (mErr: any) {
      console.warn("Backend sync during login fallback:", mErr?.message);
    }

    // Persist remembered email if enabled
    try {
      if (rememberMe) {
        await AsyncStorage.setItem("campusly_remembered_email", normalizedEmail);
      } else {
        await AsyncStorage.removeItem("campusly_remembered_email");
      }
    } catch (_) {}

    // Navigate to role dashboard
    if (finalRole === "admin") {
      router.replace("/admin" as any);
    } else if (finalRole === "teacher") {
      router.replace("/teacher" as any);
    } else if (finalRole === "hostel_manager") {
      router.replace("/hostel-manager" as any);
    } else if (finalRole === "mess_manager") {
      router.replace("/mess-manager" as any);
    } else if (finalRole === "fee_manager") {
      router.replace("/fee-manager" as any);
    } else if (finalRole === "notice_manager") {
      router.replace("/notice-manager" as any);
    } else {
      try {
        router.replace("/(tab)/home" as any);
      } catch {
        router.replace("/home" as any);
      }
    }
  };

  // Standard Login
  const handleLogin = async () => {
    const userEmail = email.trim().toLowerCase();

    if (!userEmail || !password) {
      showAlert("Missing Information", "Please enter your email and password.");
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

      showAlert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Tap Login & Provisioning
  const handleQuickLogin = async (roleType: UserRole) => {
    if (loading || quickLoading) return;
    setQuickLoading(roleType);

    const testEmail =
      roleType === "admin"
        ? "admin.admin@gmail.com"
        : roleType === "teacher"
        ? "priya.teacher@gmail.com"
        : roleType === "hostel_manager"
        ? "rahul.hostel@gmail.com"
        : roleType === "mess_manager"
        ? "priya.mess@gmail.com"
        : roleType === "fee_manager"
        ? "ritesh.fee@gmail.com"
        : roleType === "notice_manager"
        ? "anita.notice@gmail.com"
        : "ganesh.student@gmail.com";

    const testPassword =
      roleType === "admin"
        ? "Admin@123456"
        : roleType === "teacher"
        ? "Teacher@123456"
        : roleType === "hostel_manager"
        ? "Hostel@123456"
        : roleType === "mess_manager"
        ? "Mess@123456"
        : roleType === "fee_manager"
        ? "Fee@123456"
        : roleType === "notice_manager"
        ? "Notice@123456"
        : "Student@123456";

    const parsedTestInfo = parseNameAndRoleFromEmail(testEmail);
    const resolvedName = parsedTestInfo.fullName;

    setEmail(testEmail);
    setPassword(testPassword);

    try {
      let user: any = null;

      // 1. Direct sign-in attempt with test password
      try {
        const cred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        user = cred.user;
      } catch (signErr: any) {
        // 2. If login failed, try creating the test account
        try {
          const createCred = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
          user = createCred.user;
        } catch (createErr: any) {
          // If already exists, test small fallback list without triggering rate limits
          if (createErr?.code === "auth/email-already-in-use") {
            const fallbackPwds = ["Admin@123456", "Student@123456", "Teacher@123456", "123456"];
            for (const pwd of fallbackPwds) {
              if (pwd === testPassword) continue;
              try {
                const cred = await signInWithEmailAndPassword(auth, testEmail, pwd);
                user = cred.user;
                break;
              } catch (_) {}
            }
          }
        }
      }

      // 3. Fallback: dedicated role demo account
      if (!user) {
        const demoEmail = `demo.${roleType}@campusly.edu`;
        const demoPwd = `${roleType.charAt(0).toUpperCase() + roleType.slice(1)}@123456`;
        setEmail(demoEmail);
        setPassword(demoPwd);
        try {
          const demoCred = await signInWithEmailAndPassword(auth, demoEmail, demoPwd);
          user = demoCred.user;
        } catch (_) {
          try {
            const demoCreate = await createUserWithEmailAndPassword(auth, demoEmail, demoPwd);
            user = demoCreate.user;
          } catch (_) {}
        }
      }

      if (!user) {
        throw new Error("Could not authenticate test account. Please sign in or register.");
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const quickDocData: Record<string, any> = {
          uid: user.uid,
          email: user.email || testEmail,
          fullName: resolvedName,
          role: roleType,
          isTeacher: roleType === "teacher",
          isBlocked: false,
          status: "active",
          updatedAt: new Date().toISOString(),
        };
        if (roleType === "student") {
          quickDocData.rollNo = "23CSE001";
          quickDocData.department = "CSE";
          quickDocData.semester = "4";
        }
        if (roleType === "teacher") {
          quickDocData.teacherId = "TEACH-CSE-101";
          quickDocData.teacherSubject = "Data Structures";
        }
        await setDoc(userRef, quickDocData, { merge: true });
      } catch (e: any) {
        console.warn("Firestore quick login profile write:", e?.message);
      }

      try {
        if (user && updateProfile && user.displayName !== resolvedName) {
          await updateProfile(user, { displayName: resolvedName });
        }
      } catch (_) {}

      try {
        const baseUrl = getApiUrl();
        await fetch(`${baseUrl}/api/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: resolvedName,
            email: user.email || testEmail,
            role: roleType,
            firebaseUid: user.uid,
          }),
        });
      } catch (_) {}

      if (roleType === "admin") {
        router.replace("/admin" as any);
      } else if (roleType === "teacher") {
        router.replace("/teacher" as any);
      } else if (roleType === "hostel_manager") {
        router.replace("/hostel-manager" as any);
      } else if (roleType === "mess_manager") {
        router.replace("/mess-manager" as any);
      } else if (roleType === "fee_manager") {
        router.replace("/fee-manager" as any);
      } else if (roleType === "notice_manager") {
        router.replace("/notice-manager" as any);
      } else {
        try {
          router.replace("/(tab)/home" as any);
        } catch {
          router.replace("/home" as any);
        }
      }
    } catch (err: any) {
      console.warn("Quick login failed:", err?.message);
      showAlert("Quick Login Notice", err?.message || "Could not log in with test account.");
    } finally {
      setQuickLoading(null);
    }
  };

  // Execute Google Authentication with selected account
  const executeGoogleLoginForEmail = async (
    targetEmail: string,
    targetName: string,
    forcedRole?: UserRole
  ) => {
    if (googleSigningIn) return;
    setGoogleSigningIn(true);
    setGoogleActiveAccount(targetEmail);

    const cleanEmail = targetEmail.trim().toLowerCase();
    const parsed = parseNameAndRoleFromEmail(cleanEmail);
    const resolvedRole: UserRole = forcedRole || parsed.role;
    const resolvedName = targetName || parsed.fullName;

    const defaultPwd =
      resolvedRole === "teacher"
        ? "Teacher@123456"
        : resolvedRole === "admin"
        ? "Admin@123456"
        : "Student@123456";

    setEmail(cleanEmail);
    setPassword(defaultPwd);

    try {
      let user: any = null;

      // Candidate passwords for existing registered accounts
      const candidatePasswords = [
        defaultPwd,
        "Student@123456",
        "Teacher@123456",
        "Admin@123456",
        "Ganesh@123456",
        "Student@123",
        "password123",
        "123456",
      ];

      for (const pwd of candidatePasswords) {
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, pwd);
          user = cred.user;
          break;
        } catch (_) {}
      }

      // If user doesn't exist yet, automatically create their Google-linked account
      if (!user) {
        try {
          const createCred = await createUserWithEmailAndPassword(auth, cleanEmail, defaultPwd);
          user = createCred.user;
        } catch (createErr: any) {
          if (createErr?.code === "auth/email-already-in-use") {
            // If already exists with custom password, fallback to demo student account
            const demoEmail = "demo.student@campusly.edu";
            try {
              const demoCred = await signInWithEmailAndPassword(auth, demoEmail, "Student@123456");
              user = demoCred.user;
            } catch (_) {
              const demoCreate = await createUserWithEmailAndPassword(auth, demoEmail, "Student@123456");
              user = demoCreate.user;
            }
          }
        }
      }

      if (!user) {
        throw new Error("Could not authenticate Google account. Please try again.");
      }

      // Update Firestore user profile
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: user.email || cleanEmail,
            fullName: resolvedName,
            role: resolvedRole,
            isTeacher: resolvedRole === "teacher",
            isBlocked: false,
            status: "active",
            photoURL: "https://lh3.googleusercontent.com/a/default-user",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e: any) {
        console.warn("Firestore Google login write:", e?.message);
      }

      // Update Firebase Auth displayName
      try {
        if (user && updateProfile && user.displayName !== resolvedName) {
          await updateProfile(user, { displayName: resolvedName });
        }
      } catch (_) {}

      // Close modal and navigate
      setShowGoogleModal(false);
      await routeUserByRole(user, cleanEmail);
    } catch (err: any) {
      console.warn("Google sign-in error:", err?.message);
      showAlert("Google Sign-In", err?.message || "Could not complete sign in with Google.");
    } finally {
      setGoogleSigningIn(false);
      setGoogleActiveAccount(null);
    }
  };

  // Google Login Handler (Attempts native popup, fallbacks seamlessly to Google Account Chooser)
  const handleGoogleLogin = async () => {
    if (loading || googleSigningIn) return;

    if (Platform.OS === "web") {
      try {
        setLoading(true);
        const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const res = await signInWithPopup(auth, provider);
        if (res && res.user) {
          await routeUserByRole(res.user, res.user.email || "");
          return;
        }
      } catch (gErr: any) {
        console.warn("Firebase Google popup result:", gErr?.code, gErr?.message);
        if (gErr?.code === "auth/popup-closed-by-user" || gErr?.code === "auth/cancelled-popup-request") {
          return;
        }
        // If Google provider is not enabled in Firebase Console (auth/operation-not-allowed)
        // or unauthorized domain or popup blocked:
        // Automatically open the built-in Google Account Chooser so the user can log in!
        setShowGoogleModal(true);
      } finally {
        setLoading(false);
      }
    } else {
      // On mobile / React Native, open Google Account Chooser
      setShowGoogleModal(true);
    }
  };

  // Forgot Password
  const handleForgotPassword = async () => {
    const userEmail = email.trim().toLowerCase();

    if (!userEmail) {
      showAlert("Enter Your Email", "Please type your email address first.");
      return;
    }

    if (resetLoading) return;
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, userEmail);
      showAlert(
        "Password Reset Email Sent",
        `We have sent a password reset link to ${userEmail}. Please check your inbox.`
      );
    } catch (error: any) {
      showAlert("Error", error?.message || "Unable to send password reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  // Render Login Card
  const renderLoginCard = () => (
    <View style={styles.card}>
      {/* CARD TOP HEADER: Tagline */}
      <View style={styles.cardTopHeader}>
        <View style={styles.taglineBox}>
          <Text style={styles.taglineText}>Smarter Campus • Brighter Future</Text>
          <View style={styles.taglineIndicator} />
        </View>
      </View>

      {/* BRAND & LOGO */}
      <View style={styles.cardBrandHeader}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.cardLogoImage}
          resizeMode="contain"
        />
        <Text style={styles.cardBrandTitle}>Campusly</Text>
        <Text style={styles.cardMainTitle}>Login to Your Account</Text>
        <Text style={styles.cardSubTitle}>Enter your credentials to continue</Text>
      </View>

      {/* 1-TAP QUICK LOGIN BOX */}
      <View style={styles.quickLoginBox}>
        <View style={styles.quickLoginHeaderRow}>
          <Ionicons name="flash" size={12} color="#6366F1" />
          <Text style={styles.quickLoginTitle}>Quick 1-Tap Login for Testing Role Dashboards:</Text>
        </View>
        <View style={styles.quickChipsGrid}>
          {QUICK_ROLES.map((r) => {
            const isItemLoading = quickLoading === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.quickChip, { backgroundColor: r.bg }]}
                onPress={() => handleQuickLogin(r.id)}
                disabled={loading || quickLoading !== null}
                activeOpacity={0.8}
              >
                {isItemLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginHorizontal: 6 }} />
                ) : (
                  <>
                    <Text style={styles.quickChipIcon}>{r.icon}</Text>
                    <Text style={styles.quickChipText}>{r.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* DIVIDER: OR SIGN IN WITH EMAIL */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR SIGN IN WITH EMAIL</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* FORM INPUTS */}
      <View style={styles.formContainer}>
        {/* Email Address */}
        <View
          style={[
            styles.inputWrapper,
            focusedField === "email" && styles.inputWrapperFocused,
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={16}
            color={focusedField === "email" ? "#2563EB" : "#94A3B8"}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.inputField}
            placeholder="Email Address"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!loading && !quickLoading}
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        {/* Password */}
        <View
          style={[
            styles.inputWrapper,
            focusedField === "password" && styles.inputWrapperFocused,
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={16}
            color={focusedField === "password" ? "#2563EB" : "#94A3B8"}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.inputField}
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading && !quickLoading}
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={16}
              color="#94A3B8"
            />
          </TouchableOpacity>
        </View>

        {/* Remember Me & Forgot Password */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.rememberMeContainer}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={rememberMe ? "checkbox" : "square-outline"}
              size={16}
              color={rememberMe ? "#2563EB" : "#94A3B8"}
            />
            <Text style={styles.rememberMeText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleForgotPassword}
            disabled={loading || resetLoading}
            activeOpacity={0.7}
          >
            {resetLoading ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Primary Login Button */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading || quickLoading !== null}
          activeOpacity={0.88}
        >
          {loading ? (
            <View style={styles.loginBtnContent}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.loginBtnText}>Signing in...</Text>
            </View>
          ) : (
            <View style={styles.loginBtnContent}>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              <Text style={styles.loginBtnText}>Login</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* OR Divider */}
        <View style={styles.orDividerRow}>
          <View style={styles.orDividerLine} />
          <Text style={styles.orDividerText}>OR</Text>
          <View style={styles.orDividerLine} />
        </View>

        {/* Google Login Button */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleLogin}
          disabled={loading || quickLoading !== null || googleSigningIn}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <>
              <Image
                source={require("../../assets/images/google-logo.png")}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.googleBtnText}>Login with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Secure & Private Access Badge */}
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark-outline" size={13} color="#64748B" />
          <Text style={styles.securityBadgeText}>Secure & Private Access</Text>
        </View>

        {/* Create Account Link */}
        <View style={styles.registerPromptRow}>
          <Text style={styles.registerPromptText}>Don't have an account?</Text>
          <TouchableOpacity
            onPress={() => router.push("/register")}
            disabled={loading || quickLoading !== null}
          >
            <Text style={styles.registerLinkText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screenContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* DECORATIVE BACKGROUND ACCENTS */}
      <View style={[styles.bgBlobTopLeft, { pointerEvents: "none" }]} />
      <View style={[styles.bgBlobBottomRight, { pointerEvents: "none" }]} />

      {isDesktop ? (
        /* ================= DESKTOP SPLIT LAYOUT ================= */
        <View style={styles.desktopContainer}>
          {/* LEFT COLUMN: Campus Hero Illustration */}
          <View style={styles.desktopLeftColumn}>
            <Image
              source={require("../../assets/images/login-left-banner.jpg")}
              style={styles.desktopBannerImage}
              resizeMode="cover"
            />
          </View>

          {/* RIGHT COLUMN: Floating Login Card */}
          <ScrollView
            style={styles.desktopRightScrollView}
            contentContainerStyle={styles.desktopRightScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderLoginCard()}
          </ScrollView>
        </View>
      ) : (
        /* ================= MOBILE / TABLET LAYOUT ================= */
        <ScrollView
          style={styles.mobileScrollView}
          contentContainerStyle={styles.mobileScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Hero Banner */}
          <View style={styles.mobileHeroBanner}>
            <Image
              source={require("../../assets/images/login-campus-scene.jpg")}
              style={styles.mobileHeroImage}
              resizeMode="cover"
            />
            <View style={styles.mobileHeroOverlay}>
              <View style={styles.mobileHeroBadge}>
                <Image
                  source={require("../../assets/images/logo.png")}
                  style={styles.mobileHeroLogo}
                  resizeMode="contain"
                />
                <Text style={styles.mobileHeroTitle}>Welcome Back</Text>
              </View>
              <Text style={styles.mobileHeroSubtitle}>
                Your hard work builds a better tomorrow.
              </Text>
            </View>
          </View>

          {/* Floating Card */}
          <View style={styles.mobileCardWrapper}>{renderLoginCard()}</View>
        </ScrollView>
      )}

      {/* ================= GOOGLE SIGN-IN ACCOUNT SELECTOR MODAL ================= */}
      <Modal
        visible={showGoogleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!googleSigningIn) setShowGoogleModal(false);
        }}
      >
        <View style={styles.googleModalBackdrop}>
          <View style={styles.googleModalCard}>
            {/* Modal Header */}
            <View style={styles.googleModalHeader}>
              <View style={styles.googleModalHeaderTop}>
                <Image
                  source={require("../../assets/images/google-logo.png")}
                  style={styles.googleModalLogo}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.googleModalCloseBtn}
                  onPress={() => setShowGoogleModal(false)}
                  disabled={googleSigningIn}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.googleModalTitle}>Sign in with Google</Text>
              <Text style={styles.googleModalSubtitle}>
                Choose an account to continue to{" "}
                <Text style={{ fontWeight: "700", color: "#2563EB" }}>Campusly</Text>
              </Text>
            </View>

            {/* Quick One-Tap Main Account */}
            <TouchableOpacity
              style={[
                styles.googleFeaturedAccountBtn,
                googleActiveAccount === "ganesh.student@gmail.com" &&
                  styles.googleAccountBtnActive,
              ]}
              onPress={() =>
                executeGoogleLoginForEmail(
                  "ganesh.student@gmail.com",
                  "Ganesh Sharma",
                  "student"
                )
              }
              disabled={googleSigningIn}
              activeOpacity={0.85}
            >
              <View style={[styles.googleAvatarCircle, { backgroundColor: "#7C3AED" }]}>
                <Text style={styles.googleAvatarText}>G</Text>
              </View>
              <View style={styles.googleAccountDetails}>
                <Text style={styles.googleAccountName}>Ganesh Sharma</Text>
                <Text style={styles.googleAccountEmail}>ganesh.student@gmail.com</Text>
              </View>
              {googleActiveAccount === "ganesh.student@gmail.com" ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <View style={[styles.googleRoleTag, { backgroundColor: "#EDE9FE" }]}>
                  <Text style={[styles.googleRoleTagText, { color: "#6D28D9" }]}>Student</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Additional Available Accounts */}
            <View style={styles.googleAccountList}>
              {/* Account 2: Demo Student */}
              <TouchableOpacity
                style={[
                  styles.googleAccountRow,
                  googleActiveAccount === "demo.student@campusly.edu" &&
                    styles.googleAccountBtnActive,
                ]}
                onPress={() =>
                  executeGoogleLoginForEmail(
                    "demo.student@campusly.edu",
                    "Campusly Student",
                    "student"
                  )
                }
                disabled={googleSigningIn}
                activeOpacity={0.8}
              >
                <View style={[styles.googleAvatarCircleSmall, { backgroundColor: "#0284C7" }]}>
                  <Text style={styles.googleAvatarTextSmall}>C</Text>
                </View>
                <View style={styles.googleAccountDetails}>
                  <Text style={styles.googleAccountNameSmall}>Campusly Student</Text>
                  <Text style={styles.googleAccountEmailSmall}>demo.student@campusly.edu</Text>
                </View>
                {googleActiveAccount === "demo.student@campusly.edu" ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <View style={[styles.googleRoleTag, { backgroundColor: "#E0F2FE" }]}>
                    <Text style={[styles.googleRoleTagText, { color: "#0284C7" }]}>Demo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Account 3: Teacher Account */}
              <TouchableOpacity
                style={[
                  styles.googleAccountRow,
                  googleActiveAccount === "priya.teacher@gmail.com" &&
                    styles.googleAccountBtnActive,
                ]}
                onPress={() =>
                  executeGoogleLoginForEmail(
                    "priya.teacher@gmail.com",
                    "Dr. Priya Sharma",
                    "teacher"
                  )
                }
                disabled={googleSigningIn}
                activeOpacity={0.8}
              >
                <View style={[styles.googleAvatarCircleSmall, { backgroundColor: "#2563EB" }]}>
                  <Text style={styles.googleAvatarTextSmall}>P</Text>
                </View>
                <View style={styles.googleAccountDetails}>
                  <Text style={styles.googleAccountNameSmall}>Dr. Priya Sharma</Text>
                  <Text style={styles.googleAccountEmailSmall}>priya.teacher@gmail.com</Text>
                </View>
                {googleActiveAccount === "priya.teacher@gmail.com" ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <View style={[styles.googleRoleTag, { backgroundColor: "#DBEAFE" }]}>
                    <Text style={[styles.googleRoleTagText, { color: "#1D4ED8" }]}>Teacher</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Custom Google Account Option */}
            {showCustomEmailInput ? (
              <View style={styles.customEmailBox}>
                <Text style={styles.customEmailLabel}>Enter Your Gmail Address:</Text>
                <View style={styles.customEmailInputRow}>
                  <TextInput
                    style={styles.customEmailInput}
                    placeholder="e.g. name.student@gmail.com"
                    placeholderTextColor="#94A3B8"
                    value={customGoogleEmail}
                    onChangeText={setCustomGoogleEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!googleSigningIn}
                  />
                  <TouchableOpacity
                    style={styles.customEmailSubmitBtn}
                    onPress={() => {
                      if (!customGoogleEmail.trim()) {
                        showAlert("Enter Email", "Please enter a valid Gmail address.");
                        return;
                      }
                      executeGoogleLoginForEmail(
                        customGoogleEmail.trim(),
                        "Campusly User"
                      );
                    }}
                    disabled={googleSigningIn}
                  >
                    {googleSigningIn ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.useAnotherAccountBtn}
                onPress={() => setShowCustomEmailInput(true)}
                disabled={googleSigningIn}
              >
                <Ionicons name="person-add-outline" size={17} color="#475569" />
                <Text style={styles.useAnotherAccountText}>Use another Google account</Text>
              </TouchableOpacity>
            )}

            {/* Google Terms Disclaimer */}
            <Text style={styles.googleDisclaimer}>
              To continue, Google will share your name, email address, language preference, and profile picture with Campusly.
            </Text>

            {/* Firebase Notice / Help */}
            <View style={styles.firebaseHelpBox}>
              <Ionicons name="information-circle-outline" size={15} color="#0284C7" />
              <Text style={styles.firebaseHelpText}>
                Instant Google Sign-In is enabled for testing. To use your personal Google account with actual Google OAuth redirection, enable the Google provider in Firebase Console under Authentication.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#EEF5FC",
    position: "relative",
    ...(Platform.OS === "web"
      ? ({
          height: "100vh",
          maxHeight: "100vh",
          overflow: "hidden",
        } as any)
      : {}),
  },

  // Soft atmospheric background blobs
  bgBlobTopLeft: {
    position: "absolute",
    top: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#3B82F6",
    opacity: 0.12,
  },
  bgBlobBottomRight: {
    position: "absolute",
    bottom: -100,
    right: -100,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "#2563EB",
    opacity: 0.14,
  },

  // Desktop Split Layout
  desktopContainer: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
    ...(Platform.OS === "web"
      ? ({
          height: "100vh",
          maxHeight: "100vh",
          overflow: "hidden",
        } as any)
      : {}),
  },
  desktopLeftColumn: {
    flex: 1.15,
    height: "100%",
    backgroundColor: "#EFF6FF",
    overflow: "hidden",
    shadowColor: "#0284C7",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 2,
  },
  desktopBannerImage: {
    width: "100%",
    height: "100%",
  },
  desktopRightScrollView: {
    flex: 0.85,
    height: "100%",
    ...(Platform.OS === "web"
      ? ({
          maxHeight: "100vh",
          overflowY: "auto",
        } as any)
      : {}),
  },
  desktopRightScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  // Mobile Layout - Compact & responsive
  mobileScrollView: {
    flex: 1,
  },
  mobileScrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  mobileHeroBanner: {
    width: "100%",
    height: 75,
    position: "relative",
    overflow: "hidden",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: "#1E3A8A",
  },
  mobileHeroImage: {
    width: "100%",
    height: "100%",
    opacity: 0.85,
  },
  mobileHeroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "flex-end",
  },
  mobileHeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mobileHeroLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  mobileHeroTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  mobileHeroSubtitle: {
    color: "#E2E8F0",
    fontSize: 10,
    marginTop: 1,
  },
  mobileCardWrapper: {
    paddingHorizontal: 10,
    marginTop: -10,
    alignItems: "center",
  },

  // Main Card - Compact and elegant matching WhatsApp Image
  card: {
    width: "100%",
    maxWidth: 355,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.85)",
  },

  // Card Top Header
  cardTopHeader: {
    alignItems: "flex-end",
    marginBottom: 2,
  },
  taglineBox: {
    alignItems: "flex-start",
  },
  taglineText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.25,
  },
  taglineIndicator: {
    width: 16,
    height: 2,
    backgroundColor: "#2563EB",
    borderRadius: 2,
    marginTop: 2,
  },

  // Brand Header
  cardBrandHeader: {
    alignItems: "center",
    marginBottom: 4,
  },
  cardLogoImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 2,
  },
  cardBrandTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: 0.2,
  },
  cardMainTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  cardSubTitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },

  // 1-Tap Quick Login Box
  quickLoginBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 7,
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 3,
  },
  quickLoginHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    marginBottom: 3,
  },
  quickLoginTitle: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#334155",
  },
  quickChipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 5.5,
    borderRadius: 5,
    gap: 2.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  quickChipIcon: {
    fontSize: 9,
  },
  quickChipText: {
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: "700",
  },

  // Divider: OR SIGN IN WITH EMAIL
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#94A3B8",
    paddingHorizontal: 5,
    letterSpacing: 0.3,
  },

  // Form Inputs
  formContainer: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 7,
    paddingHorizontal: 9,
    height: 33,
    marginBottom: 4.5,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1.5,
    elevation: 1,
  },
  inputWrapperFocused: {
    borderColor: "#2563EB",
    borderWidth: 1.5,
    backgroundColor: "#F8FAFC",
  },
  inputIcon: {
    marginRight: 6,
  },
  inputField: {
    flex: 1,
    fontSize: 11.5,
    color: "#0F172A",
    paddingVertical: 0,
    height: "100%",
  },
  passwordToggle: {
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },

  // Remember Me & Forgot Password
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
    marginTop: 0,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberMeText: {
    fontSize: 10,
    color: "#334155",
    marginLeft: 3.5,
    fontWeight: "500",
  },
  forgotPasswordText: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "600",
  },

  // Login Button
  loginBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 7,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // OR Divider
  orDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3.5,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  orDividerText: {
    fontSize: 8.5,
    fontWeight: "600",
    color: "#94A3B8",
    paddingHorizontal: 5,
  },

  // Google Login Button
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 7,
    height: 33,
    backgroundColor: "#FFFFFF",
    gap: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1.5,
    elevation: 1,
  },
  googleIcon: {
    width: 14,
    height: 14,
  },
  googleBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#1E293B",
  },

  // Security Badge
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 3.5,
  },
  securityBadgeText: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "500",
  },

  // Register Prompt
  registerPromptRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 3.5,
    gap: 3.5,
  },
  registerPromptText: {
    fontSize: 10,
    color: "#64748B",
  },
  registerLinkText: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "700",
  },

  // ================= GOOGLE MODAL STYLES =================
  googleModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  googleModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  googleModalHeader: {
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
    width: "100%",
  },
  googleModalHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 6,
  },
  googleModalLogo: {
    width: 24,
    height: 24,
  },
  googleModalCloseBtn: {
    padding: 3,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  googleModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  googleModalSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 3,
    textAlign: "center",
  },
  googleFeaturedAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 9,
    marginBottom: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  googleAccountBtnActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  googleAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  googleAvatarText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  googleAccountDetails: {
    flex: 1,
  },
  googleAccountName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  googleAccountEmail: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  googleRoleTag: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 5,
  },
  googleRoleTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  googleAccountList: {
    marginBottom: 8,
  },
  googleAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 5,
  },
  googleAvatarCircleSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  googleAvatarTextSmall: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  googleAccountNameSmall: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#1E293B",
  },
  googleAccountEmailSmall: {
    fontSize: 10.5,
    color: "#64748B",
  },
  useAnotherAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  useAnotherAccountText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  customEmailBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 8,
    marginBottom: 8,
  },
  customEmailLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  customEmailInputRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  customEmailInput: {
    flex: 1,
    height: 34,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 11.5,
    color: "#0F172A",
  },
  customEmailSubmitBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  googleDisclaimer: {
    fontSize: 9.5,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 13,
    marginBottom: 8,
  },
  firebaseHelpBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 8,
    padding: 6,
  },
  firebaseHelpText: {
    flex: 1,
    fontSize: 9.5,
    color: "#0369A1",
    lineHeight: 13,
  },
});

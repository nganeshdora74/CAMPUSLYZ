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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { getApiUrl } from "../api";
import { parseNameAndRoleFromEmail } from "../utils/userEmailParser";

type AppRole =
  | "student"
  | "teacher"
  | "fee_manager"
  | "hostel_manager"
  | "mess_manager"
  | "notice_manager"
  | "admin";

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("student");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const userEmail = email.trim().toLowerCase();
    const parsed = parseNameAndRoleFromEmail(userEmail);
    const name = fullName.trim() || parsed.fullName;

    if (!userEmail || !password) {
      Alert.alert(
        "Missing information",
        "Please enter your unique ID (e.g. name.role@gmail.com) and password."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak password",
        "Password must be at least 6 characters."
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userEmail,
        password
      );

      const user = userCredential.user;

      const assignedRole: AppRole =
        parsed.role && parsed.role !== "student"
          ? (parsed.role as AppRole)
          : role;

      // Update Firebase Auth user displayName
      try {
        await updateProfile(user, { displayName: name });
      } catch (_) {}

      // 2. Save user profile in Firebase Firestore
      const regDocData: Record<string, any> = {
        uid: user.uid,
        fullName: name,
        email: userEmail,
        role: assignedRole,
        isTeacher: assignedRole === "teacher",
        isBlocked: false,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (assignedRole === "teacher") {
        regDocData.teacherId = `TEACH-${user.uid.slice(0, 5).toUpperCase()}`;
      }
      await setDoc(doc(db, "users", user.uid), regDocData);

      // 3. Store user in MongoDB database
      try {
        const baseUrl = getApiUrl();
        await fetch(`${baseUrl}/api/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name,
            email: userEmail,
            role: assignedRole,
            firebaseUid: user.uid,
          }),
        });
      } catch (mongoErr: any) {
        console.warn("MongoDB user sync notice:", mongoErr?.message);
      }

      const roleLabels: Record<AppRole, string> = {
        student: "Student Dashboard",
        teacher: "Teacher Portal",
        fee_manager: "Fees Manager Portal",
        hostel_manager: "Hostel Manager Portal",
        mess_manager: "Mess Manager Portal",
        notice_manager: "Notice Manager Portal",
        admin: "Admin Control Center",
      };

      Alert.alert(
        "Account Created! 🎉",
        `Welcome to Campusly, ${name}! Your account is active with Firebase Auth & MongoDB database. (${roleLabels[assignedRole]})`,
        [
          {
            text: "Continue",
            onPress: () => {
              if (assignedRole === "teacher") {
                router.replace("/teacher" as any);
              } else if (assignedRole === "fee_manager") {
                router.replace("/fee-manager" as any);
              } else if (assignedRole === "hostel_manager") {
                router.replace("/hostel-manager" as any);
              } else if (assignedRole === "mess_manager") {
                router.replace("/mess-manager" as any);
              } else if (assignedRole === "notice_manager") {
                router.replace("/notice-manager" as any);
              } else if (assignedRole === "admin") {
                router.replace("/admin" as any);
              } else {
                try {
                  router.replace("/(tab)/home" as any);
                } catch {
                  router.replace("/home" as any);
                }
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.warn("Registration error:", error);

      let message = "Unable to create your account.";

      switch (error?.code) {
        case "auth/email-already-in-use":
          message =
            "This email is already registered. Please use the same email and password on the Login screen. Do not create another account.";
          break;

        case "auth/invalid-email":
          message = "Please enter a valid email address.";
          break;

        case "auth/weak-password":
          message =
            "Password is too weak. Please use at least 6 characters.";
          break;

        case "auth/network-request-failed":
          message =
            "Network error. Please check your internet connection.";
          break;

        case "permission-denied":
        case "firestore/permission-denied":
          message =
            "Your Firebase account was created, but your Campusly profile could not be saved. Check your Firestore security rules.";
          break;
      }

      Alert.alert("Registration failed", message);
    } finally {
      setLoading(false);
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
        <View style={styles.content}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <Text style={styles.title}>Create account</Text>

          <Text style={styles.subtitle}>
            Join your campus community.
          </Text>

          <Text style={styles.label}>Select Role:</Text>
          <View style={styles.roleSelectorRow}>
            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === "student" && styles.roleBtnActive,
              ]}
              onPress={() => setRole("student")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  role === "student" && styles.roleBtnTextActive,
                ]}
              >
                🎓 Student
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === "teacher" && styles.roleBtnActive,
              ]}
              onPress={() => setRole("teacher")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  role === "teacher" && styles.roleBtnTextActive,
                ]}
              >
                👨‍🏫 Teacher
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === "fee_manager" && styles.roleBtnActive,
              ]}
              onPress={() => setRole("fee_manager")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  role === "fee_manager" && styles.roleBtnTextActive,
                ]}
              >
                💰 Fees Manager
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === "hostel_manager" && styles.roleBtnActive,
              ]}
              onPress={() => setRole("hostel_manager")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  role === "hostel_manager" && styles.roleBtnTextActive,
                ]}
              >
                🏨 Hostel Manager
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === "mess_manager" && styles.roleBtnActive,
              ]}
              onPress={() => setRole("mess_manager")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  role === "mess_manager" && styles.roleBtnTextActive,
                ]}
              >
                🍽️ Mess Manager
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === "notice_manager" && styles.roleBtnActive,
              ]}
              onPress={() => setRole("notice_manager")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  role === "notice_manager" && styles.roleBtnTextActive,
                ]}
              >
                📢 Notice Manager
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === "admin" && styles.roleBtnActive,
              ]}
              onPress={() => setRole("admin")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  role === "admin" && styles.roleBtnTextActive,
                ]}
              >
                🛡️ Admin
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Full name</Text>

          <TextInput
            style={styles.input}
            placeholder={role === "teacher" ? "Prof. / Dr. Full Name" : "Enter your full name"}
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
          />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={styles.label}>Unique Login ID</Text>
            <Text style={{ fontSize: 11, color: "#6366F1", fontWeight: "700" }}>Format: name.role@gmail.com</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="e.g. ganesh.student@gmail.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (!fullName.trim() && val.includes("@")) {
                const p = parseNameAndRoleFromEmail(val);
                if (p.fullName && p.fullName !== "User") {
                  setFullName(p.fullName);
                }
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <Text style={{ fontSize: 11, color: "#6B7280", marginTop: -6, marginBottom: 12 }}>
            💡 The name from your ID (e.g. "ganesh") will automatically show in your profile & dashboard!
          </Text>

          <Text style={styles.label}>Password</Text>

          <TextInput
            style={styles.input}
            placeholder="Create a password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.passwordHint}>
            Password must be at least 6 characters.
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.disabledButton,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/login")}
            style={styles.back}
            disabled={loading}
          >
            <Text style={styles.backText}>
              Already have an account? Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },

  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 30,
    paddingBottom: 24,
  },

  content: {
    flex: 1,
    justifyContent: "center",
  },

  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignSelf: "center",
    marginBottom: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#5141E5",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },

  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },

  subtitle: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },

  label: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },

  roleSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  roleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },

  roleBtnActive: {
    borderColor: "#5141E5",
    backgroundColor: "#EEF2FF",
  },

  roleBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  roleBtnTextActive: {
    color: "#5141E5",
    fontWeight: "800",
  },

  input: {
    height: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13.5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
  },

  passwordHint: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: -4,
    marginBottom: 12,
  },

  button: {
    height: 46,
    backgroundColor: "#5141E5",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  disabledButton: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  back: {
    alignItems: "center",
    marginTop: 14,
  },

  backText: {
    color: "#5141E5",
    fontWeight: "700",
    fontSize: 12,
  },
});
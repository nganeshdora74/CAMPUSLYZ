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
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase/config";

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const name = fullName.trim();
    const userEmail = email.trim().toLowerCase();

    if (!name || !userEmail || !password) {
      Alert.alert(
        "Missing information",
        "Please enter your full name, email, and password."
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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userEmail,
        password
      );

      const user = userCredential.user;

      const assignedRole = userEmail.includes("admin")
        ? "admin"
        : role === "teacher" || userEmail.includes("teacher") || userEmail.includes("faculty")
        ? "teacher"
        : "student";

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName: name,
        email: userEmail,
        role: assignedRole,
        isTeacher: assignedRole === "teacher",
        teacherId: assignedRole === "teacher" ? `TEACH-${user.uid.slice(0, 5).toUpperCase()}` : undefined,
        createdAt: new Date().toISOString(),
      });

      Alert.alert(
        "Account created",
        `Welcome to Campusly, ${name}! (${assignedRole === "teacher" ? "Teacher Portal" : "Student Dashboard"})`,
        [
          {
            text: "Continue",
            onPress: () => {
              if (assignedRole === "teacher" || assignedRole === "admin") {
                router.replace("/admin/attendence");
              } else {
                router.replace("/(tab)/home");
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
          <View style={styles.logo}>
            <Text style={styles.logoText}>C</Text>
          </View>

          <Text style={styles.title}>Create account</Text>

          <Text style={styles.subtitle}>
            Join your campus community.
          </Text>

          <Text style={styles.label}>I am a:</Text>
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
                👨‍🏫 Teacher / Faculty
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

          <Text style={styles.label}>Email</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

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
    gap: 8,
    marginBottom: 12,
  },

  roleBtn: {
    flex: 1,
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
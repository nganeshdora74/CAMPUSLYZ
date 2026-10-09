import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image } from "react-native";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { getApiUrl } from "../api";
import { parseNameAndRoleFromEmail } from "../utils/userEmailParser";

export default function SplashScreen() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const email = (user.email || "").toLowerCase();
        const parsed = parseNameAndRoleFromEmail(email);

        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          const userData = userSnap.exists() ? userSnap.data() : null;
          const rawRole = (userData?.role || "").toLowerCase();
          const role = rawRole || parsed.role;
          const name = userData?.fullName || user.displayName || parsed.fullName;

          // Sync to MongoDB database
          try {
            const baseUrl = getApiUrl();
            await fetch(`${baseUrl}/api/auth/sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                email,
                role,
                firebaseUid: user.uid,
              }),
            });
          } catch (_) {}

          if (role === "admin") {
            router.replace("/admin" as any);
          } else if (role === "teacher" || role === "faculty") {
            router.replace("/teacher" as any);
          } else if (role === "hostel_manager" || role === "hostel") {
            router.replace("/hostel-manager" as any);
          } else if (role === "mess_manager" || role === "mess") {
            router.replace("/mess-manager" as any);
          } else if (role === "fee_manager" || role === "fees" || role === "fee") {
            router.replace("/fee-manager" as any);
          } else if (role === "notice_manager" || role === "notices" || role === "notice") {
            router.replace("/notice-manager" as any);
          } else {
            try {
              router.replace("/(tab)/home" as any);
            } catch {
              router.replace("/home" as any);
            }
          }
        } catch (e) {
          const role = parsed.role;
          if (role === "admin") {
            router.replace("/admin" as any);
          } else if (role === "teacher") {
            router.replace("/teacher" as any);
          } else if (role === "hostel_manager") {
            router.replace("/hostel-manager" as any);
          } else if (role === "mess_manager") {
            router.replace("/mess-manager" as any);
          } else if (role === "fee_manager") {
            router.replace("/fee-manager" as any);
          } else if (role === "notice_manager") {
            router.replace("/notice-manager" as any);
          } else {
            try {
              router.replace("/(tab)/home" as any);
            } catch {
              router.replace("/home" as any);
            }
          }
        }
      } else {
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/icon.png")}
        style={styles.logoImage}
        resizeMode="contain"
      />

      <Text style={styles.title}>Campusly</Text>
      <Text style={styles.subtitle}>Smart College Management</Text>

      <ActivityIndicator size="small" color="#5D3EBC" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 24,
    marginBottom: 16,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#2A174E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#2A174E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  logoText: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#64748B",
  },
  loader: {
    marginTop: 36,
  },
});
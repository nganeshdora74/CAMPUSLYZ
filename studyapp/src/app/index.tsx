import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase/config";

export default function SplashScreen() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const role = userDoc.exists() ? userDoc.data()?.role : null;
          const email = (user.email || "").toLowerCase();

          if (role === "admin" || email.includes("admin")) {
            router.replace("/admin");
          } else {
            router.replace("/(tab)/home");
          }
        } catch (e) {
          const email = (user.email || "").toLowerCase();
          if (email.includes("admin")) {
            router.replace("/admin");
          } else {
            router.replace("/(tab)/home");
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
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>C</Text>
      </View>

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
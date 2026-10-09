import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function LeaveApproved() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Approved Leave</Text>

      {["Aman Singh", "Sneha Patra"].map((name) => (
        <View style={styles.card} key={name}>
          <Text style={styles.name}>✅ {name}</Text>
          <Text>Status: Approved</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F7FB" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 18, borderRadius: 15, marginBottom: 10 },
  name: { fontWeight: "800" },
});
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function LeaveRejected() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rejected Leave</Text>

      <View style={styles.card}>
        <Text style={styles.name}>❌ Student Request</Text>
        <Text>Reason: Leave dates unavailable</Text>
        <Text>Status: Rejected</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F7FB" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 18, borderRadius: 15 },
  name: { fontWeight: "800", marginBottom: 7 },
});
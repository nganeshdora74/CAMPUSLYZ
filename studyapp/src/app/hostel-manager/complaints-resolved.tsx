import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ResolvedComplaints() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resolved Complaints</Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Light Repair</Text>
        <Text>Room: A-105</Text>
        <Text>Resolved by: Maintenance Team</Text>
        <Text>Status: ✅ Resolved</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F7FB" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 16 },
  heading: { fontSize: 17, fontWeight: "800", marginBottom: 7 },
});
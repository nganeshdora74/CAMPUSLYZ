import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ComplaintsProgress() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complaints In Progress</Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Fan Repair</Text>
        <Text>Room: B-202</Text>
        <Text>Assigned to: Maintenance Team</Text>
        <Text>Status: In Progress</Text>
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
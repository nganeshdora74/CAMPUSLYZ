import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function NewComplaints() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Complaints</Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Water Problem</Text>
        <Text>Room: A-101</Text>
        <Text>Reported by: Rahul Kumar</Text>
        <Text>Status: New</Text>
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
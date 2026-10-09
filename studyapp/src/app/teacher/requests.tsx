import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Requests() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student Requests</Text>

      <View style={styles.card}>
        <Text style={styles.name}>Rahul Kumar</Text>
        <Text>Request: Attendance correction</Text>
        <Text style={styles.pending}>Pending</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.name}>Priya Das</Text>
        <Text>Request: Assignment extension</Text>
        <Text style={styles.pending}>Pending</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F7FB" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 16, marginBottom: 12 },
  name: { fontSize: 17, fontWeight: "800", marginBottom: 5 },
  pending: { marginTop: 8, fontWeight: "700" },
});
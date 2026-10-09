import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function RequestReport() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📩 Request Report</Text>

      <View style={styles.card}>
        <Text>Total Requests</Text>
        <Text style={styles.number}>124</Text>

        <Text>Completed</Text>
        <Text style={styles.success}>100</Text>

        <Text>Pending</Text>
        <Text style={styles.pending}>24</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 25, borderRadius: 18 },
  number: { fontSize: 28, fontWeight: "800", marginVertical: 8 },
  success: { color: "#16A34A", fontSize: 25, fontWeight: "800", marginVertical: 8 },
  pending: { color: "#F59E0B", fontSize: 25, fontWeight: "800", marginVertical: 8 },
});
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function DefaulterReport() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠️ Defaulter Report</Text>
      <View style={styles.card}>
        <Text>Defaulters</Text>
        <Text style={styles.amount}>37 Students</Text>
        <Text>Total overdue: ₹1,00,000</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 25, borderRadius: 18 },
  amount: { fontSize: 30, fontWeight: "800", color: "#DC2626", marginVertical: 10 },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function PendingFeesReport() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⏳ Pending Fees Report</Text>
      <View style={styles.card}>
        <Text>Pending Amount</Text>
        <Text style={styles.amount}>₹2,70,000</Text>
        <Text>142 students</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 25, borderRadius: 18 },
  amount: { fontSize: 30, fontWeight: "800", color: "#F59E0B", marginVertical: 10 },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function MonthlyCollection() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📆 Monthly Collection</Text>
      <View style={styles.card}>
        <Text>October 2026</Text>
        <Text style={styles.amount}>₹14,80,000</Text>
        <Text>1,245 successful payments</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 25, borderRadius: 18 },
  amount: { fontSize: 30, fontWeight: "800", color: "#1677E8", marginVertical: 10 },
});

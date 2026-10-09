import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function DailyCollection() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📅 Daily Collection</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Today's Collection</Text>
        <Text style={styles.amount}>₹1,24,500</Text>
        <Text style={styles.info}>126 successful payments</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 25, borderRadius: 18 },
  label: { color: "#667085" },
  amount: { fontSize: 32, fontWeight: "800", color: "#1677E8", marginTop: 8 },
  info: { color: "#16A34A", marginTop: 8 },
});

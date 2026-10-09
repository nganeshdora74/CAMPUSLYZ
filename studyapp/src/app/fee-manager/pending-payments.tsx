import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function PendingPayments() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>⏳ Pending Payments</Text>

      {["Priya Singh", "Suman Das", "Rakesh Behera"].map((name) => (
        <View style={styles.card} key={name}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.amount}>₹18,500</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 16 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: { fontWeight: "700" },
  amount: { color: "#F59E0B", fontWeight: "800" },
});

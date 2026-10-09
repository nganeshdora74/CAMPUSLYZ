import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function FailedPayments() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>❌ Failed Payments</Text>

      {["Amit Das", "Bikash Rout"].map((name) => (
        <View style={styles.card} key={name}>
          <View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.error}>Payment failed</Text>
          </View>
          <Text style={styles.amount}>₹12,000</Text>
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
  error: { color: "#DC2626", marginTop: 4 },
  amount: { color: "#DC2626", fontWeight: "800" },
});

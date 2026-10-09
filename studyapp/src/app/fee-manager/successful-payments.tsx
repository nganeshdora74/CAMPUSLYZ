import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function SuccessfulPayments() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>✅ Successful Payments</Text>

      {["Rahul Kumar", "Ankit Das", "Amit Nayak"].map((name) => (
        <View style={styles.card} key={name}>
          <View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.id}>TXN20261001</Text>
          </View>
          <Text style={styles.amount}>₹25,000</Text>
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
  name: { fontWeight: "800" },
  id: { color: "#98A2B3", marginTop: 4 },
  amount: { color: "#16A34A", fontWeight: "800" },
});

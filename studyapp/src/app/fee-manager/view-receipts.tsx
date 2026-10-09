import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function ViewReceipts() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📄 View Receipts</Text>

      {["REC-1001", "REC-1002", "REC-1003"].map((id) => (
        <View style={styles.card} key={id}>
          <View>
            <Text style={styles.id}>{id}</Text>
            <Text>Rahul Kumar</Text>
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
  id: { fontWeight: "800" },
  amount: { color: "#1677E8", fontWeight: "800" },
});

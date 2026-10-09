import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function DownloadReceipt() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⬇️ Download Receipt</Text>

      <View style={styles.card}>
        <Text style={styles.name}>REC-1001</Text>
        <Text>Rahul Kumar</Text>
        <Text style={styles.amount}>₹25,000</Text>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Download PDF</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 16 },
  name: { fontWeight: "800", fontSize: 17 },
  amount: { color: "#1677E8", fontWeight: "800", marginTop: 10 },
  button: {
    backgroundColor: "#1677E8",
    padding: 17,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});

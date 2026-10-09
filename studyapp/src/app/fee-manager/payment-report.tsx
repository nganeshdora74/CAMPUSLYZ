import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function PaymentReport() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>💳 Payment Report</Text>
      <View style={styles.card}>
        <Text>Successful</Text>
        <Text style={styles.success}>1,245</Text>

        <Text style={styles.label}>Pending</Text>
        <Text style={styles.pending}>142</Text>

        <Text style={styles.label}>Failed</Text>
        <Text style={styles.failed}>23</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 25, borderRadius: 18 },
  success: { color: "#16A34A", fontSize: 25, fontWeight: "800", marginVertical: 8 },
  pending: { color: "#F59E0B", fontSize: 25, fontWeight: "800", marginVertical: 8 },
  failed: { color: "#DC2626", fontSize: 25, fontWeight: "800", marginVertical: 8 },
  label: { marginTop: 10 },
});

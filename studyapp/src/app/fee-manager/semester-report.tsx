import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SemesterReport() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎓 Semester Report</Text>
      <View style={styles.card}>
        <Text>Semester 3</Text>
        <Text style={styles.amount}>₹48,50,000</Text>
        <Text>Collection Summary</Text>
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

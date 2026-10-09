import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function CompletedRequests() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>✅ Completed Requests</Text>

      {["Certificate Request", "Document Correction", "Bonafide Request"].map(
        (request) => (
          <View style={styles.card} key={request}>
            <Text style={styles.name}>{request}</Text>
            <Text style={styles.status}>COMPLETED</Text>
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 16 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 18, borderRadius: 15, marginBottom: 10 },
  name: { fontWeight: "800" },
  status: { color: "#16A34A", fontWeight: "800", marginTop: 7 },
});
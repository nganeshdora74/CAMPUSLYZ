import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function PendingRequests() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>⏳ Pending Requests</Text>

      {[
        ["Rahul Kumar", "Bonafide Certificate"],
        ["Priya Singh", "Character Certificate"],
        ["Ankit Das", "Document Correction"],
      ].map(([student, request]) => (
        <View style={styles.card} key={student}>
          <Text style={styles.name}>{student}</Text>
          <Text>{request}</Text>
          <Text style={styles.status}>PENDING</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 16 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 18, borderRadius: 15, marginBottom: 10 },
  name: { fontWeight: "800" },
  status: { color: "#F59E0B", fontWeight: "800", marginTop: 7 },
});
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function ApprovedCertificates() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>✅ Approved Certificates</Text>

      {["Rahul Kumar", "Ankit Das", "Priya Singh"].map((student) => (
        <View style={styles.card} key={student}>
          <Text style={styles.name}>{student}</Text>
          <Text>Bonafide Certificate</Text>
          <Text style={styles.status}>APPROVED</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 16 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 18, borderRadius: 15, marginBottom: 10 },
  name: { fontWeight: "800", marginBottom: 5 },
  status: { color: "#16A34A", fontWeight: "800", marginTop: 8 },
});
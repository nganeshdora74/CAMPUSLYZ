import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function RejectedCertificates() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>❌ Rejected Certificates</Text>

      {["Suman Das", "Bikash Rout"].map((student) => (
        <View style={styles.card} key={student}>
          <Text style={styles.name}>{student}</Text>
          <Text>Character Certificate</Text>
          <Text style={styles.status}>REJECTED</Text>
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
  status: { color: "#DC2626", fontWeight: "800", marginTop: 8 },
});
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function CertificateHistory() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🕘 Certificate History</Text>

      {[
        ["Rahul Kumar", "Bonafide", "08 Oct 2026"],
        ["Priya Singh", "Character", "07 Oct 2026"],
        ["Ankit Das", "Transfer", "06 Oct 2026"],
      ].map(([student, type, date]) => (
        <View style={styles.card} key={student}>
          <Text style={styles.name}>{student}</Text>
          <Text>{type} Certificate</Text>
          <Text style={styles.date}>{date}</Text>
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
  date: { color: "#98A2B3", marginTop: 5 },
});
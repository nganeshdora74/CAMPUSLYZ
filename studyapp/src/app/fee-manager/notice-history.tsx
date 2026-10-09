import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function NoticeHistory() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🕘 Notice History</Text>

      {["Fee Deadline", "Payment Reminder", "Hostel Fee Notice"].map((notice) => (
        <View style={styles.card} key={notice}>
          <Text style={styles.name}>{notice}</Text>
          <Text style={styles.date}>06 Oct 2026</Text>
          <Text style={styles.status}>Published</Text>
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
  date: { color: "#667085", marginTop: 5 },
  status: { color: "#667085", marginTop: 5 },
});

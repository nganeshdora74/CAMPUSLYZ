import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ExamSchedule() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exam Schedule</Text>

      {[
        ["Data Structures", "20 Oct 2026", "10:00 AM"],
        ["DBMS", "22 Oct 2026", "10:00 AM"],
        ["Operating Systems", "25 Oct 2026", "10:00 AM"],
      ].map(([subject, date, time]) => (
        <View style={styles.card} key={subject}>
          <Text style={styles.subject}>{subject}</Text>
          <Text>{date}</Text>
          <Text>{time}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F7FB" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 16, marginBottom: 12 },
  subject: { fontSize: 17, fontWeight: "800" },
});
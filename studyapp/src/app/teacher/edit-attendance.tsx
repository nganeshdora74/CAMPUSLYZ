import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function EditAttendance() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Attendance</Text>

      <View style={styles.card}>
        <Text style={styles.subject}>Data Structures</Text>
        <Text>01 October 2026</Text>
        <Text>Present: 42 / 48</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.subject}>Database Management</Text>
        <Text>02 October 2026</Text>
        <Text>Present: 45 / 48</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F7FB" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 40, marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  subject: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
});
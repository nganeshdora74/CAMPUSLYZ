import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function QuestionPapers() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Question Papers</Text>

      {["Mid Semester - DS.pdf", "End Semester - DBMS.pdf"].map((file) => (
        <View style={styles.card} key={file}>
          <Text style={styles.file}>📄 {file}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F7FB" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 16, marginBottom: 12 },
  file: { fontWeight: "700" },
});
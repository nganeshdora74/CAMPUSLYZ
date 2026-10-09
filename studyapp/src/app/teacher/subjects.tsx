import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Subjects() {
  const subjects = ["Data Structures", "DBMS", "Operating Systems", "Computer Networks"];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Subjects</Text>

      {subjects.map((subject) => (
        <View style={styles.card} key={subject}>
          <Text style={styles.subject}>📚 {subject}</Text>
          <Text>Semester 3</Text>
          <Text>Classes: 40</Text>
        </View>
      ))}
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
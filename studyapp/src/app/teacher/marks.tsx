import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Marks() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student Marks</Text>

      {["Rahul Kumar", "Priya Das", "Aman Singh"].map((student, index) => (
        <View style={styles.card} key={student}>
          <Text style={styles.name}>{student}</Text>
          <Text>Data Structures: {78 + index * 4}/100</Text>
          <Text>DBMS: {82 + index * 3}/100</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F7FB" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 16, marginBottom: 12 },
  name: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
});
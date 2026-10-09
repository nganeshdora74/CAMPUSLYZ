import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function StudentDetails() {
  const { name, id } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.avatar}>👨‍🎓</Text>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.roll}>Student ID: {id}</Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Student Information</Text>
        <Text>Department: Computer Science & Engineering</Text>
        <Text>Semester: 3</Text>
        <Text>Attendance: 86%</Text>
        <Text>Subjects: 6</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#F5F7FB" },
  avatar: { fontSize: 60, textAlign: "center", marginTop: 40 },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center" },
  roll: { textAlign: "center", color: "#666" },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 18,
    marginTop: 25,
    gap: 12,
  },
  heading: { fontSize: 19, fontWeight: "800" },
});
import React, { useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity } from "react-native";

const students = [
  "Rahul Kumar",
  "Priya Das",
  "Aman Singh",
  "Sneha Patra",
];

export default function MarkAttendance() {
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  const toggle = (name: string) => {
    setAttendance((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mark Attendance</Text>
      <Text style={styles.subject}>Data Structures • Today</Text>

      {students.map((student) => (
        <View style={styles.row} key={student}>
          <Text style={styles.name}>{student}</Text>

          <Switch
            value={attendance[student] ?? false}
            onValueChange={() => toggle(student)}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.save}>
        <Text style={styles.saveText}>Save Attendance</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F7FB" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 40 },
  subject: { color: "#666", marginBottom: 20 },
  row: {
    backgroundColor: "#fff",
    padding: 17,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 16, fontWeight: "600" },
  save: {
    backgroundColor: "#6246E5",
    padding: 17,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 15,
  },
  saveText: { color: "#fff", fontWeight: "800" },
});
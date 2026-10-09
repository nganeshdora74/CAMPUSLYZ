import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export default function UpdateEvent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>✏️ Update Event</Text>

      <TextInput
        style={styles.input}
        value="Annual College Fest"
      />

      <TextInput
        style={styles.input}
        value="20 October 2026"
      />

      <TextInput
        style={styles.input}
        value="Main Auditorium"
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Update Event</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  input: {
    backgroundColor: "#fff",
    padding: 17,
    borderRadius: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#6246E5",
    padding: 17,
    borderRadius: 13,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});
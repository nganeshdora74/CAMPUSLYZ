import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export default function CreateEvent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>➕ Create Event</Text>

      <TextInput style={styles.input} placeholder="Event name" />
      <TextInput style={styles.input} placeholder="Date" />
      <TextInput style={styles.input} placeholder="Time" />
      <TextInput style={styles.input} placeholder="Venue" />

      <TextInput
        style={styles.message}
        placeholder="Event description"
        multiline
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Create Event</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  input: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 13,
    marginBottom: 10,
  },
  message: {
    backgroundColor: "#fff",
    height: 120,
    padding: 16,
    borderRadius: 13,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#6246E5",
    padding: 17,
    borderRadius: 13,
    marginTop: 15,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});
import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export default function CreateCircular() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📄 Create Circular</Text>

      <TextInput
        style={styles.input}
        placeholder="Circular title"
      />

      <TextInput
        style={styles.message}
        placeholder="Circular content..."
        multiline
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Publish Circular</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  input: { backgroundColor: "#fff", padding: 17, borderRadius: 13, marginBottom: 12 },
  message: {
    backgroundColor: "#fff",
    height: 160,
    padding: 17,
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
import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export default function UpdateFee() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>✏️ Update Fee</Text>

      <TextInput style={styles.input} placeholder="Select fee" />
      <TextInput
        style={styles.input}
        placeholder="New amount"
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Update Fee</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 25 },
  input: {
    backgroundColor: "#fff",
    padding: 17,
    borderRadius: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#1677E8",
    padding: 17,
    borderRadius: 13,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});

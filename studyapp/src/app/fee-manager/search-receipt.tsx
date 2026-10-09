import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export default function SearchReceipt() {
  const [search, setSearch] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔎 Search Receipt</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter receipt number"
        value={search}
        onChangeText={setSearch}
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Search</Text>
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
  },
  button: {
    backgroundColor: "#1677E8",
    padding: 17,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});

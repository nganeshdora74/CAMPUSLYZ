import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function SearchCertificate() {
  const [search, setSearch] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔎 Search Certificate</Text>

      <TextInput
        style={styles.input}
        placeholder="Certificate ID / Roll Number"
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
    backgroundColor: "#6246E5",
    padding: 17,
    borderRadius: 13,
    marginTop: 15,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});
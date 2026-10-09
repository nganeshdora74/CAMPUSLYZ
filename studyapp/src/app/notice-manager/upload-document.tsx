import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function UploadDocument() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⬆️ Upload Document</Text>

      <View style={styles.upload}>
        <Text style={styles.uploadIcon}>📄</Text>
        <Text style={styles.uploadText}>
          Select PDF, JPG or PNG
        </Text>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Select Document</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 18 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  upload: {
    backgroundColor: "#fff",
    height: 180,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#C7C9D1",
  },
  uploadIcon: { fontSize: 45 },
  uploadText: { color: "#667085", marginTop: 10 },
  button: {
    backgroundColor: "#6246E5",
    padding: 17,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});
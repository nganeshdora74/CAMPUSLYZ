import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function UpdateCertificate() {
  const [certificateId, setCertificateId] = useState("");
  const [student, setStudent] = useState("");
  const [status, setStatus] = useState("Approved");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✏️ Update Certificate</Text>

      <TextInput
        style={styles.input}
        placeholder="Certificate ID"
        value={certificateId}
        onChangeText={setCertificateId}
      />

      <TextInput
        style={styles.input}
        placeholder="Student Name"
        value={student}
        onChangeText={setStudent}
      />

      <TextInput
        style={styles.input}
        placeholder="Certificate Status"
        value={status}
        onChangeText={setStatus}
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Update Certificate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
    padding: 18,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    marginTop: 45,
    marginBottom: 25,
  },
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
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
});
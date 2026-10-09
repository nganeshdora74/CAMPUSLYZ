import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

export default function IssueCertificate() {
  const [student, setStudent] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>➕ Issue Certificate</Text>

      <Text style={styles.label}>Student Name / Roll No.</Text>

      <TextInput
        style={styles.input}
        placeholder="Search student"
        value={student}
        onChangeText={setStudent}
      />

      <Text style={styles.label}>Certificate Type</Text>

      <TextInput
        style={styles.input}
        placeholder="Bonafide / Character / Transfer..."
        value={type}
        onChangeText={setType}
      />

      <Text style={styles.label}>Description</Text>

      <TextInput
        style={styles.message}
        placeholder="Certificate details"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>📜 Issue Certificate</Text>
      </TouchableOpacity>
    </ScrollView>
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
    marginBottom: 20,
  },
  label: {
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#fff",
    padding: 17,
    borderRadius: 13,
  },
  message: {
    backgroundColor: "#fff",
    height: 130,
    padding: 17,
    borderRadius: 13,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#6246E5",
    padding: 17,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
});
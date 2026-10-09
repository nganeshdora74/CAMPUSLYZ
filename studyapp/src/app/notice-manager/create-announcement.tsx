import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function CreateAnnouncement() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📣 Create Announcement</Text>

      <TextInput
        style={styles.input}
        placeholder="Announcement title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={styles.message}
        placeholder="Announcement message"
        value={message}
        onChangeText={setMessage}
        multiline
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Publish Announcement</Text>
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
  message: {
    backgroundColor: "#fff",
    height: 150,
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
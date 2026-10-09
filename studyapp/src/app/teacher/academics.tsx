import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function Academics() {
  const items = [
    ["📚", "My Subjects", "/teacher/subjects"],
    ["🏫", "Classes", "/teacher/classes"],
    ["📝", "Assignments", "/teacher/assignments"],
    ["📖", "Study Materials", "/teacher/study-materials"],
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Academics</Text>

      {items.map(([icon, title, route]) => (
        <TouchableOpacity
          style={styles.card}
          key={title}
          onPress={() => router.push(route as any)}
        >
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.text}>{title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F7FB" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 40, marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: { fontSize: 28, marginRight: 15 },
  text: { fontSize: 17, fontWeight: "700" },
});
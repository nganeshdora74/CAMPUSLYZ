import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function DocumentHistory() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🕘 Document History</Text>

      {["Academic Circular.pdf", "Holiday Notice.pdf", "Event Schedule.pdf"].map(
        (file) => (
          <View style={styles.card} key={file}>
            <Text style={styles.icon}>📄</Text>
            <View>
              <Text style={styles.name}>{file}</Text>
              <Text style={styles.date}>Uploaded today</Text>
            </View>
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 16 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: "row",
  },
  icon: { fontSize: 27, marginRight: 15 },
  name: { fontWeight: "800" },
  date: { color: "#667085", marginTop: 4 },
});
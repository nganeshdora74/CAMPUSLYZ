import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function CircularHistory() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🕘 Circular History</Text>

      {["Academic Circular", "Examination Circular", "Holiday Circular"].map(
        (item) => (
          <View style={styles.card} key={item}>
            <Text style={styles.name}>{item}</Text>
            <Text style={styles.date}>08 Oct 2026</Text>
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB", padding: 16 },
  title: { fontSize: 27, fontWeight: "800", marginTop: 45, marginBottom: 20 },
  card: { backgroundColor: "#fff", padding: 18, borderRadius: 15, marginBottom: 10 },
  name: { fontWeight: "800" },
  date: { color: "#667085", marginTop: 5 },
});
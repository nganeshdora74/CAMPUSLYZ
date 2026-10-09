import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function FeeCategories() {
  const categories = [
    "Tuition Fee",
    "Hostel Fee",
    "Mess Fee",
    "Examination Fee",
    "Library Fee",
    "Other Fees",
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🏷️ Fee Categories</Text>

      {categories.map((category) => (
        <View style={styles.card} key={category}>
          <Text style={styles.icon}>💰</Text>
          <Text style={styles.name}>{category}</Text>
        </View>
      ))}
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
    alignItems: "center",
  },
  icon: { fontSize: 25, marginRight: 15 },
  name: { fontWeight: "700" },
});

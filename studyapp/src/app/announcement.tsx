import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AnnouncementsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Announcements</Text>

      <Text style={styles.subtitle}>
        Stay updated with campus news and events.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 17,
    color: "#6B7280",
    textAlign: "center",
  },
});
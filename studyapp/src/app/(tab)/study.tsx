import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function StudyScreen() {
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tab)/home");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Study</Text>

          <View style={styles.headerSpace} />
        </View>

        {/* Welcome */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeIcon}>📚</Text>

          <Text style={styles.welcomeTitle}>
            Study smarter
          </Text>

          <Text style={styles.welcomeText}>
            Find your notes, resources and learning tools
            all in one place.
          </Text>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>
          Study Resources
        </Text>

        <View style={styles.grid}>
          <Pressable
            style={styles.card}
            onPress={() => router.push("/notes" as any)}
          >
            <View style={styles.iconBox}>
              <Text style={styles.icon}>📝</Text>
            </View>

            <Text style={styles.cardTitle}>My Notes</Text>

            <Text style={styles.cardText}>
              Save and review your study notes
            </Text>
          </Pressable>

          <Pressable
            style={styles.card}
            onPress={() => router.push("/resources" as any)}
          >
            <View style={styles.iconBox}>
              <Text style={styles.icon}>📖</Text>
            </View>

            <Text style={styles.cardTitle}>Resources</Text>

            <Text style={styles.cardText}>
              Useful books, PDFs, videos and study material
            </Text>
          </Pressable>

          <Pressable
            style={styles.card}
            onPress={() => router.push("/(tab)/tasks" as any)}
          >
            <View style={styles.iconBox}>
              <Text style={styles.icon}>✅</Text>
            </View>

            <Text style={styles.cardTitle}>Tasks</Text>

            <Text style={styles.cardText}>
              Keep track of your assignments
            </Text>
          </Pressable>

          <Pressable
            style={styles.card}
            onPress={() => router.push("/pomodoro" as any)}
          >
            <View style={styles.iconBox}>
              <Text style={styles.icon}>⏱️</Text>
            </View>

            <Text style={styles.cardTitle}>Study Timer</Text>

            <Text style={styles.cardText}>
              Focus and manage your study time
            </Text>
          </Pressable>
        </View>

        {/* Recent */}
        <Text style={styles.sectionTitle}>
          Recent Activity
        </Text>

        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📚</Text>

          <Text style={styles.emptyTitle}>
            Ready to Study
          </Text>

          <Text style={styles.emptyText}>
            Choose a study tool above to start reviewing notes, organizing tasks or setting a focus timer.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6E7EC",
  },

  backText: {
    fontSize: 25,
    color: "#151A2D",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#151A2D",
  },

  headerSpace: {
    width: 44,
  },

  welcomeCard: {
    backgroundColor: "#5146E5",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },

  welcomeIcon: {
    fontSize: 38,
    marginBottom: 12,
  },

  welcomeTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  welcomeText: {
    fontSize: 16,
    lineHeight: 23,
    color: "#E9E8FF",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#151A2D",
    marginBottom: 16,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    minHeight: 190,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E6E7EC",
  },

  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: "#EEF0FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  icon: {
    fontSize: 27,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151A2D",
    marginBottom: 7,
  },

  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#737A8C",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6E7EC",
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151A2D",
    marginBottom: 7,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#737A8C",
    textAlign: "center",
  },
});

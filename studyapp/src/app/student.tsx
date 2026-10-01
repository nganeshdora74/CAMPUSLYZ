import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";

export default function StudentsScreen() {
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
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Students</Text>

          <View style={styles.headerSpace} />
        </View>

        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeIcon}>👥</Text>

          <Text style={styles.welcomeTitle}>
            Campus community
          </Text>

          <Text style={styles.welcomeText}>
            Connect with students, make friends and build
            your campus community.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>

          <Text style={styles.searchText}>
            Search students...
          </Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>
          Connect
        </Text>

        <View style={styles.grid}>
          <Pressable style={styles.card}>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>👤</Text>
            </View>

            <Text style={styles.cardTitle}>
              Find Students
            </Text>

            <Text style={styles.cardText}>
              Discover students from your campus.
            </Text>
          </Pressable>

          <Pressable style={styles.card}>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>💬</Text>
            </View>

            <Text style={styles.cardTitle}>
              Messages
            </Text>

            <Text style={styles.cardText}>
              Chat and stay connected with friends.
            </Text>
          </Pressable>

          <Pressable style={styles.card}>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>🤝</Text>
            </View>

            <Text style={styles.cardTitle}>
              Study Groups
            </Text>

            <Text style={styles.cardText}>
              Join groups and study together.
            </Text>
          </Pressable>

          <Pressable style={styles.card}>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>🎓</Text>
            </View>

            <Text style={styles.cardTitle}>
              My Campus
            </Text>

            <Text style={styles.cardText}>
              See what's happening around campus.
            </Text>
          </Pressable>
        </View>

        {/* Community */}
        <Text style={styles.sectionTitle}>
          Campus Community
        </Text>

        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👥</Text>

          <Text style={styles.emptyTitle}>
            Your community is waiting
          </Text>

          <Text style={styles.emptyText}>
            Student profiles and campus groups will appear
            here when they are available.
          </Text>

          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              Explore Community
            </Text>
          </Pressable>
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

  searchBox: {
    height: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E2E8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 28,
  },

  searchIcon: {
    fontSize: 19,
    marginRight: 10,
  },

  searchText: {
    fontSize: 15,
    color: "#8A8F9E",
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
    fontSize: 19,
    fontWeight: "800",
    color: "#151A2D",
    textAlign: "center",
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#737A8C",
    textAlign: "center",
    marginBottom: 20,
  },

  primaryButton: {
    backgroundColor: "#5146E5",
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
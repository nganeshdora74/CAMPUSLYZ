import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>Campusly</Text>
            <Text style={styles.subtitle}>
              Your campus, all in one place.
            </Text>
          </View>

          <View style={styles.profileButton}>
            <Text style={styles.profileText}>G</Text>
          </View>
        </View>

        {/* Explore heading */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Explore</Text>

          <Text style={styles.description}>
            Find tools and resources to help you learn, connect and grow.
          </Text>
        </View>

        {/* AI Assistant */}
        <TouchableOpacity
          style={styles.featureCard}
          activeOpacity={0.8}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🤖</Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>AI Assistant</Text>

            <Text style={styles.cardDescription}>
              Get help with your studies, questions and learning.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Students */}
        <TouchableOpacity
          style={styles.featureCard}
          activeOpacity={0.8}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>👥</Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Students</Text>

            <Text style={styles.cardDescription}>
              Connect with your campus community.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Announcements */}
        <TouchableOpacity
          style={styles.featureCard}
          activeOpacity={0.8}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>📢</Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Announcements</Text>

            <Text style={styles.cardDescription}>
              Stay updated with campus news and announcements.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Study */}
        <TouchableOpacity
          style={styles.featureCard}
          activeOpacity={0.8}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>📚</Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Study</Text>

            <Text style={styles.cardDescription}>
              Organize your studies and stay focused.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 35,
  },

  logo: {
    fontSize: 38,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    fontSize: 17,
    color: "#64748B",
    marginTop: 4,
  },

  profileButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E5E7FF",
    justifyContent: "center",
    alignItems: "center",
  },

  profileText: {
    fontSize: 25,
    fontWeight: "800",
    color: "#4F46E5",
  },

  titleSection: {
    marginBottom: 25,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  description: {
    fontSize: 17,
    lineHeight: 25,
    color: "#64748B",
  },

  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    elevation: 3,
  },

  iconBox: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  icon: {
    fontSize: 27,
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 5,
  },

  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
  },

  arrow: {
    fontSize: 32,
    color: "#4F46E5",
    marginLeft: 10,
  },

  bottomSpace: {
    height: 80,
  },
});
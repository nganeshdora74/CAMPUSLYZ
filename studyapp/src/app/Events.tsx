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

export default function EventsScreen() {
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

          <Text style={styles.headerTitle}>Events</Text>

          <View style={styles.headerSpace} />
        </View>

        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeIcon}>📅</Text>

          <Text style={styles.welcomeTitle}>
            Campus Events
          </Text>

          <Text style={styles.welcomeText}>
            Discover workshops, activities, clubs and other
            exciting events happening around your campus.
          </Text>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categories}
        >
          <Pressable style={styles.activeCategory}>
            <Text style={styles.activeCategoryText}>All</Text>
          </Pressable>

          <Pressable style={styles.category}>
            <Text style={styles.categoryText}>Academic</Text>
          </Pressable>

          <Pressable style={styles.category}>
            <Text style={styles.categoryText}>Clubs</Text>
          </Pressable>

          <Pressable style={styles.category}>
            <Text style={styles.categoryText}>Sports</Text>
          </Pressable>

          <Pressable style={styles.category}>
            <Text style={styles.categoryText}>Social</Text>
          </Pressable>
        </ScrollView>

        {/* Upcoming */}
        <Text style={styles.sectionTitle}>
          Upcoming Events
        </Text>

        {/* Event 1 */}
        <Pressable style={styles.eventCard}>
          <View style={styles.dateBox}>
            <Text style={styles.month}>SEP</Text>
            <Text style={styles.day}>10</Text>
          </View>

          <View style={styles.eventContent}>
            <Text style={styles.eventTitle}>
              Campus Orientation
            </Text>

            <Text style={styles.eventInfo}>
              🎓 Main Auditorium
            </Text>

            <Text style={styles.eventInfo}>
              🕐 10:00 AM
            </Text>

            <Text style={styles.eventDescription}>
              Meet students, explore campus and learn about
              college activities.
            </Text>
          </View>
        </Pressable>

        {/* Event 2 */}
        <Pressable style={styles.eventCard}>
          <View style={styles.dateBox}>
            <Text style={styles.month}>SEP</Text>
            <Text style={styles.day}>15</Text>
          </View>

          <View style={styles.eventContent}>
            <Text style={styles.eventTitle}>
              Study Skills Workshop
            </Text>

            <Text style={styles.eventInfo}>
              📚 Learning Center
            </Text>

            <Text style={styles.eventInfo}>
              🕐 2:00 PM
            </Text>

            <Text style={styles.eventDescription}>
              Learn effective study techniques and time
              management strategies.
            </Text>
          </View>
        </Pressable>

        {/* Event 3 */}
        <Pressable style={styles.eventCard}>
          <View style={styles.dateBox}>
            <Text style={styles.month}>SEP</Text>
            <Text style={styles.day}>20</Text>
          </View>

          <View style={styles.eventContent}>
            <Text style={styles.eventTitle}>
              Student Club Fair
            </Text>

            <Text style={styles.eventInfo}>
              👥 Student Center
            </Text>

            <Text style={styles.eventInfo}>
              🕐 11:00 AM
            </Text>

            <Text style={styles.eventDescription}>
              Discover student clubs and find communities
              that match your interests.
            </Text>
          </View>
        </Pressable>

        {/* Event 4 */}
        <Pressable style={styles.eventCard}>
          <View style={styles.dateBox}>
            <Text style={styles.month}>SEP</Text>
            <Text style={styles.day}>25</Text>
          </View>

          <View style={styles.eventContent}>
            <Text style={styles.eventTitle}>
              Campus Sports Day
            </Text>

            <Text style={styles.eventInfo}>
              🏆 Sports Ground
            </Text>

            <Text style={styles.eventInfo}>
              🕐 9:00 AM
            </Text>

            <Text style={styles.eventDescription}>
              Join your friends for a fun day of campus
              sports and activities.
            </Text>
          </View>
        </Pressable>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>✨</Text>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              More events coming soon
            </Text>

            <Text style={styles.infoText}>
              When the Campusly backend is connected, events
              from your college will appear here automatically.
            </Text>
          </View>
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

  categories: {
    marginBottom: 28,
  },

  activeCategory: {
    backgroundColor: "#5146E5",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },

  activeCategoryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  category: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E1E2E8",
  },

  categoryText: {
    color: "#62687A",
    fontSize: 14,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#151A2D",
    marginBottom: 16,
  },

  eventCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E6E7EC",
  },

  dateBox: {
    width: 62,
    height: 72,
    borderRadius: 17,
    backgroundColor: "#EEF0FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  month: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5146E5",
  },

  day: {
    fontSize: 27,
    fontWeight: "800",
    color: "#151A2D",
  },

  eventContent: {
    flex: 1,
  },

  eventTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151A2D",
    marginBottom: 8,
  },

  eventInfo: {
    fontSize: 13,
    color: "#62687A",
    marginBottom: 4,
  },

  eventDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#737A8C",
    marginTop: 5,
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: "#F0F1FF",
    borderRadius: 18,
    padding: 17,
    marginTop: 8,
  },

  infoIcon: {
    fontSize: 22,
    marginRight: 10,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#312E81",
    marginBottom: 5,
  },

  infoText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5D6380",
  },
});
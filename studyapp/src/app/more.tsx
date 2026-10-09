import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

type Module = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const campusModules: Module[] = [
  {
    title: "Notifications Feed",
    description: "Incoming announcements & outgoing sent notifications",
    icon: "notifications-outline",
    route: "/notifications",
  },
  {
    title: "Attendance",
    description: "Attendance, subjects and warnings",
    icon: "school-outline",
    route: "/attendance",
  },
  {
    title: "Translator",
    description: "Multilingual campus language translator",
    icon: "language-outline",
    route: "/translator",
  },
  {
    title: "Mess",
    description: "Menu, provider and management",
    icon: "restaurant-outline",
    route: "/mess",
  },
  {
    title: "Hostel",
    description: "Rooms, allocation and complaints",
    icon: "home-outline",
    route: "/hostel",
  },
  {
    title: "Reports",
    description: "Academic and student reports",
    icon: "bar-chart-outline",
    route: "/reports",
  },
  {
    title: "Request Center & Complaints",
    description: "Submit complaints, certificates, dues & leave",
    icon: "chatbubbles-outline",
    route: "/requests",
  },
  {
    title: "Gate Pass",
    description: "Campus out pass with QR code & warden approval",
    icon: "exit-outline",
    route: "/gate-pass",
  },
  {
    title: "Bonafide & Documents",
    description: "Official certificate and transcript requests",
    icon: "document-text-outline",
    route: "/document-request",
  },
  {
    title: "Help & Debug",
    description: "Problems, feedback and diagnostics",
    icon: "bug-outline",
    route: "/debug",
  },
];

const academicModules: Module[] = [
  {
    title: "Branch & Elective Subjects",
    description: "Choose engineering branch, core subjects and optional electives",
    icon: "git-branch-outline",
    route: "/branch-selection",
  },
  {
    title: "Exams",
    description: "Exam schedules, seats, and results",
    icon: "calendar-outline",
    route: "/exams",
  },
  {
    title: "Notes & PDFs",
    description: "Lecture notes, books and resources",
    icon: "document-text-outline",
    route: "/notes",
  },
  {
    title: "AI Study Planner",
    description: "Generate structured study schedules",
    icon: "sparkles-outline",
    route: "/ai-study-planner",
  },
  {
    title: "AI Quiz",
    description: "Practice quizzes for your subjects",
    icon: "help-circle-outline",
    route: "/ai-quiz",
  },
  {
    title: "Pomodoro Timer",
    description: "Focus timer and study intervals",
    icon: "timer-outline",
    route: "/pomodoro",
  },
  {
    title: "CGPA Calculator",
    description: "Grade points and CGPA forecast",
    icon: "calculator-outline",
    route: "/cgpa-calculator",
  },
  {
    title: "Study Goals",
    description: "Set daily and weekly study targets",
    icon: "flag-outline",
    route: "/study-goal",
  },
];

export default function MoreScreen() {
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tab)/home");
    }
  };

  const renderCard = (item: Module) => (
    <TouchableOpacity
      key={item.title}
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(item.route as any)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={item.icon} size={26} color="#4b2e91" />
      </View>

      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription}>{item.description}</Text>
      </View>

      <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.back}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={23} color="#292052" />
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>More Features</Text>
            <Text style={styles.subtitle}>
              Everything you need in Campusly
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Campus Services</Text>
        {campusModules.map(renderCard)}

        <Text style={[styles.sectionHeading, { marginTop: 24 }]}>
          Academic & Study Tools
        </Text>
        {academicModules.map(renderCard)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7FC",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECE8F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#24204A",
  },

  subtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },

  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#292052",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    minHeight: 74,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ECEAF2",
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEEAFB",
    justifyContent: "center",
    alignItems: "center",
  },

  cardText: {
    flex: 1,
    marginLeft: 14,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#292052",
  },

  cardDescription: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
  },
});
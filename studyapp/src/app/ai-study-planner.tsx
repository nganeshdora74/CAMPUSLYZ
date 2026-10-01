import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../firebase/config";

const BLUE = "#1677E8";
const DARK = "#092B78";
const PURPLE = "#7C3AED";
const GREEN = "#16A34A";
const ORANGE = "#F59E0B";
const RED = "#DC2626";
const BG = "#F5F8FC";
const BORDER = "#E2E8F0";
const TEXT = "#172033";
const MUTED = "#64748B";

type PlanItem = {
  id: string;
  subject: string;
  topic: string;
  duration: number;
  type: "Study" | "Revision" | "Practice";
  completed: boolean;
};

type SavedPlan = {
  id: string;
  title: string;
  subjects: string[];
  hoursPerDay: number;
  days: number;
  createdAt?: any;
  items: PlanItem[];
};

const SUBJECTS = [
  "Data Structures",
  "Database Management Systems",
  "Operating Systems",
  "Computer Networks",
  "Object Oriented Programming",
  "Software Engineering",
  "Engineering Mathematics",
  "Artificial Intelligence",
];

const TOPICS: Record<string, string[]> = {
  "Data Structures": [
    "Arrays & Linked Lists",
    "Stacks & Queues",
    "Trees",
    "Graphs",
    "Sorting & Searching",
  ],
  "Database Management Systems": [
    "SQL",
    "Normalization",
    "Transactions",
    "ER Diagrams",
    "Indexing",
  ],
  "Operating Systems": [
    "Processes & Threads",
    "CPU Scheduling",
    "Deadlocks",
    "Memory Management",
    "File Systems",
  ],
  "Computer Networks": [
    "OSI & TCP/IP",
    "IP Addressing",
    "Routing",
    "Transport Layer",
    "Network Security",
  ],
  "Object Oriented Programming": [
    "Classes & Objects",
    "Inheritance",
    "Polymorphism",
    "Exception Handling",
    "Collections",
  ],
  "Software Engineering": [
    "SDLC",
    "Requirements",
    "UML",
    "Testing",
    "Agile",
  ],
  "Engineering Mathematics": [
    "Differentiation",
    "Integration",
    "Matrices",
    "Probability",
    "Differential Equations",
  ],
  "Artificial Intelligence": [
    "Search Algorithms",
    "Machine Learning Basics",
    "Neural Networks",
    "Knowledge Representation",
    "AI Applications",
  ],
};

export default function AIStudyPlanner() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [hoursPerDay, setHoursPerDay] = useState("2");
  const [days, setDays] = useState("7");
  const [goal, setGoal] = useState("Prepare for upcoming exams");

  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUserId(null);
        setLoading(false);
        router.replace("/login");
        return;
      }

      setUserId(user.uid);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!userId) return;

    const plansRef = collection(db, "users", userId, "studyGoals");

    const unsubscribe = onSnapshot(
      plansRef,
      (snapshot) => {
        const data: SavedPlan[] = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<SavedPlan, "id">),
        }));

        data.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0;
          const bTime = b.createdAt?.seconds ?? 0;
          return bTime - aTime;
        });

        setSavedPlans(data);
      },
      (error) => {
        console.log("Study planner listener error:", error);
      }
    );

    return unsubscribe;
  }, [userId]);

  const totalMinutes = useMemo(() => {
    const hours = Number(hoursPerDay);

    if (!Number.isFinite(hours) || hours <= 0) {
      return 0;
    }

    return hours * 60;
  }, [hoursPerDay]);

  const totalStudyHours = useMemo(() => {
    const hours = Number(hoursPerDay);
    const numberOfDays = Number(days);

    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(numberOfDays) ||
      hours <= 0 ||
      numberOfDays <= 0
    ) {
      return 0;
    }

    return hours * numberOfDays;
  }, [hoursPerDay, days]);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((current) => {
      if (current.includes(subject)) {
        return current.filter((item) => item !== subject);
      }

      if (current.length >= 5) {
        Alert.alert(
          "Maximum reached",
          "You can select up to 5 subjects for one study plan."
        );
        return current;
      }

      return [...current, subject];
    });
  };

  const generatePlan = () => {
    const numberOfDays = Number(days);
    const hours = Number(hoursPerDay);

    if (selectedSubjects.length === 0) {
      Alert.alert("Select subjects", "Please select at least one subject.");
      return;
    }

    if (!Number.isFinite(hours) || hours <= 0 || hours > 12) {
      Alert.alert(
        "Invalid study time",
        "Please enter a study time between 1 and 12 hours per day."
      );
      return;
    }

    if (!Number.isFinite(numberOfDays) || numberOfDays <= 0 || numberOfDays > 30) {
      Alert.alert(
        "Invalid duration",
        "Please enter a duration between 1 and 30 days."
      );
      return;
    }

    setGenerating(true);

    setTimeout(() => {
      const generated: PlanItem[] = [];

      for (let day = 0; day < numberOfDays; day++) {
        const subject = selectedSubjects[day % selectedSubjects.length];
        const topics = TOPICS[subject] ?? ["Important Topics"];

        const topicIndex =
          Math.floor(day / selectedSubjects.length) % topics.length;

        const topic = topics[topicIndex];

        const sessionType =
          day < Math.ceil(numberOfDays * 0.6)
            ? "Study"
            : day < Math.ceil(numberOfDays * 0.85)
            ? "Practice"
            : "Revision";

        generated.push({
          id: `${Date.now()}-${day}`,
          subject,
          topic,
          duration: Math.round((hours * 60) / 2) * 2,
          type: sessionType,
          completed: false,
        });
      }

      setPlan(generated);
      setGenerating(false);

      Alert.alert(
        "Plan created",
        `Your ${numberOfDays}-day study plan is ready.`
      );
    }, 700);
  };

  const togglePlanItem = (id: string) => {
    setPlan((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  };

  const savePlan = async () => {
    if (!userId) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }

    if (plan.length === 0) {
      Alert.alert("No plan", "Generate a study plan first.");
      return;
    }

    try {
      setGenerating(true);

      await addDoc(collection(db, "users", userId, "studyGoals"), {
        title: goal.trim() || "My Study Plan",
        subjects: selectedSubjects,
        hoursPerDay: Number(hoursPerDay),
        days: Number(days),
        items: plan,
        createdAt: serverTimestamp(),
      });

      setGenerating(false);

      Alert.alert("Saved", "Your study plan has been saved successfully.");
    } catch (error) {
      console.error("Save study plan error:", error);
      setGenerating(false);

      Alert.alert(
        "Save failed",
        "Could not save your study plan. Please try again."
      );
    }
  };

  const deletePlan = (id: string) => {
    if (!userId) return;

    Alert.alert(
      "Delete plan",
      "Are you sure you want to delete this saved study plan?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, "users", userId, "studyGoals", id)
              );
            } catch (error) {
              console.error("Delete plan error:", error);

              Alert.alert(
                "Error",
                "Could not delete the study plan."
              );
            }
          },
        },
      ]
    );
  };

  const completedCount = plan.filter((item) => item.completed).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={BLUE} />
        <Text style={styles.loadingText}>Loading planner...</Text>
      </SafeAreaView>
    );
  }

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
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>AI Study Planner</Text>
            <Text style={styles.subtitle}>
              Build a smarter study routine
            </Text>
          </View>

          <Pressable
            onPress={() => setShowSettings(true)}
            style={styles.settingsButton}
          >
            <Ionicons name="options-outline" size={22} color={DARK} />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="sparkles"
              size={26}
              color={PURPLE}
            />
          </View>

          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>
              Plan your study sessions
            </Text>

            <Text style={styles.heroDescription}>
              Select your subjects and available time. Campusly will
              organize a simple study schedule for you.
            </Text>
          </View>
        </View>

        {/* Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your goal</Text>

          <TextInput
            value={goal}
            onChangeText={setGoal}
            placeholder="What do you want to achieve?"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>

        {/* Subjects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Choose subjects</Text>

            <Text style={styles.counter}>
              {selectedSubjects.length}/5
            </Text>
          </View>

          <View style={styles.subjectGrid}>
            {SUBJECTS.map((subject) => {
              const selected = selectedSubjects.includes(subject);

              return (
                <Pressable
                  key={subject}
                  onPress={() => toggleSubject(subject)}
                  style={[
                    styles.subjectChip,
                    selected && styles.subjectChipSelected,
                  ]}
                >
                  <Ionicons
                    name={
                      selected
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={18}
                    color={selected ? "#FFFFFF" : BLUE}
                  />

                  <Text
                    style={[
                      styles.subjectText,
                      selected && styles.subjectTextSelected,
                    ]}
                  >
                    {subject}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Study summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons
              name="time-outline"
              size={23}
              color={BLUE}
            />

            <Text style={styles.summaryValue}>
              {hoursPerDay}h
            </Text>

            <Text style={styles.summaryLabel}>
              Per day
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons
              name="calendar-outline"
              size={23}
              color={PURPLE}
            />

            <Text style={styles.summaryValue}>
              {days}
            </Text>

            <Text style={styles.summaryLabel}>
              Days
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons
              name="hourglass-outline"
              size={23}
              color={GREEN}
            />

            <Text style={styles.summaryValue}>
              {totalStudyHours}h
            </Text>

            <Text style={styles.summaryLabel}>
              Total
            </Text>
          </View>
        </View>

        {/* Generate button */}
        <Pressable
          onPress={generatePlan}
          disabled={generating}
          style={({ pressed }) => [
            styles.generateButton,
            pressed && styles.buttonPressed,
            generating && styles.disabledButton,
          ]}
        >
          {generating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="sparkles"
                size={21}
                color="#FFFFFF"
              />

              <Text style={styles.generateText}>
                Generate Study Plan
              </Text>
            </>
          )}
        </Pressable>

        {/* Current plan */}
        {plan.length > 0 && (
          <View style={styles.planSection}>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Your study plan
                </Text>

                <Text style={styles.planProgress}>
                  {completedCount}/{plan.length} sessions completed
                </Text>
              </View>

              <Pressable
                onPress={savePlan}
                disabled={generating}
                style={styles.saveButton}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width:
                      plan.length === 0
                        ? "0%"
                        : `${(completedCount / plan.length) * 100}%`,
                  },
                ]}
              />
            </View>

            {plan.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => togglePlanItem(item.id)}
                style={[
                  styles.planCard,
                  item.completed && styles.planCardCompleted,
                ]}
              >
                <View style={styles.dayBadge}>
                  <Text style={styles.dayNumber}>
                    {index + 1}
                  </Text>

                  <Text style={styles.dayText}>
                    DAY
                  </Text>
                </View>

                <View style={styles.planInfo}>
                  <View style={styles.planTitleRow}>
                    <Text
                      style={[
                        styles.planSubject,
                        item.completed &&
                          styles.completedText,
                      ]}
                    >
                      {item.subject}
                    </Text>

                    <View
                      style={[
                        styles.typeBadge,
                        item.type === "Revision" &&
                          styles.revisionBadge,
                        item.type === "Practice" &&
                          styles.practiceBadge,
                      ]}
                    >
                      <Text style={styles.typeText}>
                        {item.type}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.topicText,
                      item.completed &&
                        styles.completedText,
                    ]}
                  >
                    {item.topic}
                  </Text>

                  <View style={styles.durationRow}>
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color={MUTED}
                    />

                    <Text style={styles.durationText}>
                      {item.duration} minutes
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name={
                    item.completed
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={25}
                  color={item.completed ? GREEN : "#CBD5E1"}
                />
              </Pressable>
            ))}
          </View>
        )}

        {/* Saved plans */}
        {savedPlans.length > 0 && (
          <View style={styles.savedSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Saved plans
              </Text>

              <Text style={styles.savedCount}>
                {savedPlans.length}
              </Text>
            </View>

            {savedPlans.map((saved) => (
              <View key={saved.id} style={styles.savedCard}>
                <View style={styles.savedIcon}>
                  <Ionicons
                    name="bookmark"
                    size={21}
                    color={PURPLE}
                  />
                </View>

                <View style={styles.savedInfo}>
                  <Text style={styles.savedTitle}>
                    {saved.title || "My Study Plan"}
                  </Text>

                  <Text style={styles.savedSubjects}>
                    {saved.subjects?.join(" • ") ||
                      "Study plan"}
                  </Text>

                  <Text style={styles.savedMeta}>
                    {saved.days || 0} days •{" "}
                    {saved.hoursPerDay || 0}h/day
                  </Text>
                </View>

                <Pressable
                  onPress={() => deletePlan(saved.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons
                    name="trash-outline"
                    size={19}
                    color={RED}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {plan.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={32}
                color={BLUE}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No plan generated yet
            </Text>

            <Text style={styles.emptyText}>
              Choose your subjects above and tap Generate
              Study Plan to create your personalized routine.
            </Text>
          </View>
        )}

        {/* Tip */}
        <View style={styles.tipCard}>
          <Ionicons
            name="bulb-outline"
            size={23}
            color={ORANGE}
          />

          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>
              Study tip
            </Text>

            <Text style={styles.tipText}>
              Short, focused sessions with regular revision
              are usually easier to maintain than long study
              sessions.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardView}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    Plan settings
                  </Text>

                  <Text style={styles.modalSubtitle}>
                    Adjust your available study time
                  </Text>
                </View>

                <Pressable
                  onPress={() => setShowSettings(false)}
                  style={styles.closeButton}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={DARK}
                  />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>
                Hours per day
              </Text>

              <TextInput
                value={hoursPerDay}
                onChangeText={setHoursPerDay}
                keyboardType="numeric"
                placeholder="2"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <Text style={styles.fieldHint}>
                Recommended: 1–6 hours per day
              </Text>

              <Text style={styles.fieldLabel}>
                Number of days
              </Text>

              <TextInput
                value={days}
                onChangeText={setDays}
                keyboardType="numeric"
                placeholder="7"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <Text style={styles.fieldHint}>
                You can create a plan for up to 30 days.
              </Text>

              <View style={styles.modalSummary}>
                <Text style={styles.modalSummaryLabel}>
                  Total planned study time
                </Text>

                <Text style={styles.modalSummaryValue}>
                  {totalStudyHours} hours
                </Text>
              </View>

              <Pressable
                onPress={() => setShowSettings(false)}
                style={styles.doneButton}
              >
                <Text style={styles.doneText}>
                  Done
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    color: MUTED,
    fontSize: 14,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
    borderWidth: 1,
    borderColor: BORDER,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: DARK,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: MUTED,
  },

  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },

  heroCard: {
    backgroundColor: "#EEF4FF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#DCE8FF",
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  heroText: {
    flex: 1,
  },

  heroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: DARK,
  },

  heroDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#52647D",
    marginTop: 4,
  },

  section: {
    marginBottom: 19,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },

  counter: {
    fontSize: 12,
    fontWeight: "700",
    color: BLUE,
    backgroundColor: "#E8F1FF",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: TEXT,
  },

  subjectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  subjectChip: {
    width: "48%",
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#D7E1EF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  subjectChipSelected: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },

  subjectText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: TEXT,
  },

  subjectTextSelected: {
    color: "#FFFFFF",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 16,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },

  summaryValue: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT,
    marginTop: 5,
  },

  summaryLabel: {
    fontSize: 10,
    color: MUTED,
    marginTop: 2,
  },

  generateButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: BLUE,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    marginBottom: 23,
  },

  generateText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.82,
  },

  disabledButton: {
    opacity: 0.65,
  },

  planSection: {
    marginBottom: 24,
  },

  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  planProgress: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
  },

  saveButton: {
    backgroundColor: GREEN,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  progressTrack: {
    height: 7,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },

  progressFill: {
    height: "100%",
    backgroundColor: GREEN,
    borderRadius: 10,
  },

  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },

  planCardCompleted: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },

  dayBadge: {
    width: 43,
    height: 47,
    borderRadius: 13,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  dayNumber: {
    fontSize: 16,
    fontWeight: "900",
    color: BLUE,
  },

  dayText: {
    fontSize: 7,
    fontWeight: "800",
    color: BLUE,
    marginTop: 1,
  },

  planInfo: {
    flex: 1,
    marginRight: 8,
  },

  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  planSubject: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: TEXT,
  },

  topicText: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 5,
  },

  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  durationText: {
    fontSize: 10,
    color: MUTED,
  },

  typeBadge: {
    backgroundColor: "#E8F1FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },

  revisionBadge: {
    backgroundColor: "#F3E8FF",
  },

  practiceBadge: {
    backgroundColor: "#FEF3C7",
  },

  typeText: {
    fontSize: 8,
    fontWeight: "800",
    color: DARK,
  },

  completedText: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },

  savedSection: {
    marginBottom: 20,
  },

  savedCount: {
    backgroundColor: "#F3E8FF",
    color: PURPLE,
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
  },

  savedCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  savedIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  savedInfo: {
    flex: 1,
  },

  savedTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT,
  },

  savedSubjects: {
    fontSize: 10,
    color: MUTED,
    marginTop: 3,
  },

  savedMeta: {
    fontSize: 10,
    color: BLUE,
    fontWeight: "700",
    marginTop: 4,
  },

  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
  },

  emptyText: {
    textAlign: "center",
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  tipCard: {
    backgroundColor: "#FFF9E8",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  tipContent: {
    flex: 1,
    marginLeft: 10,
  },

  tipTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },

  tipText: {
    fontSize: 11,
    lineHeight: 17,
    color: "#92400E",
    marginTop: 3,
  },

  bottomSpace: {
    height: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  keyboardView: {
    width: "100%",
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: DARK,
  },

  modalSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 7,
    marginTop: 7,
  },

  fieldHint: {
    fontSize: 10,
    color: MUTED,
    marginTop: 5,
    marginBottom: 7,
  },

  modalSummary: {
    backgroundColor: "#EEF4FF",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalSummaryLabel: {
    color: DARK,
    fontSize: 12,
    fontWeight: "700",
  },

  modalSummaryValue: {
    color: BLUE,
    fontSize: 16,
    fontWeight: "900",
  },

  doneButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: BLUE,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },

  doneText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
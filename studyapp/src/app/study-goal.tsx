import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

const BLUE = "#1677E8";
const DARK = "#092B78";
const GREEN = "#16A34A";
const LIGHT_BLUE = "#EAF3FF";

type GoalData = {
  targetMinutes?: number;
  date?: string;
};

function getTodayKey(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));

  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

export default function StudyGoalScreen() {
  const [targetMinutes, setTargetMinutes] = useState(300);
  const [completedMinutes, setCompletedMinutes] = useState(0);
  const [goalInput, setGoalInput] = useState("300");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = getTodayKey();

  // ============================================================
  // LOAD DAILY GOAL
  // ============================================================

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setLoading(false);
      }
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const goalRef = doc(
      db,
      "users",
      user.uid,
      "studyGoals",
      "daily"
    );

    const unsubscribe = onSnapshot(
      goalRef,
      async (snapshot) => {
        try {
          // No goal exists yet
          if (!snapshot.exists()) {
            setTargetMinutes(300);
            setGoalInput("300");

            await setDoc(
              goalRef,
              {
                targetMinutes: 300,
                date: today,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );

            setLoading(false);
            return;
          }

          const data = snapshot.data() as GoalData;

          // Goal belongs to a previous day
          if (data.date && data.date !== today) {
            setTargetMinutes(300);
            setGoalInput("300");

            await setDoc(
              goalRef,
              {
                targetMinutes: 300,
                date: today,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );

            setLoading(false);
            return;
          }

          const target = Number(
            data.targetMinutes ?? 300
          );

          const safeTarget =
            Number.isFinite(target) && target > 0
              ? Math.round(target)
              : 300;

          setTargetMinutes(safeTarget);
          setGoalInput(String(safeTarget));
        } catch (error) {
          console.log("Study goal error:", error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.log(
          "Study goal listener error:",
          error
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, [today]);

  // ============================================================
  // LOAD TODAY'S STUDY SESSIONS
  // ============================================================

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setCompletedMinutes(0);
      return;
    }

    const sessionsRef = collection(
      db,
      "users",
      user.uid,
      "studySessions"
    );

    const unsubscribe = onSnapshot(
      sessionsRef,
      (snapshot) => {
        let totalMinutes = 0;

        snapshot.forEach((sessionDoc) => {
          const data = sessionDoc.data();

          if (data.date !== today) {
            return;
          }

          const duration = Number(
            data.durationMinutes ?? 0
          );

          if (
            Number.isFinite(duration) &&
            duration > 0
          ) {
            totalMinutes += duration;
          }
        });

        setCompletedMinutes(
          Math.round(totalMinutes)
        );
      },
      (error) => {
        console.log(
          "Study sessions listener error:",
          error
        );

        setCompletedMinutes(0);
      }
    );

    return unsubscribe;
  }, [today]);

  // ============================================================
  // CALCULATE PROGRESS
  // ============================================================

  const progress =
    targetMinutes > 0
      ? Math.min(
          completedMinutes / targetMinutes,
          1
        )
      : 0;

  const progressPercent = Math.round(
    progress * 100
  );

  const remainingMinutes = Math.max(
    targetMinutes - completedMinutes,
    0
  );

  // ============================================================
  // SAVE GOAL
  // ============================================================

  const saveGoal = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Login required",
        "Please log in first."
      );
      return;
    }

    const minutes = Number(
      goalInput.trim()
    );

    if (
      !Number.isFinite(minutes) ||
      minutes <= 0
    ) {
      Alert.alert(
        "Invalid goal",
        "Please enter a study goal greater than 0 minutes."
      );
      return;
    }

    if (minutes > 1440) {
      Alert.alert(
        "Invalid goal",
        "Your daily goal cannot be more than 24 hours."
      );
      return;
    }

    try {
      setSaving(true);

      const goalRef = doc(
        db,
        "users",
        user.uid,
        "studyGoals",
        "daily"
      );

      const newTarget = Math.round(minutes);

      await setDoc(
        goalRef,
        {
          targetMinutes: newTarget,
          date: today,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setTargetMinutes(newTarget);
      setGoalInput(String(newTarget));
    } catch (error) {
      console.log(
        "Save goal error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not save your study goal. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color={BLUE}
        />

        <Text style={styles.loadingText}>
          Loading study goal...
        </Text>
      </SafeAreaView>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              Study Goal
            </Text>

            <Text style={styles.headerSubtitle}>
              Set your daily study target
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>
              🎯
            </Text>
          </View>
        </View>

        {/* TODAY'S PROGRESS */}

        <View style={styles.progressCard}>
          <Text style={styles.cardLabel}>
            TODAY'S PROGRESS
          </Text>

          <View style={styles.progressTimeRow}>
            <Text style={styles.progressMain}>
              {formatMinutes(
                completedMinutes
              )}
            </Text>

            <Text style={styles.progressTarget}>
              / {formatMinutes(targetMinutes)}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                },
              ]}
            />
          </View>

          <View style={styles.progressBottom}>
            <Text style={styles.percentText}>
              {progressPercent}% complete
            </Text>

            <Text style={styles.remainingText}>
              {completedMinutes >=
              targetMinutes
                ? "Goal completed 🎉"
                : `${formatMinutes(
                    remainingMinutes
                  )} remaining`}
            </Text>
          </View>
        </View>

        {/* DAILY TARGET */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>
                Daily Study Target
              </Text>

              <Text style={styles.description}>
                Choose how many minutes you
                want to study each day.
              </Text>
            </View>

            <View style={styles.targetIcon}>
              <Text>⏱️</Text>
            </View>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              value={goalInput}
              onChangeText={(text) => {
                const cleaned =
                  text.replace(
                    /[^0-9]/g,
                    ""
                  );

                setGoalInput(cleaned);
              }}
              keyboardType="number-pad"
              placeholder="300"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              maxLength={4}
            />

            <Text style={styles.inputUnit}>
              minutes
            </Text>
          </View>

          <Text style={styles.helperText}>
            Example: 300 minutes = 5 hours
          </Text>

          <Pressable
            style={[
              styles.saveButton,
              saving &&
                styles.disabledButton,
            ]}
            onPress={saveGoal}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text
                  style={styles.saveButtonIcon}
                >
                  ✓
                </Text>

                <Text
                  style={styles.saveButtonText}
                >
                  Save Study Goal
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* QUICK GOALS */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Quick Goals
          </Text>

          <Text style={styles.description}>
            Select a commonly used daily
            study target.
          </Text>

          <View style={styles.quickGrid}>
            {[60, 120, 180, 300, 360, 480].map(
              (minutes) => {
                const active =
                  Number(goalInput) ===
                  minutes;

                return (
                  <Pressable
                    key={minutes}
                    style={[
                      styles.quickButton,
                      active &&
                        styles.quickButtonActive,
                    ]}
                    onPress={() =>
                      setGoalInput(
                        String(minutes)
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.quickButtonText,
                        active &&
                          styles.quickButtonTextActive,
                      ]}
                    >
                      {formatMinutes(minutes)}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>
        </View>

        {/* INFORMATION */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>
              📚
            </Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Progress updates automatically
            </Text>

            <Text style={styles.infoText}>
              Completed study time comes from
              your Study Sessions. When you add
              a study session for today, your
              progress here will update
              automatically.
            </Text>
          </View>
        </View>

        {/* MOTIVATION */}

        <View style={styles.motivationCard}>
          <Text style={styles.motivationEmoji}>
            💪
          </Text>

          <View
            style={styles.motivationContent}
          >
            <Text style={styles.motivationTitle}>
              Small steps every day
            </Text>

            <Text style={styles.motivationText}>
              Consistency matters more than
              studying for long hours once in a
              while.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ================================================================
// STYLES
// ================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFF",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7FAFF",
  },

  loadingText: {
    marginTop: 12,
    color: "#667085",
    fontSize: 14,
    fontWeight: "500",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 35,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  backText: {
    fontSize: 30,
    lineHeight: 32,
    color: DARK,
    marginTop: -3,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: DARK,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: LIGHT_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  headerIconText: {
    fontSize: 21,
  },

  /* PROGRESS */

  progressCard: {
    backgroundColor: BLUE,
    borderRadius: 21,
    padding: 19,
    marginBottom: 14,
  },

  cardLabel: {
    color: "#DCEBFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  progressTimeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 7,
  },

  progressMain: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
  },

  progressTarget: {
    color: "#DCEBFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  progressTrack: {
    height: 8,
    backgroundColor:
      "rgba(255,255,255,0.25)",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 17,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },

  progressBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 9,
  },

  percentText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  remainingText: {
    color: "#DCEBFF",
    fontSize: 11,
    fontWeight: "600",
  },

  /* SECTION */

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: DARK,
  },

  description: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 17,
  },

  targetIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: LIGHT_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  /* INPUT */

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },

  input: {
    flex: 1,
    height: 49,
    borderWidth: 1,
    borderColor: "#D9E2F2",
    borderRadius: 13,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: "800",
    color: DARK,
    backgroundColor: "#F9FBFF",
  },

  inputUnit: {
    marginLeft: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  helperText: {
    marginTop: 6,
    color: "#98A2B3",
    fontSize: 10,
  },

  /* SAVE BUTTON */

  saveButton: {
    height: 48,
    borderRadius: 13,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 15,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonIcon: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* QUICK GOALS */

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 9,
    marginTop: 14,
  },

  quickButton: {
    width: "31.5%",
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: LIGHT_BLUE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D9E9FF",
  },

  quickButtonActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },

  quickButtonText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: "800",
  },

  quickButtonTextActive: {
    color: "#FFFFFF",
  },

  /* INFO */

  infoCard: {
    backgroundColor: "#EEF6FF",
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#D9E9FF",
    marginBottom: 10,
  },

  infoIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  infoIconText: {
    fontSize: 18,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: DARK,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },

  infoText: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "500",
  },

  /* MOTIVATION */

  motivationCard: {
    backgroundColor: "#ECFDF3",
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  motivationEmoji: {
    fontSize: 23,
    marginRight: 10,
  },

  motivationContent: {
    flex: 1,
  },

  motivationTitle: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },

  motivationText: {
    color: "#4B5563",
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "500",
  },

  bottomSpace: {
    height: 10,
  },
});

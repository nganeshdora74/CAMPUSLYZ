import React, { useEffect, useMemo, useState } from "react";
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
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

type StudySession = {
  id: string;
  subject: string;
  durationMinutes: number;
  notes?: string;
  date?: string;
  createdAt?: any;
};

const BLUE = "#1677E8";
const DARK = "#092B78";
const LIGHT_BLUE = "#EAF3FF";
const GREEN = "#16A34A";

function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMinutes(minutes: number) {
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

export default function StudyTodayScreen() {
  // ---------------------------------------------------------
  // TODAY'S FIREBASE STUDY SESSIONS
  // ---------------------------------------------------------
  const [sessions, setSessions] = useState<StudySession[]>([]);

  // ---------------------------------------------------------
  // FORM
  // ---------------------------------------------------------
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  // ---------------------------------------------------------
  // SAVING STATE
  // ---------------------------------------------------------
  const [saving, setSaving] = useState(false);

  // ---------------------------------------------------------
  // REAL-TIME FIREBASE STUDY SESSIONS
  //
  // Firebase:
  // users/{uid}/studySessions
  //
  // Only today's sessions are displayed.
  // ---------------------------------------------------------
  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setSessions([]);
      return;
    }

    const today = getTodayKey();

    const sessionsRef = collection(
      db,
      "users",
      user.uid,
      "studySessions"
    );

    const sessionsQuery = query(
      sessionsRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const loadedSessions: StudySession[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          // Only include today's sessions.
          if (data.date !== today) {
            return;
          }

          loadedSessions.push({
            id: docSnap.id,

            subject:
              typeof data.subject === "string" &&
              data.subject.trim()
                ? data.subject.trim()
                : "General Study",

            durationMinutes:
              Number(data.durationMinutes || 0),

            notes:
              typeof data.notes === "string"
                ? data.notes
                : "",

            date: data.date,

            createdAt: data.createdAt,
          });
        });

        setSessions(loadedSessions);
      },
      (error) => {
        console.error(
          "Study sessions listener error:",
          error
        );

        setSessions([]);

        Alert.alert(
          "Error",
          "Unable to load today's study sessions."
        );
      }
    );

    return unsubscribe;
  }, []);

  // ---------------------------------------------------------
  // TOTAL STUDY TIME TODAY
  //
  // This is the single source used by this screen.
  //
  // Home screen reads the exact same Firebase collection,
  // so both screens stay synchronized automatically.
  // ---------------------------------------------------------
  const totalMinutes = useMemo(() => {
    return sessions.reduce(
      (total, session) =>
        total + Math.max(0, session.durationMinutes),
      0
    );
  }, [sessions]);

  // ---------------------------------------------------------
  // SAVE STUDY SESSION
  // ---------------------------------------------------------
  const saveSession = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Login required",
        "Please log in first."
      );
      return;
    }

    const cleanSubject = subject.trim();
    const cleanNotes = notes.trim();

    const minutes = Number(
      duration.trim()
    );

    // -------------------------------------------------------
    // VALIDATE SUBJECT
    // -------------------------------------------------------
    if (!cleanSubject) {
      Alert.alert(
        "Subject required",
        "Please enter a subject."
      );
      return;
    }

    // -------------------------------------------------------
    // VALIDATE DURATION
    // -------------------------------------------------------
    if (
      !duration.trim() ||
      !Number.isFinite(minutes) ||
      minutes <= 0
    ) {
      Alert.alert(
        "Invalid duration",
        "Please enter a study duration greater than 0 minutes."
      );
      return;
    }

    // -------------------------------------------------------
    // MAXIMUM 24 HOURS
    // -------------------------------------------------------
    if (minutes > 1440) {
      Alert.alert(
        "Invalid duration",
        "Study duration cannot be more than 24 hours."
      );
      return;
    }

    try {
      setSaving(true);

      const sessionsRef = collection(
        db,
        "users",
        user.uid,
        "studySessions"
      );

      const roundedMinutes =
        Math.round(minutes);

      // -----------------------------------------------------
      // IMPORTANT FIREBASE DOCUMENT STRUCTURE
      //
      // users
      //   └── UID
      //       └── studySessions
      //           └── generated ID
      //               ├── subject
      //               ├── durationMinutes
      //               ├── notes
      //               ├── date
      //               ├── userId
      //               └── createdAt
      // -----------------------------------------------------
      await addDoc(sessionsRef, {
        subject: cleanSubject,

        durationMinutes:
          roundedMinutes,

        notes: cleanNotes,

        date: getTodayKey(),

        userId: user.uid,

        createdAt:
          serverTimestamp(),
      });

      // -----------------------------------------------------
      // CLEAR FORM
      // -----------------------------------------------------
      setSubject("");
      setDuration("");
      setNotes("");

      // -----------------------------------------------------
      // NO SUCCESS ALERT
      //
      // Firestore onSnapshot automatically updates:
      //
      // 1. Today's Study Time
      // 2. Today's Sessions
      // 3. Home → Study Today
      // 4. Home → Study Goal
      //
      // Therefore we don't need another popup.
      // -----------------------------------------------------
    } catch (error) {
      console.error(
        "Save study session error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not save the study session. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------------------------------------------
            HEADER
        --------------------------------------------------- */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <View>
            <Text
              style={styles.headerTitle}
            >
              Study Today
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              Track your study sessions
            </Text>
          </View>
        </View>

        {/* ---------------------------------------------------
            TODAY'S TOTAL
        --------------------------------------------------- */}
        <View style={styles.totalCard}>
          <Text
            style={styles.totalLabel}
          >
            Today's Study Time
          </Text>

          <Text
            style={styles.totalTime}
          >
            {formatMinutes(
              totalMinutes
            )}
          </Text>

          <Text
            style={
              styles.totalDescription
            }
          >
            {sessions.length === 0
              ? "No study sessions recorded yet."
              : `${sessions.length} study ${
                  sessions.length === 1
                    ? "session"
                    : "sessions"
                } today`}
          </Text>
        </View>

        {/* ---------------------------------------------------
            ADD STUDY SESSION
        --------------------------------------------------- */}
        <View style={styles.card}>
          <Text
            style={styles.cardTitle}
          >
            Add Study Session
          </Text>

          {/* SUBJECT */}
          <Text
            style={styles.inputLabel}
          >
            Subject
          </Text>

          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Mathematics"
            placeholderTextColor="#8A94A6"
            style={styles.input}
            autoCapitalize="sentences"
            editable={!saving}
          />

          {/* DURATION */}
          <Text
            style={styles.inputLabel}
          >
            Duration (minutes)
          </Text>

          <TextInput
            value={duration}
            onChangeText={setDuration}
            placeholder="e.g. 60"
            placeholderTextColor="#8A94A6"
            keyboardType="numeric"
            style={styles.input}
            editable={!saving}
          />

          {/* QUICK DURATIONS */}
          <View
            style={styles.quickRow}
          >
            {[25, 45, 60, 90, 120].map(
              (minutes) => (
                <Pressable
                  key={minutes}
                  style={({ pressed }) => [
                    styles.quickButton,
                    pressed &&
                      styles.quickButtonPressed,
                  ]}
                  onPress={() =>
                    setDuration(
                      String(minutes)
                    )
                  }
                  disabled={saving}
                >
                  <Text
                    style={
                      styles.quickButtonText
                    }
                  >
                    {minutes}m
                  </Text>
                </Pressable>
              )
            )}
          </View>

          {/* NOTES */}
          <Text
            style={styles.inputLabel}
          >
            Notes (optional)
          </Text>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="What did you study?"
            placeholderTextColor="#8A94A6"
            multiline
            textAlignVertical="top"
            style={[
              styles.input,
              styles.notesInput,
            ]}
            editable={!saving}
          />

          {/* SAVE */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              saving &&
                styles.disabledButton,
              pressed &&
                !saving &&
                styles.saveButtonPressed,
            ]}
            onPress={saveSession}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.saveButtonText
                }
              >
                Save Study Session
              </Text>
            )}
          </Pressable>
        </View>

        {/* ---------------------------------------------------
            TODAY'S SESSIONS
        --------------------------------------------------- */}
        <View
          style={styles.sessionsSection}
        >
          <Text
            style={styles.sectionTitle}
          >
            Today's Sessions
          </Text>

          {sessions.length === 0 ? (
            <View
              style={styles.emptyCard}
            >
              <Text
                style={styles.emptyIcon}
              >
                📚
              </Text>

              <Text
                style={styles.emptyTitle}
              >
                No sessions yet
              </Text>

              <Text
                style={styles.emptyText}
              >
                Add your first study
                session above.
              </Text>
            </View>
          ) : (
            sessions.map(
              (session) => (
                <View
                  key={session.id}
                  style={
                    styles.sessionCard
                  }
                >
                  <View
                    style={
                      styles.sessionIcon
                    }
                  >
                    <Text
                      style={
                        styles.sessionIconText
                      }
                    >
                      📖
                    </Text>
                  </View>

                  <View
                    style={
                      styles.sessionContent
                    }
                  >
                    <Text
                      style={
                        styles.sessionSubject
                      }
                    >
                      {session.subject}
                    </Text>

                    {session.notes ? (
                      <Text
                        style={
                          styles.sessionNotes
                        }
                        numberOfLines={2}
                      >
                        {session.notes}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={
                      styles.sessionDurationContainer
                    }
                  >
                    <Text
                      style={
                        styles.sessionDuration
                      }
                    >
                      {formatMinutes(
                        session.durationMinutes
                      )}
                    </Text>

                    <Text
                      style={
                        styles.completedText
                      }
                    >
                      Completed
                    </Text>
                  </View>
                </View>
              )
            )
          )}
        </View>

        {/* ---------------------------------------------------
            STUDY GOAL
        --------------------------------------------------- */}
        <Pressable
          style={({ pressed }) => [
            styles.goalButton,
            pressed &&
              styles.goalButtonPressed,
          ]}
          onPress={() =>
            router.push(
              "/study-goal"
            )
          }
        >
          <View>
            <Text
              style={
                styles.goalButtonTitle
              }
            >
              View Study Goal
            </Text>

            <Text
              style={
                styles.goalButtonSubtitle
              }
            >
              Check today's progress
            </Text>
          </View>

          <Text
            style={styles.arrow}
          >
            ›
          </Text>
        </Pressable>

        <View
          style={{ height: 20 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    elevation: 2,
  },

  backText: {
    fontSize: 34,
    lineHeight: 36,
    color: DARK,
    marginTop: -4,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: DARK,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 14,
    color: "#6B7280",
  },

  totalCard: {
    backgroundColor: BLUE,
    borderRadius: 22,
    padding: 24,
    marginBottom: 18,
  },

  totalLabel: {
    color: "#DCEBFF",
    fontSize: 14,
    fontWeight: "600",
  },

  totalTime: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "900",
    marginTop: 8,
  },

  totalDescription: {
    color: "#E7F0FF",
    fontSize: 13,
    marginTop: 5,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: DARK,
    marginBottom: 18,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#D9E0EA",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FAFBFD",
    marginBottom: 15,
  },

  notesInput: {
    height: 90,
    paddingTop: 13,
  },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 17,
  },

  quickButton: {
    backgroundColor: LIGHT_BLUE,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },

  quickButtonPressed: {
    opacity: 0.65,
  },

  quickButtonText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: "700",
  },

  saveButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  saveButtonPressed: {
    opacity: 0.8,
  },

  disabledButton: {
    opacity: 0.65,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  sessionsSection: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: DARK,
    marginBottom: 12,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 34,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: DARK,
  },

  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 5,
    textAlign: "center",
  },

  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EEF6EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  sessionIconText: {
    fontSize: 21,
  },

  sessionContent: {
    flex: 1,
    paddingRight: 8,
  },

  sessionSubject: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK,
  },

  sessionNotes: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  sessionDurationContainer: {
    alignItems: "flex-end",
  },

  sessionDuration: {
    fontSize: 15,
    fontWeight: "800",
    color: GREEN,
  },

  completedText: {
    fontSize: 10,
    color: "#7B8494",
    marginTop: 3,
  },

  goalButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
  },

  goalButtonPressed: {
    opacity: 0.75,
  },

  goalButtonTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK,
  },

  goalButtonSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },

  arrow: {
    fontSize: 28,
    color: BLUE,
  },
});
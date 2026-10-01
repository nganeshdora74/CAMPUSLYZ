import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const PURPLE = "#5B45E6";

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;

type Mode = "Focus" | "Break";

export default function FocusScreen() {
  const [mode, setMode] = useState<Mode>("Focus");
  const [secondsLeft, setSecondsLeft] = useState(
    FOCUS_MINUTES * 60
  );
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  // --------------------------------------------------
  // TIMER
  // --------------------------------------------------

  useEffect(() => {
    if (!running) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);

          handleTimerFinished();

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  // --------------------------------------------------
  // TIMER FINISHED
  // --------------------------------------------------

  const handleTimerFinished = async () => {
    setRunning(false);

    if (mode === "Focus") {
      await saveStudySession(FOCUS_MINUTES);

      Alert.alert(
        "Focus session complete",
        "Great work! Your study time has been saved."
      );

      setMode("Break");
      setSecondsLeft(BREAK_MINUTES * 60);
    } else {
      Alert.alert(
        "Break complete",
        "Your break is over. Ready to focus again?"
      );

      setMode("Focus");
      setSecondsLeft(FOCUS_MINUTES * 60);
    }
  };

  // --------------------------------------------------
  // SAVE STUDY SESSION
  // --------------------------------------------------

  const saveStudySession = async (
    durationMinutes: number
  ) => {
    const user = auth.currentUser;

    if (!user) {
      console.log(
        "No logged-in user. Study session was not saved."
      );
      return;
    }

    try {
      setSaving(true);

      await addDoc(
        collection(db, "studySessions"),
        {
          userId: user.uid,
          durationMinutes,
          startedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }
      );

      console.log(
        "Study session saved for UID:",
        user.uid
      );
    } catch (error) {
      console.error(
        "Study session save error:",
        error
      );

      Alert.alert(
        "Could not save study session",
        "Your timer finished, but the study session could not be saved."
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // START / PAUSE
  // --------------------------------------------------

  const toggleTimer = () => {
    if (saving) {
      return;
    }

    setRunning((current) => !current);
  };

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  const resetTimer = () => {
    setRunning(false);

    setSecondsLeft(
      mode === "Focus"
        ? FOCUS_MINUTES * 60
        : BREAK_MINUTES * 60
    );
  };

  // --------------------------------------------------
  // CHANGE MODE
  // --------------------------------------------------

  const changeMode = (nextMode: Mode) => {
    if (running || saving) {
      return;
    }

    setMode(nextMode);

    setSecondsLeft(
      nextMode === "Focus"
        ? FOCUS_MINUTES * 60
        : BREAK_MINUTES * 60
    );
  };

  // --------------------------------------------------
  // FORMAT TIMER
  // --------------------------------------------------

  const minutes = Math.floor(
    secondsLeft / 60
  );

  const seconds = secondsLeft % 60;

  const formattedTime = `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={running || saving}
        >
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Focus timer
        </Text>

        <TouchableOpacity
          onPress={resetTimer}
          disabled={running || saving}
        >
          <Text style={styles.reset}>
            ↻
          </Text>
        </TouchableOpacity>
      </View>

      {/* TIMER */}

      <View
        style={[
          styles.timer,
          mode === "Break" &&
            styles.breakTimer,
        ]}
      >
        <Text style={styles.time}>
          {formattedTime}
        </Text>

        <Text style={styles.focusText}>
          {mode === "Focus"
            ? "Let's focus!"
            : "Take a break"}
        </Text>
      </View>

      {/* START / PAUSE */}

      <TouchableOpacity
        style={[
          styles.button,
          saving && styles.disabledButton,
        ]}
        onPress={toggleTimer}
        disabled={saving}
      >
        {saving ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />

            <Text style={styles.buttonText}>
              Saving...
            </Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>
            {running ? "Pause" : "Start"}
          </Text>
        )}
      </TouchableOpacity>

      {/* MODES */}

      <View style={styles.mode}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === "Focus" &&
              styles.activeMode,
          ]}
          onPress={() =>
            changeMode("Focus")
          }
          disabled={running || saving}
        >
          <Text
            style={[
              styles.modeText,
              mode === "Focus" &&
                styles.active,
            ]}
          >
            Focus
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === "Break" &&
              styles.activeMode,
          ]}
          onPress={() =>
            changeMode("Break")
          }
          disabled={running || saving}
        >
          <Text
            style={[
              styles.modeText,
              mode === "Break" &&
                styles.active,
            ]}
          >
            Break
          </Text>
        </TouchableOpacity>
      </View>

      {/* INFO */}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>
          Pomodoro timer
        </Text>

        <Text style={styles.infoText}>
          Focus for 25 minutes, then take a
          5-minute break. Completed focus
          sessions are automatically added
          to your Progress.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 24,
    paddingTop: 55,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  back: {
    fontSize: 30,
    color: "#111827",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  reset: {
    fontSize: 24,
    color: PURPLE,
  },

  timer: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 8,
    borderColor: "#DCD7FF",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },

  breakTimer: {
    borderColor: "#D8EEE8",
  },

  time: {
    fontSize: 42,
    fontWeight: "800",
    color: "#111827",
  },

  focusText: {
    marginTop: 8,
    color: "#737987",
    fontSize: 14,
  },

  button: {
    width: 150,
    height: 50,
    backgroundColor: PURPLE,
    borderRadius: 12,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },

  disabledButton: {
    opacity: 0.7,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  mode: {
    flexDirection: "row",
    backgroundColor: "#F6F5FA",
    padding: 6,
    borderRadius: 15,
    marginTop: 30,
  },

  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  activeMode: {
    backgroundColor: "#FFFFFF",
  },

  modeText: {
    color: "#666",
    fontWeight: "600",
  },

  active: {
    color: PURPLE,
    fontWeight: "800",
  },

  infoCard: {
    backgroundColor: "#F7F6FF",
    borderRadius: 18,
    padding: 18,
    marginTop: 30,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  infoText: {
    color: "#777",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },
});
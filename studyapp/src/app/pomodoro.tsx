import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const BLUE = "#1677E8";
const DARK = "#092B78";
const PURPLE = "#7C3AED";
const GREEN = "#16A34A";
const ORANGE = "#F59E0B";
const RED = "#DC2626";
const LIGHT_BLUE = "#EEF6FF";
const LIGHT_PURPLE = "#F5F0FF";
const LIGHT_GREEN = "#ECFDF3";
const LIGHT_ORANGE = "#FFF7E6";
const LIGHT_RED = "#FEF2F2";

type Mode = "focus" | "shortBreak" | "longBreak";

type ModeInfo = {
  label: string;
  minutes: number;
  icon: keyof typeof Ionicons.glyphMap;
};

const MODES: Record<Mode, ModeInfo> = {
  focus: {
    label: "Focus",
    minutes: 25,
    icon: "flame-outline",
  },
  shortBreak: {
    label: "Short Break",
    minutes: 5,
    icon: "cafe-outline",
  },
  longBreak: {
    label: "Long Break",
    minutes: 15,
    icon: "bed-outline",
  },
};

export default function PomodoroScreen() {
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(
    MODES.focus.minutes * 60
  );
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);

  const currentMode = MODES[mode];

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          clearInterval(interval);

          setIsRunning(false);

          if (mode === "focus") {
            setCompletedSessions((count) => count + 1);
            setTotalFocusMinutes((minutes) => minutes + currentMode.minutes);

            Alert.alert(
              "Focus session complete 🎉",
              "Great work! Take a short break before your next session."
            );
          } else {
            Alert.alert(
              "Break complete ☀️",
              "Ready to get back to studying?"
            );
          }

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, mode, currentMode.minutes]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }, [secondsLeft]);

  const progress = useMemo(() => {
    const totalSeconds = currentMode.minutes * 60;

    if (totalSeconds <= 0) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(1, 1 - secondsLeft / totalSeconds)
    );
  }, [secondsLeft, currentMode.minutes]);

  const modeColor = useMemo(() => {
    if (mode === "focus") {
      return PURPLE;
    }

    if (mode === "shortBreak") {
      return GREEN;
    }

    return BLUE;
  }, [mode]);

  const modeBackground = useMemo(() => {
    if (mode === "focus") {
      return LIGHT_PURPLE;
    }

    if (mode === "shortBreak") {
      return LIGHT_GREEN;
    }

    return LIGHT_BLUE;
  }, [mode]);

  const changeMode = (newMode: Mode) => {
    setIsRunning(false);
    setMode(newMode);
    setSecondsLeft(MODES[newMode].minutes * 60);
  };

  const toggleTimer = () => {
    if (secondsLeft <= 0) {
      setSecondsLeft(currentMode.minutes * 60);
    }

    setIsRunning((running) => !running);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(currentMode.minutes * 60);
  };

  const resetStats = () => {
    Alert.alert(
      "Reset statistics?",
      "This will reset your completed sessions and total focus time.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setCompletedSessions(0);
            setTotalFocusMinutes(0);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={21} color={DARK} />
            </Pressable>

            <View>
              <Text style={styles.headerTitle}>Pomodoro</Text>
              <Text style={styles.headerSubtitle}>
                Focus better, study smarter
              </Text>
            </View>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="timer-outline" size={23} color={BLUE} />
          </View>
        </View>

        {/* Mode selector */}
        <View style={styles.modeSelector}>
          {(Object.keys(MODES) as Mode[]).map((item) => {
            const active = item === mode;

            return (
              <Pressable
                key={item}
                style={[
                  styles.modeButton,
                  active && {
                    backgroundColor: modeColor,
                  },
                ]}
                onPress={() => changeMode(item)}
              >
                <Ionicons
                  name={MODES[item].icon}
                  size={16}
                  color={active ? "#FFFFFF" : "#64748B"}
                />

                <Text
                  style={[
                    styles.modeButtonText,
                    active && styles.modeButtonTextActive,
                  ]}
                >
                  {MODES[item].label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Timer card */}
        <View
          style={[
            styles.timerCard,
            {
              backgroundColor: modeBackground,
              borderColor: modeColor,
            },
          ]}
        >
          <View style={styles.timerLabelRow}>
            <View
              style={[
                styles.timerIconCircle,
                { backgroundColor: modeColor },
              ]}
            >
              <Ionicons
                name={currentMode.icon}
                size={20}
                color="#FFFFFF"
              />
            </View>

            <Text style={[styles.timerLabel, { color: modeColor }]}>
              {currentMode.label.toUpperCase()}
            </Text>
          </View>

          <Text style={[styles.timerText, { color: DARK }]}>
            {formattedTime}
          </Text>

          <Text style={styles.timerHint}>
            {isRunning
              ? "Stay focused — you've got this!"
              : secondsLeft === 0
              ? "Session complete"
              : "Press start when you're ready"}
          </Text>

          {/* Progress */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: modeColor,
                },
              ]}
            />
          </View>

          {/* Timer controls */}
          <View style={styles.controlsRow}>
            <Pressable
              style={styles.secondaryControl}
              onPress={resetTimer}
            >
              <Ionicons name="refresh" size={20} color={DARK} />
            </Pressable>

            <Pressable
              style={[
                styles.playButton,
                { backgroundColor: modeColor },
              ]}
              onPress={toggleTimer}
            >
              <Ionicons
                name={isRunning ? "pause" : "play"}
                size={25}
                color="#FFFFFF"
              />

              <Text style={styles.playButtonText}>
                {isRunning ? "Pause" : "Start"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryControl}
              onPress={() => changeMode("focus")}
            >
              <Ionicons name="repeat" size={20} color={DARK} />
            </Pressable>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>

          <Pressable onPress={resetStats}>
            <Text style={styles.resetStatsText}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: LIGHT_PURPLE },
              ]}
            >
              <Ionicons name="checkmark-circle" size={20} color={PURPLE} />
            </View>

            <Text style={styles.statValue}>{completedSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: LIGHT_GREEN },
              ]}
            >
              <Ionicons name="time" size={20} color={GREEN} />
            </View>

            <Text style={styles.statValue}>{totalFocusMinutes}</Text>
            <Text style={styles.statLabel}>Focus minutes</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: LIGHT_ORANGE },
              ]}
            >
              <Ionicons name="trophy" size={20} color={ORANGE} />
            </View>

            <Text style={styles.statValue}>
              {completedSessions >= 4 ? "Great" : "Keep going"}
            </Text>
            <Text style={styles.statLabel}>Daily target</Text>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={BLUE}
              />
            </View>

            <Text style={styles.infoTitle}>How Pomodoro works</Text>
          </View>

          <Text style={styles.infoText}>
            Study for 25 minutes without distractions, then take a
            5-minute break. After four focus sessions, take a longer
            15-minute break.
          </Text>

          <View style={styles.steps}>
            <View style={styles.step}>
              <View
                style={[
                  styles.stepNumber,
                  { backgroundColor: PURPLE },
                ]}
              >
                <Text style={styles.stepNumberText}>1</Text>
              </View>

              <Text style={styles.stepText}>25 min Focus</Text>
            </View>

            <Ionicons name="arrow-forward" size={15} color="#94A3B8" />

            <View style={styles.step}>
              <View
                style={[
                  styles.stepNumber,
                  { backgroundColor: GREEN },
                ]}
              >
                <Text style={styles.stepNumberText}>2</Text>
              </View>

              <Text style={styles.stepText}>5 min Break</Text>
            </View>

            <Ionicons name="arrow-forward" size={15} color="#94A3B8" />

            <View style={styles.step}>
              <View
                style={[
                  styles.stepNumber,
                  { backgroundColor: BLUE },
                ]}
              >
                <Text style={styles.stepNumberText}>3</Text>
              </View>

              <Text style={styles.stepText}>Repeat</Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb-outline" size={21} color={ORANGE} />
          </View>

          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Focus tip</Text>

            <Text style={styles.tipText}>
              Put your phone on silent and choose one specific task
              before starting a focus session.
            </Text>
          </View>
        </View>

        {/* Reset statistics warning/action */}
        {completedSessions > 0 && (
          <Pressable style={styles.clearButton} onPress={resetStats}>
            <Ionicons name="trash-outline" size={17} color={RED} />
            <Text style={styles.clearButtonText}>
              Reset today's statistics
            </Text>
          </Pressable>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 30,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: DARK,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: LIGHT_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Mode selector */
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 5,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  modeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  modeButtonText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
  },

  modeButtonTextActive: {
    color: "#FFFFFF",
  },

  /* Timer */
  timerCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 22,
  },

  timerLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  timerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  timerLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  timerText: {
    fontSize: 64,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 8,
    fontVariant: ["tabular-nums"],
  },

  timerHint: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },

  progressTrack: {
    width: "100%",
    height: 7,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 20,
  },

  progressFill: {
    height: "100%",
    borderRadius: 10,
  },

  controlsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },

  secondaryControl: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  playButton: {
    minWidth: 145,
    height: 48,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  playButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Section */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: DARK,
  },

  resetStatsText: {
    fontSize: 11,
    color: RED,
    fontWeight: "700",
  },

  /* Stats */
  statsGrid: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 18,
  },

  statCard: {
    flex: 1,
    minHeight: 116,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  statValue: {
    fontSize: 18,
    fontWeight: "900",
    color: DARK,
  },

  statLabel: {
    marginTop: 2,
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },

  /* Information card */
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },

  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: LIGHT_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 19,
    color: "#64748B",
    fontWeight: "500",
  },

  steps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
  },

  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  stepNumber: {
    width: 23,
    height: 23,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  stepNumberText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "900",
  },

  stepText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "700",
  },

  /* Tip */
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: LIGHT_ORANGE,
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  tipIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  tipContent: {
    flex: 1,
  },

  tipTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: DARK,
    marginBottom: 3,
  },

  tipText: {
    fontSize: 11,
    lineHeight: 17,
    color: "#64748B",
    fontWeight: "500",
  },

  /* Clear */
  clearButton: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: LIGHT_RED,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  clearButtonText: {
    color: RED,
    fontSize: 12,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 10,
  },
});
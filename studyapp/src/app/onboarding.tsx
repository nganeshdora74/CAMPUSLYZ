import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

export default function OnboardingScreen() {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.skip}
        onPress={() => router.replace("/login")}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.illustration}>
          <Text style={styles.illustrationText}>📚</Text>
        </View>

        <Text style={styles.title}>
          Organize your tasks
        </Text>

        <Text style={styles.description}>
          Stay on top of your tasks and never miss a deadline.
        </Text>

        <View style={styles.dots}>
          <View style={styles.activeDot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  skip: {
    position: "absolute",
    top: 55,
    right: 25,
    zIndex: 5,
  },

  skipText: {
    fontSize: 13,
    color: "#555",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  illustration: {
    width: 230,
    height: 220,
    borderRadius: 30,
    backgroundColor: "#F0EDFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 35,
  },

  illustrationText: {
    fontSize: 90,
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#737987",
    textAlign: "center",
    marginTop: 10,
    maxWidth: 280,
  },

  dots: {
    flexDirection: "row",
    marginTop: 28,
    gap: 6,
  },

  activeDot: {
    width: 18,
    height: 6,
    borderRadius: 5,
    backgroundColor: "#5B45E6",
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: "#D8D6E4",
  },

  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#5B45E6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
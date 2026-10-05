import React, { useEffect } from "react";
import { Platform } from "react-native";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase/config";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

export default function TabLayout() {
  const { colors, isDark } = useAppTheme();
  const { t, languageCode } = useLanguage();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Tabs
      key={`tab-nav-${languageCode}`}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: Platform.OS === "ios" ? 70 : 58,
          paddingTop: 4,
          paddingBottom: Platform.OS === "ios" ? 18 : 6,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: "600",
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: t("home", "Home"),
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="home-outline"
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* Tasks */}
      <Tabs.Screen
        name="tasks"
        options={{
          title: t("tasks", "Tasks"),
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* Schedule */}
      <Tabs.Screen
        name="schedule"
        options={{
          title: t("schedule", "Schedule"),
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="time-outline"
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* Progress */}
      <Tabs.Screen
        name="progress"
        options={{
          title: t("progress", "Progress"),
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="trending-up-outline"
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* AI Assistant - compact title so it doesn't wrap */}
      <Tabs.Screen
        name="ai-assistant"
        options={{
          title: t("aiShort", "AI"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "sparkles" : "sparkles-outline"}
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile", "Profile"),
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="person-outline"
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* Auxiliary screens accessible via router.push() */}
      <Tabs.Screen
        name="study"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

import React from "react";
import { Stack } from "expo-router";
import { ThemeProvider } from "../context/ThemeContext";
import { LanguageProvider } from "../context/LanguageContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
      {/* Entry / authentication screens */}
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />

      {/* Main application with bottom tabs */}
      <Stack.Screen
        name="(tab)"
        options={{
          headerShown: false,
        }}
      />

      {/* Admin screens */}
      <Stack.Screen
        name="admin"
        options={{
          headerShown: false,
        }}
      />

      {/* Other application screens */}
      <Stack.Screen name="Events" />
      <Stack.Screen name="announcement" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="focus" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="student" />
      <Stack.Screen name="study" />
      <Stack.Screen name="add-task" />
      <Stack.Screen name="more" />
      <Stack.Screen name="fees" />
      <Stack.Screen name="hostel" />
      <Stack.Screen name="mess" />
      <Stack.Screen name="notices" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="cgpa-calculator" />
      <Stack.Screen name="debug" />
      <Stack.Screen name="translator" />
      <Stack.Screen name="subjects" />
      <Stack.Screen name="branch-selection" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="gate-pass" />
      <Stack.Screen name="document-request" />
      <Stack.Screen name="leave-gatepass" />
      <Stack.Screen name="ai-assistant" />
    </Stack>
      </LanguageProvider>
    </ThemeProvider>
  );
}



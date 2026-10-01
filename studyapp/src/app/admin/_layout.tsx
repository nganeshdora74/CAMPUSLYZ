import React from "react";
import { Stack } from "expo-router";
import { useAdminTheme } from "../../hooks/useAdminTheme";

export default function AdminLayout() {
  const { colors } = useAdminTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.adminBg },
      }}
    />
  );
}
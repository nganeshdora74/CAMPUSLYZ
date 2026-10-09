import React from "react";
import { Redirect } from "expo-router";

export default function TeacherAIAssistantWithSpaceRedirect() {
  return <Redirect href={"/teacher/ai-assistant" as any} />;
}
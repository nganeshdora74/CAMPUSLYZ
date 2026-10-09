import React from "react";
import { Redirect } from "expo-router";

export default function TeacherMessagesScreen() {
  return <Redirect href={"/messages?role=teacher" as any} />;
}

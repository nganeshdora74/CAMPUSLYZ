import React from "react";
import { Redirect } from "expo-router";

export default function TeacherSpecialNotesWithSpaceRedirect() {
  return <Redirect href={"/teacher/special-notes" as any} />;
}

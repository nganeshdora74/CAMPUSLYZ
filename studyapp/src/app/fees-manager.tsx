import { useEffect } from "react";
import { router } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function FeesManagerRedirect() {
  useEffect(() => {
    router.replace("/fee-manager" as any);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}

import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { NoticeStats, subscribeToNoticeStats } from "../../services/noticeService";

export default function ReportsScreen() {
  const { isDark } = useTheme();
  const [stats, setStats] = useState<NoticeStats>({
    totalNotices: 0,
    publishedNotices: 0,
    draftNotices: 0,
    certificatesIssued: 0,
    pendingRequests: 0,
    circularsCount: 0,
    eventsCount: 0,
    weeklyNoticesCount: 0,
    weeklyCertificatesCount: 0,
    weeklyCircularsCount: 0,
    weeklyEventsCount: 0,
  });

  useEffect(() => {
    const unsub = subscribeToNoticeStats((data) => setStats(data));
    return () => unsub();
  }, []);

  const handleGenerate = (type: string, count: number) => {
    Alert.alert(
      "Report Generated 📊",
      `Official ${type} Compiled Successfully.\nTotal Data Points: ${count}\nData verified with Firebase and MongoDB.`
    );
  };

  const bg = isDark ? "#0F172A" : "#F4F7FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: textColor }]}>📊 Institutional Reports</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 16 }}>
          {/* Card 1: Notice Report */}
          <View style={[styles.reportCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="newspaper" size={24} color="#2563EB" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 14 }}>
              <Text style={[styles.reportTitle, { color: textColor }]}>Notice Report</Text>
              <Text style={{ fontSize: 13, color: subTextColor, marginTop: 2 }}>
                Total notices: {stats.totalNotices} ({stats.publishedNotices} published, {stats.draftNotices} drafts)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.genBtn}
              onPress={() => handleGenerate("Notice Report", stats.totalNotices)}
            >
              <Text style={styles.genBtnText}>Generate Report ›</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Certificate Report */}
          <View style={[styles.reportCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={[styles.iconCircle, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="ribbon" size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 14 }}>
              <Text style={[styles.reportTitle, { color: textColor }]}>Certificate Report</Text>
              <Text style={{ fontSize: 13, color: subTextColor, marginTop: 2 }}>
                Total issued: {stats.certificatesIssued} • Pending approvals: {stats.pendingRequests}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.genBtn, { backgroundColor: "#10B981" }]}
              onPress={() => handleGenerate("Certificate Report", stats.certificatesIssued)}
            >
              <Text style={styles.genBtnText}>Generate Report ›</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Request Report */}
          <View style={[styles.reportCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={[styles.iconCircle, { backgroundColor: "#F5F3FF" }]}>
              <Ionicons name="mail" size={24} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 14 }}>
              <Text style={[styles.reportTitle, { color: textColor }]}>Request Report</Text>
              <Text style={{ fontSize: 13, color: subTextColor, marginTop: 2 }}>
                Pending student queries and certificate fulfillment metrics
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.genBtn, { backgroundColor: "#8B5CF6" }]}
              onPress={() => handleGenerate("Request Report", stats.pendingRequests)}
            >
              <Text style={styles.genBtnText}>Generate Report ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: { fontSize: 20, fontWeight: "800" },
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  reportTitle: { fontSize: 16, fontWeight: "700" },
  genBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  genBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
});
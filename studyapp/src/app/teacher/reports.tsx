import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import NotificationBellModal from "../../components/NotificationBellModal";

export default function TeacherReportsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const statCards = [
    { title: "Class Average", value: "82.4%", sub: "+3.2% vs last sem", icon: "trending-up", color: "#2563EB" },
    { title: "Pass Rate", value: "96.5%", sub: "180/186 students", icon: "shield-checkmark", color: "#10B981" },
    { title: "Highest Score", value: "98.0%", sub: "Aarav Sharma (Python)", icon: "trophy", color: "#F59E0B" },
    { title: "Avg Attendance", value: "92.0%", sub: "Well above 75% min", icon: "pie-chart", color: "#8B5CF6" },
  ];

  const subjectScores = [
    { name: "Python Programming", code: "CS-301", avg: 85, pass: "98%", students: 48 },
    { name: "Data Structures", code: "CS-302", avg: 78, pass: "94%", students: 52 },
    { name: "Web Technologies", code: "CS-401", avg: 88, pass: "99%", students: 46 },
    { name: "DBMS", code: "CS-402", avg: 81, pass: "95%", students: 50 },
  ];

  const topStudents = [
    { rank: 1, name: "Aarav Sharma", roll: "CS2101", className: "B.Tech CSE - A", score: "98.0%", attendance: "96%" },
    { rank: 2, name: "Ananya Verma", roll: "CS2102", className: "B.Tech CSE - A", score: "96.5%", attendance: "94%" },
    { rank: 3, name: "Priya Singh", roll: "CS2104", className: "B.Tech CSE - B", score: "94.0%", attendance: "98%" },
    { rank: 4, name: "Ishaan Mehta", roll: "CS2105", className: "B.Tech CSE - A", score: "92.5%", attendance: "91%" },
    { rank: 5, name: "Kavya Nair", roll: "CS2106", className: "B.Tech CSE - B", score: "91.0%", attendance: "93%" },
  ];

  const handleExport = () => {
    setToastMessage("Comprehensive Academic Report downloaded successfully (PDF).");
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/teacher")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Academic Reports & Analytics</Text>
            <Text style={styles.pageSubtitle}>Class trends, grade distributions and student rankings</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            <Text style={styles.exportBtnText}>Export PDF</Text>
          </TouchableOpacity>
          <NotificationBellModal />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {toastMessage && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* 4 Stats */}
        <View style={styles.statsGrid}>
          {statCards.map((c) => (
            <View key={c.title} style={[styles.statCard, { borderLeftColor: c.color }]}>
              <View style={styles.statTop}>
                <Text style={styles.statTitle}>{c.title}</Text>
                <Ionicons name={c.icon as any} size={20} color={c.color} />
              </View>
              <Text style={styles.statValue}>{c.value}</Text>
              <Text style={styles.statSub}>{c.sub}</Text>
            </View>
          ))}
        </View>

        {/* Subject Comparison */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Subject-Wise Average Scores</Text>
          <Text style={styles.cardHeaderSub}>Aggregated over quizzes, mid-term and assignments</Text>

          <View style={styles.subjectList}>
            {subjectScores.map((s) => (
              <View key={s.code} style={styles.subjectRow}>
                <View style={styles.subjectMeta}>
                  <Text style={styles.subjectName}>{s.name} ({s.code})</Text>
                  <Text style={styles.subjectDetails}>{s.students} Students • {s.pass} Pass Rate</Text>
                </View>

                <View style={styles.barArea}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${s.avg}%` }]} />
                  </View>
                  <Text style={styles.avgText}>{s.avg}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Top Performers Table */}
        <View style={styles.card}>
          <View style={styles.tableHeadRow}>
            <Text style={styles.cardHeaderTitle}>Top Performers Leaderboard</Text>
            <Text style={styles.tableHeadSub}>Top 5 based on aggregate semester score</Text>
          </View>

          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 50, textAlign: "center" }]}>#</Text>
              <Text style={[styles.th, { flex: 1 }]}>Student</Text>
              <Text style={[styles.th, { width: 120 }]}>Class</Text>
              <Text style={[styles.th, { width: 90, textAlign: "center" }]}>Overall</Text>
              <Text style={[styles.th, { width: 90, textAlign: "center" }]}>Attendance</Text>
            </View>

            {topStudents.map((st) => (
              <View key={st.roll} style={styles.trow}>
                <View style={[styles.rankBadge, { width: 50 }]}>
                  <Text style={styles.rankNum}>{st.rank}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.stName}>{st.name}</Text>
                  <Text style={styles.stRoll}>{st.roll}</Text>
                </View>

                <Text style={[styles.stClass, { width: 120 }]}>{st.className}</Text>

                <View style={{ width: 90, alignItems: "center" }}>
                  <View style={styles.scorePill}>
                    <Text style={styles.scoreText}>{st.score}</Text>
                  </View>
                </View>

                <View style={{ width: 90, alignItems: "center" }}>
                  <Text style={styles.attendText}>{st.attendance}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0A1E3F",
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 20,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  toastText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#065F46",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
  },
  statTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 4,
  },
  statSub: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardHeaderSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 16,
  },
  subjectList: {
    gap: 14,
  },
  subjectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  subjectMeta: {
    minWidth: 200,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  subjectDetails: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  barArea: {
    flex: 1,
    minWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 5,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 5,
  },
  avgText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
    width: 45,
    textAlign: "right",
  },
  tableHeadRow: {
    marginBottom: 12,
  },
  tableHeadSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  th: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  trow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rankBadge: {
    alignItems: "center",
  },
  rankNum: {
    fontSize: 14,
    fontWeight: "800",
    color: "#D97706",
  },
  stName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  stRoll: {
    fontSize: 11,
    color: "#64748B",
  },
  stClass: {
    fontSize: 12,
    color: "#475569",
  },
  scorePill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  attendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
});

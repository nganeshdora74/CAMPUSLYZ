import React, { useState } from "react";
import {
  Alert,
  Platform,
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

interface HistoryRecord {
  id: string;
  date: string;
  subject: string;
  className: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

const HISTORY_DATA: HistoryRecord[] = [
  {
    id: "h-1",
    date: "07 Oct 2026",
    className: "B.Tech CSE - A",
    subject: "Python Programming",
    total: 48,
    present: 44,
    absent: 4,
    percentage: 92,
  },
  {
    id: "h-2",
    date: "06 Oct 2026",
    className: "B.Tech CSE - A",
    subject: "Python Programming",
    total: 48,
    present: 45,
    absent: 3,
    percentage: 94,
  },
  {
    id: "h-3",
    date: "05 Oct 2026",
    className: "B.Tech CSE - B",
    subject: "Data Structures",
    total: 52,
    present: 46,
    absent: 6,
    percentage: 88,
  },
  {
    id: "h-4",
    date: "04 Oct 2026",
    className: "B.Tech CSE - A",
    subject: "Web Technologies",
    total: 46,
    present: 44,
    absent: 2,
    percentage: 96,
  },
  {
    id: "h-5",
    date: "03 Oct 2026",
    className: "B.Tech CSE - B",
    subject: "DBMS",
    total: 50,
    present: 45,
    absent: 5,
    percentage: 90,
  },
  {
    id: "h-6",
    date: "02 Oct 2026",
    className: "B.Tech CSE - A",
    subject: "Python Programming",
    total: 48,
    present: 43,
    absent: 5,
    percentage: 90,
  },
];

export default function TeacherAttendanceHistoryScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [selectedMonth, setSelectedMonth] = useState("October 2026");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExport = () => {
    setExportNotice("Attendance sheet exported as CSV successfully!");
    setTimeout(() => setExportNotice(null), 4000);
  };

  const dayBars = [
    { day: "Mon", rate: 94, count: "45/48" },
    { day: "Tue", rate: 89, count: "43/48" },
    { day: "Wed", rate: 95, count: "46/48" },
    { day: "Thu", rate: 88, count: "42/48" },
    { day: "Fri", rate: 92, count: "44/48" },
  ];

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/teacher/attendance")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Attendance History & Analytics</Text>
            <Text style={styles.pageSubtitle}>Class-wise performance and historical trends</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            <Text style={styles.exportBtnText}>Export Report</Text>
          </TouchableOpacity>
          <NotificationBellModal />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {exportNotice && (
          <View style={styles.noticeToast}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.noticeToastText}>{exportNotice}</Text>
          </View>
        )}

        {/* Overall Metric Cards */}
        <View style={styles.summaryGrid}>
          {/* Circular Donut Card */}
          <View style={[styles.card, styles.donutCard]}>
            <Text style={styles.cardHeaderTitle}>Overall Attendance</Text>
            <View style={styles.circleOuter}>
              <View style={styles.circleInner}>
                <Text style={styles.bigPercent}>92%</Text>
                <Text style={styles.subPercentLabel}>Average</Text>
              </View>
            </View>
            <Text style={styles.donutFooterNote}>Target attendance goal: 85%+</Text>
          </View>

          {/* Metrics breakdown */}
          <View style={styles.metricStack}>
            <View style={[styles.metricCard, { borderLeftColor: "#2563EB" }]}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="calendar" size={22} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.metricValue}>42</Text>
                <Text style={styles.metricLabel}>Total Sessions Conducted</Text>
              </View>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: "#10B981" }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.metricValue, { color: "#10B981" }]}>38.6</Text>
                <Text style={styles.metricLabel}>Average Present Per Class</Text>
              </View>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: "#EF4444" }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </View>
              <View>
                <Text style={[styles.metricValue, { color: "#EF4444" }]}>3.4</Text>
                <Text style={styles.metricLabel}>Average Absent Per Class</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Weekly Bar Chart Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Weekly Attendance Performance</Text>
          <Text style={styles.cardSubTitle}>Average attendance percentage by weekday</Text>

          <View style={styles.barChartContainer}>
            {dayBars.map((b) => (
              <View key={b.day} style={styles.barCol}>
                <Text style={styles.barValText}>{b.rate}%</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${b.rate}%` }]} />
                </View>
                <Text style={styles.barDayText}>{b.day}</Text>
                <Text style={styles.barCountText}>{b.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Historical Attendance Table */}
        <View style={styles.card}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Attendance Records</Text>
            <Text style={styles.recordCountText}>Showing 6 sessions</Text>
          </View>

          <View style={styles.recordsTable}>
            <View style={styles.thead}>
              <Text style={[styles.th, { width: 110 }]}>Date</Text>
              <Text style={[styles.th, { flex: 1 }]}>Class & Subject</Text>
              <Text style={[styles.th, { width: 70, textAlign: "center" }]}>Present</Text>
              <Text style={[styles.th, { width: 70, textAlign: "center" }]}>Absent</Text>
              <Text style={[styles.th, { width: 90, textAlign: "center" }]}>Turnout</Text>
            </View>

            {HISTORY_DATA.map((record, index) => (
              <View
                key={record.id}
                style={[
                  styles.trow,
                  index % 2 === 0 ? styles.trowEven : styles.trowOdd,
                ]}
              >
                <Text style={[styles.tdDate, { width: 110 }]}>{record.date}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tdSubject}>{record.subject}</Text>
                  <Text style={styles.tdClass}>{record.className}</Text>
                </View>
                <Text style={[styles.tdNum, { width: 70, textAlign: "center", color: "#10B981" }]}>
                  {record.present}
                </Text>
                <Text style={[styles.tdNum, { width: 70, textAlign: "center", color: "#EF4444" }]}>
                  {record.absent}
                </Text>
                <View style={[styles.tdPillWrap, { width: 90 }]}>
                  <View
                    style={[
                      styles.turnoutPill,
                      record.percentage >= 90
                        ? styles.turnoutPillHigh
                        : styles.turnoutPillMed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.turnoutPillText,
                        record.percentage >= 90
                          ? styles.turnoutPillTextHigh
                          : styles.turnoutPillTextMed,
                      ]}
                    >
                      {record.percentage}%
                    </Text>
                  </View>
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
  noticeToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  noticeToastText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#065F46",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  donutCard: {
    flex: 1,
    minWidth: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardSubTitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 16,
  },
  circleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  circleInner: {
    alignItems: "center",
  },
  bigPercent: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },
  subPercentLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  donutFooterNote: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
  },
  metricStack: {
    flex: 1.5,
    minWidth: 280,
    gap: 12,
    justifyContent: "center",
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  metricIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  barChartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 200,
    paddingTop: 20,
    paddingHorizontal: 10,
  },
  barCol: {
    alignItems: "center",
    width: 50,
  },
  barValText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 6,
  },
  barTrack: {
    width: 24,
    height: 120,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    width: "100%",
  },
  barDayText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginTop: 8,
  },
  barCountText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  tableHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recordCountText: {
    fontSize: 12,
    color: "#64748B",
  },
  recordsTable: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  thead: {
    flexDirection: "row",
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
  trowEven: {
    backgroundColor: "#FFFFFF",
  },
  trowOdd: {
    backgroundColor: "#FAFAFA",
  },
  tdDate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  tdSubject: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  tdClass: {
    fontSize: 11,
    color: "#64748B",
  },
  tdNum: {
    fontSize: 13,
    fontWeight: "700",
  },
  tdPillWrap: {
    alignItems: "center",
  },
  turnoutPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  turnoutPillHigh: {
    backgroundColor: "#ECFDF5",
  },
  turnoutPillMed: {
    backgroundColor: "#FEF3C7",
  },
  turnoutPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  turnoutPillTextHigh: {
    color: "#059669",
  },
  turnoutPillTextMed: {
    color: "#D97706",
  },
});
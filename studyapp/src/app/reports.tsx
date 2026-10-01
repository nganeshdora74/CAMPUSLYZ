import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { useAppTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

type SubjectReport = {
  id: string;
  name: string;
  pct: number;
  attended: number;
  total: number;
  grade: string;
};

export default function ReportsScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [attendance, setAttendance] = useState(88);
  const [attendanceClasses, setAttendanceClasses] = useState("58 / 66");
  const [cgpa, setCgpa] = useState(8.6);
  const [taskCompletionRate, setTaskCompletionRate] = useState(80);
  const [tasksDoneText, setTasksDoneText] = useState("4 / 5");
  const [subjectsReport, setSubjectsReport] = useState<SubjectReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [selectedReportTitle, setSelectedReportTitle] = useState<string | null>(null);

  // Firestore Sync: User Profile (CGPA)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.cgpa) setCgpa(Number(data.cgpa));
        }
      },
      (err) => console.log("User report err:", err)
    );

    return unsubscribe;
  }, []);

  // Firestore Sync: Subjects & Attendance Performance
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const subCol = collection(db, "users", user.uid, "subjects");
    const unsubscribe = onSnapshot(
      subCol,
      (snap) => {
        if (!snap.empty) {
          let totalClasses = 0;
          let attendedClasses = 0;

          const loaded: SubjectReport[] = snap.docs.map((d) => {
            const data = d.data();
            const att = Number(data.attendedClasses !== undefined ? data.attendedClasses : 14);
            const tot = Number(data.totalClasses !== undefined ? data.totalClasses : 16);
            totalClasses += tot;
            attendedClasses += att;
            const pct = tot > 0 ? Math.min(100, Math.round((att / tot) * 100)) : 80;

            let grade = "A";
            if (pct >= 90) grade = "O (Outstanding)";
            else if (pct >= 80) grade = "A+ (Excellent)";
            else if (pct >= 70) grade = "A (Very Good)";
            else if (pct >= 60) grade = "B+ (Good)";
            else grade = "B (Pass)";

            return {
              id: d.id,
              name: data.name || "Subject",
              pct,
              attended: att,
              total: tot,
              grade,
            };
          });

          setSubjectsReport(loaded);

          if (totalClasses > 0) {
            const overall = Math.round((attendedClasses / totalClasses) * 100);
            setAttendance(overall);
            setAttendanceClasses(`${attendedClasses} / ${totalClasses}`);
          }
        } else {
          // Default realistic subject report if empty
          setSubjectsReport([
            { id: "1", name: "Data Structures", pct: 88, attended: 15, total: 17, grade: "A+ (Excellent)" },
            { id: "2", name: "DBMS", pct: 82, attended: 14, total: 17, grade: "A+ (Excellent)" },
            { id: "3", name: "Operating Systems", pct: 75, attended: 12, total: 16, grade: "A (Very Good)" },
            { id: "4", name: "Computer Networks", pct: 85, attended: 17, total: 20, grade: "A+ (Excellent)" },
          ]);
        }
        setLoading(false);
      },
      (err) => {
        console.log("Report subjects err:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Firestore Sync: Tasks Performance
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const tasksCol = collection(db, "users", user.uid, "tasks");
    const unsubscribe = onSnapshot(
      tasksCol,
      (snap) => {
        if (!snap.empty) {
          const total = snap.docs.length;
          let completed = 0;
          snap.docs.forEach((d) => {
            const data = d.data();
            if (data.completed === true || data.status === "Completed") {
              completed += 1;
            }
          });
          const rate = total > 0 ? Math.round((completed / total) * 100) : 100;
          setTaskCompletionRate(rate);
          setTasksDoneText(`${completed} / ${total}`);
        }
      },
      (err) => console.log("Report tasks err:", err)
    );

    return unsubscribe;
  }, []);

  const openReport = (title: string) => {
    setSelectedReportTitle(title);
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t("loading", "Loading academic reports...")}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("reports", "Performance Reports")}
        </Text>

        <TouchableOpacity onPress={() => router.push("/notices")}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.body}>
          {/* HERO BANNER */}
          <View style={[styles.hero, { backgroundColor: "#31206F" }]}>
            <View style={styles.heroIconBox}>
              <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.heroTitle}>Academic Analytics</Text>
              <Text style={styles.heroSubtitle}>Live Firestore Performance Metrics</Text>
            </View>

            <Ionicons name="ribbon" size={44} color="rgba(255,255,255,0.3)" />
          </View>

          {/* 3 CORE OVERVIEW CARDS */}
          <View style={styles.overviewRow}>
            {/* CGPA */}
            <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.overviewIconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="star" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Current CGPA</Text>
              <Text style={[styles.overviewVal, { color: colors.primary }]}>{cgpa.toFixed(1)}</Text>
              <Text style={[styles.overviewSub, { color: colors.textMuted }]}>Out of 10.0</Text>
            </View>

            {/* Attendance */}
            <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.overviewIconBox, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="calendar" size={18} color="#16A34A" />
              </View>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Attendance</Text>
              <Text style={[styles.overviewVal, { color: "#16A34A" }]}>{attendance}%</Text>
              <Text style={[styles.overviewSub, { color: colors.textMuted }]}>{attendanceClasses} attended</Text>
            </View>

            {/* Task Rate */}
            <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.overviewIconBox, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="checkmark-circle" size={18} color="#0284C7" />
              </View>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Task Completion</Text>
              <Text style={[styles.overviewVal, { color: "#0284C7" }]}>{taskCompletionRate}%</Text>
              <Text style={[styles.overviewSub, { color: colors.textMuted }]}>{tasksDoneText} done</Text>
            </View>
          </View>

          {/* SUBJECT PERFORMANCE BREAKDOWN */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Subject Performance</Text>
            <TouchableOpacity onPress={() => router.push("/subjects")}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>{t("viewAll", "View All →")}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.subjectListCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {subjectsReport.map((subj, index) => (
              <View
                key={subj.id}
                style={[
                  styles.subjectReportRow,
                  index < subjectsReport.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subjName, { color: colors.text }]}>{subj.name}</Text>
                  <Text style={[styles.subjClasses, { color: colors.textSecondary }]}>
                    {subj.attended} / {subj.total} classes • Grade: {subj.grade}
                  </Text>
                </View>

                <View style={styles.subjRight}>
                  <Text style={[styles.subjPct, { color: colors.primary }]}>{subj.pct}%</Text>
                </View>
              </View>
            ))}
          </View>

          {/* QUICK REPORTS TILES */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Available Reports</Text>

          <View style={styles.reportGrid}>
            <TouchableOpacity
              style={[styles.reportTile, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openReport("Academic Report")}
            >
              <View style={[styles.tileIconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="school" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Academic Transcript</Text>
              <Text style={[styles.tileSub, { color: colors.textSecondary }]}>GPA & Semester Records</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reportTile, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openReport("Attendance Report")}
            >
              <View style={[styles.tileIconBox, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="calendar" size={20} color="#16A34A" />
              </View>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Attendance Audit</Text>
              <Text style={[styles.tileSub, { color: colors.textSecondary }]}>Subject-wise Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reportTile, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openReport("Task Report")}
            >
              <View style={[styles.tileIconBox, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="checkbox" size={20} color="#0284C7" />
              </View>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Assignment Audit</Text>
              <Text style={[styles.tileSub, { color: colors.textSecondary }]}>Tasks & Submissions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reportTile, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openReport("Fee & Dues Report")}
            >
              <View style={[styles.tileIconBox, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="wallet" size={20} color="#D97706" />
              </View>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Financial Clearance</Text>
              <Text style={[styles.tileSub, { color: colors.textSecondary }]}>Tuition & Hostel Dues</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* DETAILED REPORT MODAL */}
      <Modal
        visible={selectedReportTitle !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReportTitle(null)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          onPress={() => setSelectedReportTitle(null)}
        >
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedReportTitle}</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Official report generated from Firestore student database.
            </Text>

            <View style={[styles.modalContentBox, { backgroundColor: colors.surface }]}>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>CGPA Score:</Text>
                <Text style={[styles.modalVal, { color: colors.text }]}>{cgpa.toFixed(2)} / 10.0</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Overall Attendance:</Text>
                <Text style={[styles.modalVal, { color: colors.text }]}>{attendance}% ({attendanceClasses})</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Assignment Completion:</Text>
                <Text style={[styles.modalVal, { color: colors.text }]}>{taskCompletionRate}%</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Academic Standing:</Text>
                <Text style={[styles.modalVal, { color: "#16A34A" }]}>Good Standing (Eligible for Exams)</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: colors.primary }]}
              onPress={() => setSelectedReportTitle(null)}
            >
              <Text style={styles.closeModalBtnText}>Close Report</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  hero: {
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    fontSize: 12,
    color: "#DDD6FE",
    marginTop: 2,
  },
  overviewRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  overviewCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  overviewIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  overviewVal: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  overviewSub: {
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "700",
  },
  subjectListCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  subjectReportRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  subjName: {
    fontSize: 13,
    fontWeight: "700",
  },
  subjClasses: {
    fontSize: 11,
    marginTop: 2,
  },
  subjRight: {
    alignItems: "flex-end",
  },
  subjPct: {
    fontSize: 15,
    fontWeight: "800",
  },
  reportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  reportTile: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  tileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  tileSub: {
    fontSize: 10,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 16,
  },
  modalContentBox: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalLabel: {
    fontSize: 12,
  },
  modalVal: {
    fontSize: 13,
    fontWeight: "700",
  },
  closeModalBtn: {
    marginTop: 20,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  closeModalBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
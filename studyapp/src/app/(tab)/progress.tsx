import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
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
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

type SubjectProgress = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  progressPercent: number;
  attended: number;
  total: number;
};

const DEFAULT_SUBJECTS: SubjectProgress[] = [
  {
    id: "ds",
    name: "Data Structures",
    icon: "code-slash",
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
    progressPercent: 85,
    attended: 17,
    total: 20,
  },
  {
    id: "dbms",
    name: "DBMS",
    icon: "server",
    iconBg: "#E0F2FE",
    iconColor: "#0284C7",
    progressPercent: 78,
    attended: 14,
    total: 18,
  },
  {
    id: "os",
    name: "Operating Systems",
    icon: "settings",
    iconBg: "#DCFCE7",
    iconColor: "#16A34A",
    progressPercent: 70,
    attended: 14,
    total: 20,
  },
  {
    id: "cn",
    name: "Computer Networks",
    icon: "git-network",
    iconBg: "#FFEDD5",
    iconColor: "#EA580C",
    progressPercent: 65,
    attended: 13,
    total: 20,
  },
];

export default function ProgressScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [userName, setUserName] = useState("Student");
  const [userInitial, setUserInitial] = useState("S");
  const [attendancePercentage, setAttendancePercentage] = useState("88%");
  const [attendanceSubtext, setAttendanceSubtext] = useState("58 / 66 classes");
  const [studyHours, setStudyHours] = useState("28.5h");
  const [completedAssignments, setCompletedAssignments] = useState("4/6");
  const [cgpa, setCgpa] = useState("8.5");
  const [classesAttendedCount, setClassesAttendedCount] = useState(5);
  const [assignmentsDoneCount, setAssignmentsDoneCount] = useState(4);
  const [testsTakenCount, setTestsTakenCount] = useState(2);
  const [subjectList, setSubjectList] = useState<SubjectProgress[]>(DEFAULT_SUBJECTS);

  // Dynamic Weekly bars
  const [weekBars, setWeekBars] = useState([
    { day: "Mon", hours: 3.5, heightPercent: 44 },
    { day: "Tue", hours: 4.5, heightPercent: 56 },
    { day: "Wed", hours: 5.2, heightPercent: 65 },
    { day: "Thu", hours: 4.0, heightPercent: 50 },
    { day: "Fri", hours: 6.0, heightPercent: 75 },
    { day: "Sat", hours: 4.8, heightPercent: 60 },
    { day: "Sun", hours: 5.5, heightPercent: 68 },
  ]);

  // Load user data from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const rawName = data.fullName || data.name || user.displayName || "Student";
        setUserName(rawName);
        setUserInitial(rawName.trim().charAt(0).toUpperCase() || "S");
        if (data.cgpa) setCgpa(String(data.cgpa));
      },
      (err) => console.log("Progress user err:", err.message)
    );

    return unsubscribe;
  }, []);

  // Real-time Firestore performance calculation: Subjects & Attendance
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const subRef = collection(db, "users", user.uid, "subjects");
    const unsubscribe = onSnapshot(
      subRef,
      (snap) => {
        if (snap.empty) {
          setSubjectList(DEFAULT_SUBJECTS);
          return;
        }

        let totalClasses = 0;
        let attendedClasses = 0;

        const defaultColors = [
          { bg: "#EDE9FE", color: "#7C3AED", icon: "code-slash" as const },
          { bg: "#E0F2FE", color: "#0284C7", icon: "server" as const },
          { bg: "#DCFCE7", color: "#16A34A", icon: "settings" as const },
          { bg: "#FFEDD5", color: "#EA580C", icon: "git-network" as const },
          { bg: "#CFFAFE", color: "#0891B2", icon: "flask" as const },
        ];

        const loaded: SubjectProgress[] = snap.docs.map((d, index) => {
          const data = d.data();
          const att = Number(data.attendedClasses !== undefined ? data.attendedClasses : 14);
          const tot = Number(data.totalClasses !== undefined ? data.totalClasses : 16);
          totalClasses += tot;
          attendedClasses += att;
          const pct = tot > 0 ? Math.min(100, Math.round((att / tot) * 100)) : 80;
          const colorPair = defaultColors[index % defaultColors.length];

          return {
            id: d.id,
            name: data.name || "Subject",
            icon: colorPair.icon,
            iconBg: colorPair.bg,
            iconColor: colorPair.color,
            progressPercent: pct,
            attended: att,
            total: tot,
          };
        });

        if (loaded.length > 0) {
          setSubjectList(loaded);
        }

        if (totalClasses > 0) {
          const overallPct = Math.round((attendedClasses / totalClasses) * 100);
          setAttendancePercentage(`${overallPct}%`);
          setAttendanceSubtext(`${attendedClasses} / ${totalClasses} classes`);
        }
      },
      (err) => console.log("Progress subjects err:", err.message)
    );

    return unsubscribe;
  }, []);

  // Real-time Firestore performance calculation: Tasks
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const tasksRef = collection(db, "users", user.uid, "tasks");
    const unsubscribe = onSnapshot(
      tasksRef,
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
          setCompletedAssignments(`${completed}/${total}`);
          setAssignmentsDoneCount(completed);
        }
      },
      (err) => console.log("Progress tasks err:", err.message)
    );

    return unsubscribe;
  }, []);

  // Real-time Firestore performance calculation: Schedule / Classes attended
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const schedRef = collection(db, "users", user.uid, "schedule");
    const unsubscribe = onSnapshot(
      schedRef,
      (snap) => {
        if (!snap.empty) {
          let countCompleted = 0;
          snap.docs.forEach((d) => {
            const data = d.data();
            if (data.status === "Completed") {
              countCompleted += 1;
            }
          });
          setClassesAttendedCount(Math.max(1, countCompleted));
        }
      },
      (err) => console.log("Progress sched err:", err.message)
    );

    return unsubscribe;
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ================================================== */}
      {/* TOP HEADER */}
      {/* ================================================== */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerBrandCol}>
          <View style={styles.logoRow}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="school" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>Campusly</Text>
          </View>
          <Text style={[styles.brandTagline, { color: colors.textSecondary }]}>Learn. Connect. Grow.</Text>
        </View>

        <TouchableOpacity
          style={[styles.profileButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => router.push("/(tab)/profile")}
        >
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarLetter}>{userInitial}</Text>
          </View>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================================================== */}
        {/* HERO BANNER: YOUR PROGRESS */}
        {/* ================================================== */}
        <View style={styles.heroBanner}>
          <View style={styles.heroLeftCol}>
            <Text style={styles.heroTag}>{t("yourProgress", "YOUR PROGRESS 📊")}</Text>
            <Text style={styles.heroTitle}>{t("progress", "Progress")}</Text>
            <Text style={styles.heroSubtitle}>
              {t("academicJourney", "Small steps every day lead to big results!")}
            </Text>
          </View>

          {/* Right illustration */}
          <View style={styles.heroIllustration}>
            <View style={styles.chartGraphic}>
              <View style={[styles.graphicBar, { height: 26, backgroundColor: "#DDD6FE" }]} />
              <View style={[styles.graphicBar, { height: 42, backgroundColor: "#C4B5FD" }]} />
              <View style={[styles.graphicBar, { height: 60, backgroundColor: "#A78BFA" }]} />
            </View>
            <View style={styles.arrowGraphic}>
              <Ionicons name="trending-up" size={32} color="#FDE047" />
            </View>
            <View style={styles.floatingCap}>
              <Ionicons name="school" size={30} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* ================================================== */}
        {/* WEEKLY STUDY TIME CHART */}
        {/* ================================================== */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("weeklyStudyTime", "Weekly Study Time")}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={[styles.cardLink, { color: colors.primary }]}>This Week →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chartContainer}>
            {/* Y-Axis Labels */}
            <View style={styles.yAxisCol}>
              <Text style={[styles.yAxisText, { color: colors.textSecondary }]}>8h</Text>
              <Text style={[styles.yAxisText, { color: colors.textSecondary }]}>6h</Text>
              <Text style={[styles.yAxisText, { color: colors.textSecondary }]}>4h</Text>
              <Text style={[styles.yAxisText, { color: colors.textSecondary }]}>2h</Text>
              <Text style={[styles.yAxisText, { color: colors.textSecondary }]}>0h</Text>
            </View>

            {/* Bars */}
            <View style={styles.barsRow}>
              {weekBars.map((b) => (
                <View key={b.day} style={styles.barItemCol}>
                  <Text style={[styles.barValText, { color: colors.textSecondary }]}>{b.hours}h</Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.surface }]}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${b.heightPercent}%`, backgroundColor: colors.primary },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabelText, { color: colors.textSecondary }]}>{b.day}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ================================================== */}
        {/* 4 STATS ROW (Attendance, Study Hours, Assignments, CGPA) */}
        {/* ================================================== */}
        <View style={styles.statsRow}>
          {/* 1. Attendance */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => router.push("/attendance")}
          >
            <View style={[styles.statIconBox, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="calendar" size={15} color="#16A34A" />
            </View>
            <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
              {t("attendance", "Attendance")}
            </Text>
            <Text style={[styles.statValue, { color: "#16A34A" }]}>{attendancePercentage}</Text>
            <Text style={[styles.statSub, { color: colors.textMuted }]}>{attendanceSubtext}</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          {/* 2. Study Hours */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => router.push("/study")}
          >
            <View style={[styles.statIconBox, { backgroundColor: "#E0F2FE" }]}>
              <Ionicons name="time" size={15} color="#0284C7" />
            </View>
            <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
              {t("studyHours", "Study Hours")}
            </Text>
            <Text style={[styles.statValue, { color: "#0284C7" }]}>{studyHours}</Text>
            <Text style={[styles.statSub, { color: colors.textMuted }]}>of 40h target</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          {/* 3. Assignments */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => router.push("/(tab)/tasks")}
          >
            <View style={[styles.statIconBox, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="document-text" size={15} color="#EF4444" />
            </View>
            <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
              {t("assignments", "Assignments")}
            </Text>
            <Text style={[styles.statValue, { color: "#EF4444" }]}>{completedAssignments}</Text>
            <Text style={[styles.statSub, { color: colors.textMuted }]}>completed</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          {/* 4. CGPA */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => router.push("/cgpa-calculator")}
          >
            <View style={[styles.statIconBox, { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name="star" size={15} color="#6366F1" />
            </View>
            <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
              {t("cgpa", "CGPA")}
            </Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{cgpa}</Text>
            <Text style={[styles.statSub, { color: colors.textMuted }]}>/ 10</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>
        </View>

        {/* ================================================== */}
        {/* SUBJECT-WISE PROGRESS */}
        {/* ================================================== */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="book-outline" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("subjectWiseProgress", "Subject-wise Progress")}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/subjects")}>
              <Text style={[styles.cardLink, { color: colors.primary }]}>
                {t("viewAll", "View All →")}
              </Text>
            </TouchableOpacity>
          </View>

          {subjectList.map((subj) => (
            <View key={subj.id} style={styles.subjectRow}>
              <View style={[styles.subjectIconCircle, { backgroundColor: subj.iconBg }]}>
                <Ionicons name={subj.icon} size={16} color={subj.iconColor} />
              </View>

              <View style={styles.subjectCenterCol}>
                <Text style={[styles.subjectName, { color: colors.text }]}>{subj.name}</Text>
                <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${subj.progressPercent}%`,
                        backgroundColor: subj.iconColor,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.subjectRightCol}>
                <Text style={[styles.subjectPercent, { color: subj.iconColor }]}>
                  {subj.progressPercent}%
                </Text>
                <Text style={[styles.subjectFraction, { color: colors.textSecondary }]}>
                  {subj.attended} / {subj.total}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ================================================== */}
        {/* THIS WEEK ACTIVITY SUMMARY */}
        {/* ================================================== */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryHeaderRow}>
            <View style={[styles.summaryIconBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="compass" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.summaryMainTitle, { color: colors.text }]}>
                {t("thisWeekActivity", "This Week Activity Summary")}
              </Text>
              <Text style={[styles.summarySubTitle, { color: colors.textSecondary }]}>
                Real-time performance tracking
              </Text>
            </View>
          </View>

          <View style={styles.summaryBoxesRow}>
            <View style={[styles.summaryBox, { backgroundColor: isDark ? "#1E1B4B" : "#F5F3FF" }]}>
              <Text style={[styles.summaryBoxNum, { color: "#6366F1" }]}>{classesAttendedCount}</Text>
              <Text style={[styles.summaryBoxLabel, { color: colors.textSecondary }]}>
                {t("classesAttended", "Classes\nAttended")}
              </Text>
            </View>

            <View style={[styles.summaryBox, { backgroundColor: isDark ? "#172554" : "#EFF6FF" }]}>
              <Text style={[styles.summaryBoxNum, { color: "#3B82F6" }]}>{assignmentsDoneCount}</Text>
              <Text style={[styles.summaryBoxLabel, { color: colors.textSecondary }]}>
                {t("assignments", "Assignments\nDone")}
              </Text>
            </View>

            <View style={[styles.summaryBox, { backgroundColor: isDark ? "#1E1B4B" : "#EEF2FF" }]}>
              <Text style={[styles.summaryBoxNum, { color: "#4F46E5" }]}>{testsTakenCount}</Text>
              <Text style={[styles.summaryBoxLabel, { color: colors.textSecondary }]}>
                {t("testsTaken", "Tests\nTaken")}
              </Text>
            </View>

            <View style={[styles.summaryBox, { backgroundColor: isDark ? "#2E1065" : "#FAF5FF" }]}>
              <Text style={[styles.summaryBoxNum, { color: "#9333EA" }]}>4.5h</Text>
              <Text style={[styles.summaryBoxLabel, { color: colors.textSecondary }]}>
                Extra{"\n"}Study
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBrandCol: {
    flexDirection: "column",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 11,
    marginTop: 2,
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* HERO BANNER */
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: "#3B1B82",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  heroLeftCol: {
    flex: 1,
  },
  heroTag: {
    color: "#A78BFA",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "#DDD6FE",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  heroIllustration: {
    width: 90,
    height: 80,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  chartGraphic: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  graphicBar: {
    width: 14,
    borderRadius: 4,
  },
  arrowGraphic: {
    position: "absolute",
    top: -2,
    right: 6,
  },
  floatingCap: {
    position: "absolute",
    top: 4,
    left: 4,
    opacity: 0.4,
  },

  /* CARD */
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardLink: {
    fontSize: 12,
    fontWeight: "700",
  },

  /* WEEKLY STUDY TIME CHART */
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 140,
    paddingTop: 10,
  },
  yAxisCol: {
    justifyContent: "space-between",
    height: 100,
    paddingRight: 10,
    paddingBottom: 20,
  },
  yAxisText: {
    fontSize: 10,
  },
  barsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 130,
  },
  barItemCol: {
    alignItems: "center",
    flex: 1,
  },
  barValText: {
    fontSize: 9,
    marginBottom: 4,
    fontWeight: "500",
  },
  barTrack: {
    width: 16,
    height: 90,
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 6,
  },
  dayLabelText: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: "600",
  },

  /* 4 STATS ROW */
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 8,
  },
  statCard: {
    width: (Dimensions.get("window").width - 40) / 2,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    position: "relative",
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  statSub: {
    fontSize: 10,
    marginTop: 2,
  },
  statChevron: {
    position: "absolute",
    top: 14,
    right: 12,
  },

  /* SUBJECT-WISE PROGRESS */
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  subjectIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  subjectCenterCol: {
    flex: 1,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  subjectRightCol: {
    marginLeft: 14,
    alignItems: "flex-end",
  },
  subjectPercent: {
    fontSize: 13,
    fontWeight: "800",
  },
  subjectFraction: {
    fontSize: 10,
    marginTop: 2,
  },

  /* ACTIVITY SUMMARY */
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  summaryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  summaryMainTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  summarySubTitle: {
    fontSize: 11,
    marginTop: 1,
  },
  summaryBoxesRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  summaryBoxNum: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  summaryBoxLabel: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
    fontWeight: "600",
  },
});
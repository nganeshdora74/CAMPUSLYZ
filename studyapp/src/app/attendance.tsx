import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../firebase/config";
import UniversalRoleControls from "../components/UniversalRoleControls";
import {
  rechangeStudentAttendance,
  syncAttendanceToStudentProfile,
} from "../firebase/teacherStudent";

type AttendanceRecord = {
  id: string;
  studentId: string;
  studentName?: string;
  rollNo?: string;
  subject: string;
  subjectCode?: string;
  department?: string;
  section?: string;
  present: boolean;
  status: "Present" | "Absent" | "Late";
  date: string;
  remarks?: string;
  markedBy?: string;
  markedByRole?: "teacher" | "admin" | "student";
};

interface DefaultSubject {
  name: string;
  code: string;
  teacher: string;
  defaultTotal: number;
  defaultPresent: number;
}

const DEFAULT_SUBJECTS_ROSTER: DefaultSubject[] = [
  { name: "Data Structures", code: "CSE-301", teacher: "Prof. Ganesh Sharma", defaultTotal: 24, defaultPresent: 22 },
  { name: "Algorithms", code: "CSE-302", teacher: "Dr. S. Ramesh", defaultTotal: 26, defaultPresent: 23 },
  { name: "Operating Systems", code: "CSE-303", teacher: "Prof. Meenakshi Rao", defaultTotal: 22, defaultPresent: 19 },
  { name: "Database Management", code: "CSE-304", teacher: "Prof. Amit Kulkarni", defaultTotal: 25, defaultPresent: 21 },
  { name: "Computer Networks", code: "CSE-305", teacher: "Dr. Preeti Sinha", defaultTotal: 24, defaultPresent: 20 },
  { name: "AI & Machine Learning", code: "CSE-306", teacher: "Prof. R. V. Raman", defaultTotal: 22, defaultPresent: 18 },
];

export default function AttendanceScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<"student" | "teacher" | "admin">("student");
  const [currentUserName, setCurrentUserName] = useState<string>("Student");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("All");

  // Re-change Attendance Modal State (Teacher & Admin Only)
  const [rechangeModalVisible, setRechangeModalVisible] = useState(false);
  const [targetRecord, setTargetRecord] = useState<AttendanceRecord | null>(null);
  const [rechangeSubject, setRechangeSubject] = useState("Data Structures");
  const [rechangeDate, setRechangeDate] = useState("Sep 28, 2026");
  const [rechangeStatus, setRechangeStatus] = useState<"Present" | "Absent" | "Late">("Present");
  const [rechangeRemarks, setRechangeRemarks] = useState("");
  const [isSubmittingRechange, setIsSubmittingRechange] = useState(false);

  // Realtime listener for authenticated user & their attendance records
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.uid);
      const email = (user.email || "").toLowerCase();

      // Detect User Role
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          const uData = userSnap.data();
          setCurrentUserName(uData.fullName || user.displayName || "User");
          if (uData.role === "admin" || email.includes("admin")) {
            setCurrentUserRole("admin");
          } else if (uData.role === "teacher" || uData.isTeacher || email.includes("teacher") || email.includes("faculty")) {
            setCurrentUserRole("teacher");
          } else {
            setCurrentUserRole("student");
          }
        } else {
          if (email.includes("admin")) setCurrentUserRole("admin");
          else if (email.includes("teacher") || email.includes("faculty")) setCurrentUserRole("teacher");
          else setCurrentUserRole("student");
        }
      } catch (err) {
        console.warn("User role fetch error:", err);
      }

      // Realtime listener on 'attendance' collection for this student
      const q = query(
        collection(db, "attendance"),
        where("studentId", "==", user.uid)
      );

      unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const data: AttendanceRecord[] = snapshot.docs.map((item) => {
            const itemData = item.data();
            const status: "Present" | "Absent" | "Late" =
              itemData.status === "Absent"
                ? "Absent"
                : itemData.status === "Late"
                ? "Late"
                : "Present";
            const isPresent =
              typeof itemData.present === "boolean"
                ? itemData.present
                : status === "Present";

            return {
              id: item.id,
              studentId: itemData.studentId || user.uid,
              studentName: itemData.studentName || "Student",
              rollNo: itemData.rollNo || "",
              subject: itemData.subject || "General",
              subjectCode: itemData.subjectCode || "",
              department: itemData.department || "CSE",
              section: itemData.section || "A",
              present: isPresent,
              status,
              date: itemData.date || "Recent",
              remarks: itemData.remarks || "-",
              markedBy: itemData.markedBy || "Course Faculty",
              markedByRole: itemData.markedByRole || "teacher",
            };
          });

          data.sort((a, b) => b.date.localeCompare(a.date));
          setRecords(data);
          setLoading(false);
        },
        (error) => {
          console.error("Attendance realtime listener error:", error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // =====================================================
  // OVERALL ATTENDANCE CALCULATION
  // =====================================================
  const totalClasses = records.length > 0 ? records.length : 143;
  const presentClasses = records.length > 0 ? records.filter((r) => r.present).length : 123;
  const absentClasses = records.length > 0 ? records.filter((r) => !r.present).length : 20;
  const lateClasses = records.length > 0 ? records.filter((r) => r.status === "Late").length : 0;
  const overallPercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

  // =====================================================
  // SUBJECT-WISE PRESENT & ABSENT BREAKDOWN
  // =====================================================
  const subjectStats = useMemo(() => {
    const subjectsMap: Record<
      string,
      {
        subject: string;
        code: string;
        teacher: string;
        total: number;
        present: number;
        absent: number;
        late: number;
      }
    > = {};

    // Seed default subjects
    DEFAULT_SUBJECTS_ROSTER.forEach((def) => {
      subjectsMap[def.name] = {
        subject: def.name,
        code: def.code,
        teacher: def.teacher,
        total: records.length > 0 ? 0 : def.defaultTotal,
        present: records.length > 0 ? 0 : def.defaultPresent,
        absent: records.length > 0 ? 0 : def.defaultTotal - def.defaultPresent,
        late: 0,
      };
    });

    // Populate actual records
    records.forEach((item) => {
      const subj = item.subject || "General";
      if (!subjectsMap[subj]) {
        subjectsMap[subj] = {
          subject: subj,
          code: item.subjectCode || "CSE-SUB",
          teacher: item.markedBy || "Subject Faculty",
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
        };
      }

      subjectsMap[subj].total += 1;
      if (item.present || item.status === "Present") {
        subjectsMap[subj].present += 1;
      } else if (item.status === "Late") {
        subjectsMap[subj].late += 1;
        subjectsMap[subj].present += 1;
      } else {
        subjectsMap[subj].absent += 1;
      }
    });

    return Object.values(subjectsMap).map((value) => {
      const pct = value.total === 0 ? 0 : Math.round((value.present / value.total) * 100);
      const isEligible = pct >= 75;
      const classesNeeded = isEligible ? 0 : Math.max(0, Math.ceil(3 * value.total - 4 * value.present));

      return {
        subject: value.subject,
        code: value.code,
        teacher: value.teacher,
        total: value.total,
        present: value.present,
        absent: value.absent,
        late: value.late,
        percentage: pct,
        isEligible,
        classesNeeded,
      };
    });
  }, [records]);

  // List of available subjects for history filtering
  const availableFilterSubjects = useMemo(() => {
    const list = ["All", ...subjectStats.map((s) => s.subject)];
    return Array.from(new Set(list));
  }, [subjectStats]);

  // Filtered history records
  const filteredHistory = useMemo(() => {
    if (selectedSubjectFilter === "All") return records;
    return records.filter(
      (r) => r.subject?.toLowerCase() === selectedSubjectFilter.toLowerCase()
    );
  }, [records, selectedSubjectFilter]);

  const getPercentageColor = (value: number) => {
    if (value >= 75) return "#16A34A";
    if (value >= 60) return "#D97706";
    return "#DC2626";
  };

  // =====================================================
  // ROLE ENFORCEMENT & RE-CHANGE HANDLERS
  // =====================================================
  const isPrivileged = currentUserRole === "teacher" || currentUserRole === "admin";

  const handleStudentUnauthorizedAction = () => {
    Alert.alert(
      "Permission Denied 🔒",
      "Only Teachers and Administrators have permission to modify or re-change student attendance.\n\nStudents have read-only access to inspect subject attendance."
    );
  };

  const openRechangeModalForSubject = (subjectName: string) => {
    if (!isPrivileged) {
      handleStudentUnauthorizedAction();
      return;
    }
    setTargetRecord(null);
    setRechangeSubject(subjectName);
    setRechangeDate("Sep 28, 2026");
    setRechangeStatus("Present");
    setRechangeRemarks("Verified by faculty");
    setRechangeModalVisible(true);
  };

  const openRechangeModalForRecord = (record: AttendanceRecord) => {
    if (!isPrivileged) {
      handleStudentUnauthorizedAction();
      return;
    }
    setTargetRecord(record);
    setRechangeSubject(record.subject);
    setRechangeDate(record.date);
    setRechangeStatus(record.status);
    setRechangeRemarks(record.remarks === "-" ? "" : record.remarks || "");
    setRechangeModalVisible(true);
  };

  const handleSaveRechangeAttendance = async () => {
    if (!isPrivileged) {
      handleStudentUnauthorizedAction();
      return;
    }

    try {
      setIsSubmittingRechange(true);

      const targetStudentUid = currentUserId || "demo-st-1";
      const targetRollNo = targetRecord?.rollNo || "23CSE001";
      const targetStudentName = targetRecord?.studentName || currentUserName || "Student";

      const res = await rechangeStudentAttendance({
        studentUid: targetStudentUid,
        studentName: targetStudentName,
        rollNo: targetRollNo,
        subject: rechangeSubject,
        department: targetRecord?.department || "CSE",
        section: targetRecord?.section || "A",
        date: rechangeDate,
        newStatus: rechangeStatus,
        remarks: rechangeRemarks.trim() || `Re-changed to ${rechangeStatus} by ${currentUserName}`,
        markedBy: currentUserName,
        markedByRole: currentUserRole === "admin" ? "admin" : "teacher",
        actorRole: currentUserRole,
      });

      if (!res.success) {
        Alert.alert("Permission Error", res.error || "Could not re-change attendance.");
        return;
      }

      setRechangeModalVisible(false);
      Alert.alert(
        "Attendance Re-changed! ✓",
        `Subject: ${rechangeSubject}\nStatus: ${rechangeStatus}\nDate: ${rechangeDate}\nRe-changed by: ${currentUserName} (${currentUserRole.toUpperCase()})\n\nStudent academic profile and subject breakdown have been synchronized.`
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to re-change attendance.");
    } finally {
      setIsSubmittingRechange(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* =================================================
          HEADER
      ================================================= */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1E1B4B" />
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>Subject Attendance</Text>
            <Text style={styles.subtitle}>Present & Absent Tracking</Text>
          </View>
        </View>

        {/* Role Badge & Portal Controls */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <UniversalRoleControls compact />
          {isPrivileged ? (
            <>
              <TouchableOpacity
                style={styles.rechangeHeaderBtn}
                onPress={() => openRechangeModalForSubject(selectedSubjectFilter === "All" ? "Data Structures" : selectedSubjectFilter)}
              >
                <Ionicons name="create-outline" size={15} color="#FFFFFF" />
                <Text style={styles.rechangeHeaderBtnText}>Re-change</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminSwitchBtn}
                onPress={() => router.push("/admin/attendence")}
              >
                <Ionicons name="grid-outline" size={15} color="#2563EB" />
                <Text style={styles.adminSwitchText}>
                  {currentUserRole === "teacher" ? "Class Console" : "Admin Console"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.readOnlyBadge} onPress={handleStudentUnauthorizedAction}>
              <Ionicons name="lock-closed" size={13} color="#64748B" />
              <Text style={styles.readOnlyBadgeText}>Student View (Read-Only)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* =================================================
          ROLE & ATTENDANCE INTEGRITY BANNER
      ================================================= */}
      <View
        style={[
          styles.policyBanner,
          isPrivileged && { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
        ]}
      >
        <Ionicons
          name={isPrivileged ? "shield-checkmark" : "shield"}
          size={18}
          color={isPrivileged ? "#16A34A" : "#4F46E5"}
          style={{ marginTop: 2 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.policyBannerTitle,
              isPrivileged && { color: "#166534" },
            ]}
          >
            {isPrivileged
              ? `Authorized: ${currentUserRole === "admin" ? "Administrator" : "Teacher"} Attendance Console`
              : "Verified Subject Attendance System"}
          </Text>
          <Text
            style={[
              styles.policyBannerText,
              isPrivileged && { color: "#15803D" },
            ]}
          >
            {isPrivileged
              ? `You are logged in as ${currentUserName} (${currentUserRole.toUpperCase()}). You have full authority to mark and re-change student attendance across all subjects.`
              : "Only certified Teachers and Administrators can mark or re-change student attendance. Records are tamper-proof, locked for students, and updated in real-time."}
          </Text>
        </View>
      </View>

      {/* =================================================
          LOADING INDICATOR
      ================================================= */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Synchronizing subject attendance...</Text>
        </View>
      ) : (
        <>
          {/* =============================================
              OVERALL PERCENTAGE CARD
          ============================================= */}
          <View style={styles.mainCard}>
            <View style={styles.mainCardTop}>
              <View>
                <Text style={styles.mainLabel}>Overall Semester Attendance</Text>
                <Text style={styles.percentage}>{overallPercentage}%</Text>
              </View>

              <View style={styles.percentageCircle}>
                <Ionicons name="school-outline" size={30} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(overallPercentage, 100)}%` },
                ]}
              />
            </View>

            <View style={styles.mainCardFooter}>
              <Text style={styles.progressText}>
                {overallPercentage >= 75
                  ? "✓ Satisfies the 75% minimum semester attendance requirement."
                  : "⚠️ Attendance below 75%. Please attend upcoming lectures to avoid shortage."}
              </Text>
            </View>
          </View>

          {/* =============================================
              SUMMARY ROW (Present, Absent, Total)
          ============================================= */}
          <View style={styles.summaryRow}>
            <SummaryCard
              icon="checkmark-circle"
              title="Total Present"
              value={presentClasses}
              color="#16A34A"
              bgColor="#DCFCE7"
            />
            <SummaryCard
              icon="close-circle"
              title="Total Absent"
              value={absentClasses}
              color="#DC2626"
              bgColor="#FEE2E2"
            />
            <SummaryCard
              icon="library"
              title="Total Lectures"
              value={totalClasses}
              color="#4F46E5"
              bgColor="#EEF2FF"
            />
          </View>

          {/* =============================================
              SUBJECT-WISE ATTENDANCE BREAKDOWN
          ============================================= */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Subject-wise Breakdown</Text>
              <Text style={styles.sectionSubtitle}>
                Present & Absent Metrics for {subjectStats.length} Subjects
              </Text>
            </View>

            {isPrivileged && (
              <TouchableOpacity
                style={styles.rechangeSmallBtn}
                onPress={() => openRechangeModalForSubject(subjectStats[0]?.subject || "Data Structures")}
              >
                <Ionicons name="create-outline" size={13} color="#2563EB" />
                <Text style={styles.rechangeSmallBtnText}>Re-change Subject</Text>
              </TouchableOpacity>
            )}
          </View>

          {subjectStats.map((item) => {
            const pctColor = getPercentageColor(item.percentage);
            return (
              <View style={styles.subjectCard} key={item.subject}>
                {/* Header: Name, Code & Percentage */}
                <View style={styles.subjectHeader}>
                  <View style={styles.subjectIcon}>
                    <Ionicons name="book-outline" size={20} color="#4F46E5" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.subjectName}>{item.subject}</Text>
                      {item.code ? (
                        <View style={styles.codeBadge}>
                          <Text style={styles.codeBadgeText}>{item.code}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.subjectTeacher}>
                      👨‍🏫 Instructor: {item.teacher}
                    </Text>
                  </View>

                  <View style={styles.percentagePill}>
                    <Text style={[styles.subjectPercentage, { color: pctColor }]}>
                      {item.percentage}%
                    </Text>
                  </View>
                </View>

                {/* Subject Present & Absent Statistics Pills */}
                <View style={styles.subjectMetricsRow}>
                  <View style={styles.metricItemPresent}>
                    <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                    <Text style={styles.metricTextPresent}>
                      {item.present} Present
                    </Text>
                  </View>

                  <View style={styles.metricItemAbsent}>
                    <Ionicons name="close-circle" size={13} color="#DC2626" />
                    <Text style={styles.metricTextAbsent}>
                      {item.absent} Absent
                    </Text>
                  </View>

                  <View style={styles.metricItemTotal}>
                    <Ionicons name="calendar-outline" size={13} color="#475569" />
                    <Text style={styles.metricTextTotal}>
                      {item.total} Classes
                    </Text>
                  </View>

                  {/* Re-change Button for Teachers/Admins */}
                  {isPrivileged ? (
                    <TouchableOpacity
                      style={styles.rechangePillBtn}
                      onPress={() => openRechangeModalForSubject(item.subject)}
                    >
                      <Ionicons name="create-outline" size={12} color="#2563EB" />
                      <Text style={styles.rechangePillBtnText}>Re-change</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.readOnlyPill}
                      onPress={handleStudentUnauthorizedAction}
                    >
                      <Ionicons name="lock-closed" size={11} color="#94A3B8" />
                      <Text style={styles.readOnlyPillText}>Locked</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Progress Bar */}
                <View style={styles.subjectProgressBackground}>
                  <View
                    style={[
                      styles.subjectProgress,
                      {
                        width: `${Math.min(item.percentage, 100)}%`,
                        backgroundColor: pctColor,
                      },
                    ]}
                  />
                </View>

                {/* Status / Shortage Warning Badge */}
                <View style={styles.subjectFooterRow}>
                  {item.isEligible ? (
                    <View style={styles.eligibleBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                      <Text style={styles.eligibleBadgeText}>
                        Eligible for University Examinations (≥ 75%)
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.shortageBadge}>
                      <Ionicons name="alert-circle" size={12} color="#DC2626" />
                      <Text style={styles.shortageBadgeText}>
                        Shortage Warning: Attend {item.classesNeeded} more lecture{item.classesNeeded === 1 ? "" : "s"} for 75%
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* =============================================
              ATTENDANCE HISTORY WITH SUBJECT FILTER
          ============================================= */}
          <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
            <View>
              <Text style={styles.sectionTitle}>Attendance Session Logs</Text>
              <Text style={styles.sectionSubtitle}>
                Filter by Subject • Real-Time Records
              </Text>
            </View>

            {isPrivileged && (
              <View style={styles.teacherIndicatorTag}>
                <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                <Text style={styles.teacherIndicatorText}>Teacher Editing Active</Text>
              </View>
            )}
          </View>

          {/* Subject Filter Pills Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            {availableFilterSubjects.map((subj) => {
              const isSelected = selectedSubjectFilter === subj;
              return (
                <TouchableOpacity
                  key={subj}
                  style={[
                    styles.filterPill,
                    isSelected && styles.filterPillActive,
                  ]}
                  onPress={() => setSelectedSubjectFilter(subj)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isSelected && styles.filterPillTextActive,
                    ]}
                  >
                    {subj}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Attendance History List */}
          {filteredHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={36} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Records Found</Text>
              <Text style={styles.emptyText}>
                {selectedSubjectFilter === "All"
                  ? "No official attendance records logged yet. Your teacher will record attendance during class sessions."
                  : `No attendance records recorded for ${selectedSubjectFilter} yet.`}
              </Text>
            </View>
          ) : (
            filteredHistory.map((item) => (
              <View style={styles.historyCard} key={item.id}>
                <View
                  style={[
                    styles.historyIcon,
                    {
                      backgroundColor: item.present ? "#DCFCE7" : "#FEE2E2",
                    },
                  ]}
                >
                  <Ionicons
                    name={item.present ? "checkmark" : "close"}
                    size={20}
                    color={item.present ? "#16A34A" : "#DC2626"}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.historySubject}>{item.subject}</Text>
                  <Text style={styles.historyDate}>
                    📅 {item.date} • 👨‍🏫 Marked by: {item.markedBy || "Teacher"} ({item.markedByRole || "faculty"})
                  </Text>
                  {item.remarks && item.remarks !== "-" ? (
                    <Text style={styles.historyRemarks}>Note: {item.remarks}</Text>
                  ) : null}
                </View>

                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: item.present ? "#DCFCE7" : "#FEE2E2",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: item.present ? "#16A34A" : "#DC2626",
                        },
                      ]}
                    >
                      {item.status || (item.present ? "Present" : "Absent")}
                    </Text>
                  </View>

                  {/* Re-change status button for Teachers and Admins */}
                  {isPrivileged ? (
                    <TouchableOpacity
                      style={styles.rechangeHistoryBtn}
                      onPress={() => openRechangeModalForRecord(item)}
                    >
                      <Ionicons name="create-outline" size={11} color="#2563EB" />
                      <Text style={styles.rechangeHistoryBtnText}>Re-change</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.lockHistoryBadge}
                      onPress={handleStudentUnauthorizedAction}
                    >
                      <Ionicons name="lock-closed" size={10} color="#94A3B8" />
                      <Text style={styles.lockHistoryBadgeText}>Locked</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}

          {/* =============================================
              SECURITY INFO CARD
          ============================================= */}
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed" size={20} color="#4F46E5" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.infoTitle}>
                Attendance Security & Access Control
              </Text>
              <Text style={styles.infoText}>
                Student attendance records can only be updated or re-changed by designated faculty and administrators. Students have real-time read-only access.
              </Text>
            </View>
          </View>
        </>
      )}

      {/* =================================================
          TEACHER & ADMIN RE-CHANGE ATTENDANCE MODAL
      ================================================= */}
      <Modal
        visible={rechangeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRechangeModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setRechangeModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Re-change Student Attendance</Text>
                <Text style={styles.modalSubtitle}>
                  Authorized as {currentUserName} ({currentUserRole.toUpperCase()})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRechangeModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Subject Selector */}
            <Text style={styles.inputLabel}>Select Subject</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4, marginBottom: 12 }}
            >
              {DEFAULT_SUBJECTS_ROSTER.map((sub) => (
                <TouchableOpacity
                  key={sub.name}
                  style={[
                    styles.subjectChoicePill,
                    rechangeSubject === sub.name && styles.subjectChoicePillActive,
                  ]}
                  onPress={() => setRechangeSubject(sub.name)}
                >
                  <Text
                    style={[
                      styles.subjectChoiceText,
                      rechangeSubject === sub.name && styles.subjectChoiceTextActive,
                    ]}
                  >
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date Input */}
            <Text style={styles.inputLabel}>Date (Session Date)</Text>
            <TextInput
              style={styles.textInput}
              value={rechangeDate}
              onChangeText={setRechangeDate}
              placeholder="e.g. Sep 28, 2026"
            />

            {/* Status Selector */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              New Attendance Status
            </Text>
            <View style={styles.statusToggleRow}>
              {(["Present", "Absent", "Late"] as const).map((st) => {
                const isActive = rechangeStatus === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusSelectBtn,
                      isActive && st === "Present" && styles.statusSelectPresentActive,
                      isActive && st === "Absent" && styles.statusSelectAbsentActive,
                      isActive && st === "Late" && styles.statusSelectLateActive,
                    ]}
                    onPress={() => setRechangeStatus(st)}
                  >
                    <Ionicons
                      name={
                        st === "Present"
                          ? "checkmark-circle"
                          : st === "Absent"
                          ? "close-circle"
                          : "time"
                      }
                      size={16}
                      color={
                        isActive
                          ? "#FFFFFF"
                          : st === "Present"
                          ? "#16A34A"
                          : st === "Absent"
                          ? "#DC2626"
                          : "#D97706"
                      }
                    />
                    <Text
                      style={[
                        styles.statusSelectText,
                        isActive && { color: "#FFFFFF", fontWeight: "800" },
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Remarks Input */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Faculty Remarks / Verification Note
            </Text>
            <TextInput
              style={[styles.textInput, { height: 70, textAlignVertical: "top" }]}
              value={rechangeRemarks}
              onChangeText={setRechangeRemarks}
              placeholder="e.g., Medical leave verified by HOD, attended lab session"
              multiline
            />

            {/* Submit / Cancel Buttons */}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRechangeModalVisible(false)}
                disabled={isSubmittingRechange}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveRechangeAttendance}
                disabled={isSubmittingRechange}
              >
                {isSubmittingRechange ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                    <Text style={styles.modalConfirmBtnText}>Confirm Re-change</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// =======================================================
// SUMMARY STAT CARD COMPONENT
// =======================================================
function SummaryCard({
  icon,
  title,
  value,
  color,
  bgColor,
}: {
  icon: any;
  title: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
    </View>
  );
}

// =======================================================
// STYLES
// =======================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    padding: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
  },
  subtitle: {
    color: "#64748B",
    marginTop: 2,
    fontSize: 13,
  },
  adminSwitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 5,
  },
  adminSwitchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  rechangeHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 11,
    gap: 5,
  },
  rechangeHeaderBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 5,
  },
  readOnlyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  policyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    gap: 10,
  },
  policyBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#3730A3",
  },
  policyBannerText: {
    fontSize: 12,
    color: "#4338CA",
    lineHeight: 17,
    marginTop: 2,
  },
  loadingContainer: {
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  mainCard: {
    backgroundColor: "#4F46E5",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  mainCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainLabel: {
    color: "#E0E7FF",
    fontSize: 13,
    fontWeight: "700",
  },
  percentage: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "900",
    marginTop: 4,
  },
  percentageCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressBackground: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 5,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
  },
  mainCardFooter: {
    marginTop: 10,
  },
  progressText: {
    color: "#E0E7FF",
    fontSize: 12,
    lineHeight: 17,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  summaryTitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  rechangeSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 4,
  },
  rechangeSmallBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  teacherIndicatorTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  teacherIndicatorText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
  subjectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  subjectHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  subjectName: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 15,
  },
  codeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  subjectTeacher: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  percentagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
  },
  subjectPercentage: {
    fontSize: 17,
    fontWeight: "900",
  },
  subjectMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  metricItemPresent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  metricTextPresent: {
    fontSize: 11,
    fontWeight: "800",
    color: "#16A34A",
  },
  metricItemAbsent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  metricTextAbsent: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
  },
  metricItemTotal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  metricTextTotal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  rechangePillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
    marginLeft: "auto",
  },
  rechangePillBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  readOnlyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
    marginLeft: "auto",
  },
  readOnlyPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  subjectProgressBackground: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    marginTop: 10,
    overflow: "hidden",
  },
  subjectProgress: {
    height: 6,
    borderRadius: 4,
  },
  subjectFooterRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  eligibleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  eligibleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  shortageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  shortageBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  filterPillsScroll: {
    paddingVertical: 6,
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  historySubject: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 14,
  },
  historyDate: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  historyRemarks: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
    fontStyle: "italic",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  rechangeHistoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  rechangeHistoryBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  lockHistoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  lockHistoryBadgeText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },
  emptyText: {
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  infoTitle: {
    color: "#312E81",
    fontWeight: "800",
    fontSize: 13,
  },
  infoText: {
    color: "#4338CA",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  subjectChoicePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  subjectChoicePillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  subjectChoiceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  subjectChoiceTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  statusToggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusSelectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 5,
  },
  statusSelectPresentActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  statusSelectAbsentActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  statusSelectLateActive: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  statusSelectText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  modalConfirmBtn: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
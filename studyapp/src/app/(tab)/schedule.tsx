import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

// Platform timepicker if available
let DateTimePicker: any = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {
  DateTimePicker = null;
}

export type ClassItem = {
  id: string;
  day: string;
  timeRange: string;
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
  faculty: string;
  status: "Completed" | "Ongoing" | "Upcoming";
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
};

type SubjectItem = {
  id: string;
  name: string;
  code?: string;
  teacherName?: string;
  department?: string;
};

const WEEK_DAYS = [
  { dayName: "Mon", dateNum: "22" },
  { dayName: "Tue", dateNum: "23" },
  { dayName: "Wed", dateNum: "24" },
  { dayName: "Thu", dateNum: "25" },
  { dayName: "Fri", dateNum: "26" },
  { dayName: "Sat", dateNum: "27" },
  { dayName: "Sun", dateNum: "28" },
];

const MODAL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Default starter classes to seed if collection is completely empty
const INITIAL_SAMPLE_CLASSES = [
  {
    day: "Mon",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    timeRange: "09:00 AM\n– 10:00 AM",
    subject: "Data Structures",
    room: "Room 204 • 2nd Floor",
    faculty: "Prof. Sharma",
    status: "Completed" as const,
  },
  {
    day: "Mon",
    startTime: "10:15 AM",
    endTime: "11:15 AM",
    timeRange: "10:15 AM\n– 11:15 AM",
    subject: "DBMS",
    room: "Room 302 • 3rd Floor",
    faculty: "Prof. Verma",
    status: "Completed" as const,
  },
  {
    day: "Mon",
    startTime: "12:00 PM",
    endTime: "01:00 PM",
    timeRange: "12:00 PM\n– 01:00 PM",
    subject: "Operating Systems",
    room: "Room 304 • 3rd Floor",
    faculty: "Prof. Patel",
    status: "Ongoing" as const,
  },
  {
    day: "Tue",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    timeRange: "09:00 AM\n– 10:00 AM",
    subject: "Data Structures",
    room: "Room 204 • 2nd Floor",
    faculty: "Prof. Sharma",
    status: "Completed" as const,
  },
  {
    day: "Tue",
    startTime: "10:15 AM",
    endTime: "11:15 AM",
    timeRange: "10:15 AM\n– 11:15 AM",
    subject: "DBMS",
    room: "Room 302 • 3rd Floor",
    faculty: "Prof. Verma",
    status: "Completed" as const,
  },
  {
    day: "Tue",
    startTime: "12:00 PM",
    endTime: "01:00 PM",
    timeRange: "12:00 PM\n– 01:00 PM",
    subject: "Operating Systems",
    room: "Room 304 • 3rd Floor",
    faculty: "Prof. Patel",
    status: "Ongoing" as const,
  },
  {
    day: "Tue",
    startTime: "02:00 PM",
    endTime: "03:00 PM",
    timeRange: "02:00 PM\n– 03:00 PM",
    subject: "Computer Networks",
    room: "Room 201 • 2nd Floor",
    faculty: "Prof. Kumar",
    status: "Upcoming" as const,
  },
  {
    day: "Tue",
    startTime: "04:00 PM",
    endTime: "05:00 PM",
    timeRange: "04:00 PM\n– 05:00 PM",
    subject: "English Communication",
    room: "Room 105 • 1st Floor",
    faculty: "Dr. Ananya",
    status: "Upcoming" as const,
  },
  {
    day: "Wed",
    startTime: "09:00 AM",
    endTime: "10:30 AM",
    timeRange: "09:00 AM\n– 10:30 AM",
    subject: "Algorithms Lab",
    room: "Computer Lab 3",
    faculty: "Prof. Sharma",
    status: "Upcoming" as const,
  },
  {
    day: "Wed",
    startTime: "11:00 AM",
    endTime: "12:30 PM",
    timeRange: "11:00 AM\n– 12:30 PM",
    subject: "Web Tech Lab",
    room: "Lab 2 • 1st Floor",
    faculty: "Prof. Kumar",
    status: "Upcoming" as const,
  },
];

export default function ScheduleScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [userInitial, setUserInitial] = useState("S");
  const [isAdminOrTeacher, setIsAdminOrTeacher] = useState(false);
  const [selectedDay, setSelectedDay] = useState("Tue");

  // Schedule list from Firestore (Shared collection created and managed by Admin/Teachers)
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load User profile info & role
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const email = (user.email || "").toLowerCase();
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const rawName = data.fullName || data.name || user.displayName || "Student";
        setUserInitial(rawName.trim().charAt(0).toUpperCase() || "S");

        const role = (data.role || "").toLowerCase();
        if (role === "admin" || role === "teacher" || email.includes("admin") || email.includes("teacher")) {
          setIsAdminOrTeacher(true);
        }
      },
      (err) => console.log("User snapshot error:", err.message)
    );

    return unsubscribe;
  }, []);

  // Real-time Firestore synchronization for Schedule & Curriculum Subjects
  useEffect(() => {
    let unsubSchedule: (() => void) | undefined;
    let unsubSubjects: (() => void) | undefined;

    try {
      const scheduleCol = collection(db, "schedules");
      unsubSchedule = onSnapshot(
        scheduleCol,
        async (snap) => {
          // If shared schedule collection is empty, seed sample curriculum classes once
          if (snap.empty) {
            try {
              for (const item of INITIAL_SAMPLE_CLASSES) {
                await addDoc(scheduleCol, {
                  ...item,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              }
            } catch (seedErr) {
              console.warn("Seeding initial schedule failed:", seedErr);
            }
            setLoading(false);
            return;
          }

          const defaultIcons = [
            { icon: "code-slash" as const, bg: "#EDE9FE", color: "#7C3AED" },
            { icon: "server" as const, bg: "#E0F2FE", color: "#0284C7" },
            { icon: "settings" as const, bg: "#DCFCE7", color: "#16A34A" },
            { icon: "git-network" as const, bg: "#FFEDD5", color: "#EA580C" },
            { icon: "book" as const, bg: "#EDE9FE", color: "#7C3AED" },
            { icon: "flask" as const, bg: "#EEF2FF", color: "#6366F1" },
          ];

          const loaded: ClassItem[] = snap.docs.map((d, index) => {
            const data = d.data();
            const iconPair = defaultIcons[index % defaultIcons.length];

            const sTime = data.startTime || (data.time?.split("-")[0]?.trim()) || "09:00 AM";
            const eTime = data.endTime || (data.time?.split("-")[1]?.trim()) || "10:00 AM";
            const formattedRange = data.timeRange || `${sTime}\n– ${eTime}`;

            let st: "Completed" | "Ongoing" | "Upcoming" = "Upcoming";
            if (data.status === "Completed") st = "Completed";
            else if (data.status === "Ongoing") st = "Ongoing";

            return {
              id: d.id,
              day: data.day || "Mon",
              timeRange: formattedRange,
              startTime: sTime,
              endTime: eTime,
              subject: data.subject || "Subject",
              room: data.room || "Room 101",
              faculty: data.faculty || data.teacher || "Professor",
              status: st,
              icon: iconPair.icon,
              iconBg: iconPair.bg,
              iconColor: iconPair.color,
            };
          });

          // Sort by start time
          loaded.sort((a, b) => a.startTime.localeCompare(b.startTime));

          setClasses(loaded);
          setLoading(false);
        },
        (err) => {
          console.warn("Schedule listener error:", err.message);
          setLoading(false);
        }
      );

      // Listen to subjects collection so students know all official subjects and faculty
      const subCol = collection(db, "subjects");
      unsubSubjects = onSnapshot(
        subCol,
        (snap) => {
          const loadedSubs: SubjectItem[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || "",
              code: data.code || "",
              teacherName: data.teacherName || "",
              department: data.department || "",
            };
          });
          setSubjects(loadedSubs);
        },
        (err) => console.log("Subjects listener error:", err.message)
      );
    } catch (err) {
      console.warn("Schedule listener setup error:", err);
      setLoading(false);
    }

    return () => {
      if (unsubSchedule) unsubSchedule();
      if (unsubSubjects) unsubSubjects();
    };
  }, []);

  // Subject-Wise Faculty mapping so students can easily identify which teacher teaches which subject
  const subjectFacultyList = useMemo(() => {
    const map = new Map<
      string,
      {
        subject: string;
        code: string;
        teacher: string;
        weeklyCount: number;
      }
    >();

    // 1. From curriculum subjects collection
    for (const s of subjects) {
      if (s.name) {
        map.set(s.name.trim().toLowerCase(), {
          subject: s.name.trim(),
          code: s.code || "",
          teacher: s.teacherName || "Faculty Member",
          weeklyCount: 0,
        });
      }
    }

    // 2. From scheduled classes
    for (const c of classes) {
      const key = c.subject.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.weeklyCount += 1;
        if (
          (!existing.teacher || existing.teacher === "Faculty Member" || existing.teacher === "Professor") &&
          c.faculty
        ) {
          existing.teacher = c.faculty;
        }
      } else {
        map.set(key, {
          subject: c.subject.trim(),
          code: "",
          teacher: c.faculty || "Faculty Member",
          weeklyCount: 1,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [subjects, classes]);

  // Filter classes by active day and optional subject filter
  const filteredTodayClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchDay = c.day === selectedDay;
      const matchSub =
        !selectedSubjectFilter || c.subject.toLowerCase() === selectedSubjectFilter.toLowerCase();
      return matchDay && matchSub;
    });
  }, [classes, selectedDay, selectedSubjectFilter]);

  // Next day classes
  const nextDayName = useMemo(() => {
    const idx = WEEK_DAYS.findIndex((d) => d.dayName === selectedDay);
    const nextIdx = (idx + 1) % WEEK_DAYS.length;
    return WEEK_DAYS[nextIdx].dayName;
  }, [selectedDay]);

  const filteredTomorrowClasses = useMemo(() => {
    return classes.filter((c) => c.day === nextDayName);
  }, [classes, nextDayName]);

  // Optional status view / student personal completion toggle
  const handleCycleStatus = async (item: ClassItem) => {
    // If teacher/admin, allow live status update in schedules
    if (isAdminOrTeacher) {
      const nextStatus: "Completed" | "Ongoing" | "Upcoming" =
        item.status === "Upcoming"
          ? "Ongoing"
          : item.status === "Ongoing"
          ? "Completed"
          : "Upcoming";

      try {
        await updateDoc(doc(db, "schedules", item.id), {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.warn("Could not update class status:", err);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      {/* ================================================== */}
      {/* 1. TOP HEADER BRANDING */}
      {/* ================================================== */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerBrandCol}>
          <View style={styles.logoRow}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="school" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>Campusly</Text>
          </View>
          <Text style={[styles.brandTagline, { color: colors.textSecondary }]}>Learn. Connect. Grow.</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* Quick link to Manage Subjects */}
          <TouchableOpacity
            style={[styles.manageSubjectsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push("/subjects")}
            activeOpacity={0.8}
          >
            <Ionicons name="book-outline" size={18} color={colors.primary} />
          </TouchableOpacity>

          {/* Profile Circle */}
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => router.push("/(tab)/profile")}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarLetter}>{userInitial}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================================================== */}
        {/* 2. HERO BANNER */}
        {/* ================================================== */}
        <View style={styles.heroBanner}>
          <View style={styles.heroGlowCircle} />
          <View style={styles.heroContent}>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroSubtitle}>{t("academicTimetable", "ACADEMIC TIMETABLE")}</Text>
              <Text style={styles.heroTitle}>{t("yourSchedule", "YOUR SCHEDULE 🗓️")}</Text>
              <Text style={styles.heroDescription}>{t("manageTimetable", "Organize your day efficiently")}</Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="calendar" size={38} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* ================================================== */}
        {/* 3. WEEKLY CAROUSEL SELECTOR */}
        {/* ================================================== */}
        <View style={styles.weekCarouselContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekCarouselContent}
          >
            {WEEK_DAYS.map((item) => {
              const isActive = selectedDay === item.dayName;
              return (
                <TouchableOpacity
                  key={item.dayName}
                  style={[
                    styles.dayCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && styles.dayCardActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedDay(item.dayName)}
                >
                  <Text
                    style={[
                      styles.dayNameText,
                      { color: colors.textSecondary },
                      isActive && styles.dayNameTextActive,
                    ]}
                  >
                    {item.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dateNumText,
                      { color: colors.text },
                      isActive && styles.dateNumTextActive,
                    ]}
                  >
                    {item.dateNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ================================================== */}
        {/* 3.5. SUBJECT-WISE FACULTY DIRECTORY (Know Your Teachers) */}
        {/* ================================================== */}
        {subjectFacultyList.length > 0 && (
          <View style={[styles.subjectDirectoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.subDirHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="people" size={17} color={colors.primary} />
                  <Text style={[styles.subDirTitle, { color: colors.text }]}>
                    Subject & Faculty Directory
                  </Text>
                </View>
                <Text style={[styles.subDirSubtitle, { color: colors.textSecondary }]}>
                  {selectedSubjectFilter
                    ? `Filtering by ${selectedSubjectFilter}`
                    : "Tap a subject to view assigned faculty & filter classes"}
                </Text>
              </View>

              {selectedSubjectFilter && (
                <TouchableOpacity
                  style={[styles.clearFilterBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => setSelectedSubjectFilter(null)}
                >
                  <Ionicons name="close-circle" size={14} color={colors.primary} />
                  <Text style={[styles.clearFilterBtnText, { color: colors.primary }]}>All Subjects</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subDirList}
            >
              {subjectFacultyList.map((item) => {
                const isFiltered = selectedSubjectFilter === item.subject;
                return (
                  <TouchableOpacity
                    key={item.subject}
                    style={[
                      styles.subDirChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isFiltered && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                    ]}
                    activeOpacity={0.7}
                    onPress={() =>
                      setSelectedSubjectFilter(isFiltered ? null : item.subject)
                    }
                  >
                    <View style={styles.subDirChipTop}>
                      <Text
                        style={[
                          styles.subDirChipSubject,
                          { color: colors.text },
                          isFiltered && { color: colors.primary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.subject}
                      </Text>
                      {item.code ? (
                        <View style={[styles.subDirCodeBadge, { backgroundColor: colors.card }]}>
                          <Text style={[styles.subDirCodeText, { color: colors.textSecondary }]}>
                            {item.code}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.subDirTeacherRow}>
                      <View style={[styles.subDirAvatar, { backgroundColor: colors.primary }]}>
                        <Ionicons name="person" size={12} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.subDirTeacherLabel, { color: colors.textSecondary }]}>
                          Teacher
                        </Text>
                        <Text
                          style={[
                            styles.subDirTeacherName,
                            { color: colors.text },
                            isFiltered && { color: colors.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.teacher}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.subDirChipFooter}>
                      <Text style={[styles.subDirClassesText, { color: colors.textSecondary }]}>
                        {item.weeklyCount} {item.weeklyCount === 1 ? "class/week" : "classes/week"}
                      </Text>
                      <Ionicons
                        name={isFiltered ? "funnel" : "chevron-forward"}
                        size={12}
                        color={isFiltered ? colors.primary : colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ================================================== */}
        {/* 4. TODAY'S CLASSES */}
        {/* ================================================== */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              {selectedDay}'s Classes
            </Text>
            <Text style={[styles.sectionSubheading, { color: colors.textSecondary }]}>
              {filteredTodayClasses.length} {filteredTodayClasses.length === 1 ? "lecture" : "lectures"} scheduled
              {selectedSubjectFilter ? ` (filtered: ${selectedSubjectFilter})` : ""}
            </Text>
          </View>

          {isAdminOrTeacher ? (
            <TouchableOpacity
              style={[styles.manageScheduleBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => router.push("/admin/schedule")}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.manageScheduleBtnText, { color: colors.primary }]}>
                Edit Schedule
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.officialBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={[styles.officialBadgeText, { color: colors.textSecondary }]}>
                Faculty Schedule
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.loadingText}>Syncing schedule...</Text>
          </View>
        ) : filteredTodayClasses.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-clear-outline" size={32} color="#6366F1" />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedSubjectFilter ? `No ${selectedSubjectFilter} on ${selectedDay}` : `No classes on ${selectedDay}`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedSubjectFilter
                ? `There is no ${selectedSubjectFilter} lecture scheduled on ${selectedDay}. Check other weekdays or clear the filter.`
                : "No lectures scheduled by faculty for this day. Follow upcoming updates."}
            </Text>
            {selectedSubjectFilter && (
              <TouchableOpacity
                style={[styles.clearFilterCardBtn, { backgroundColor: colors.primary }]}
                onPress={() => setSelectedSubjectFilter(null)}
              >
                <Text style={styles.clearFilterCardBtnText}>View All Classes</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.classesList}>
            {filteredTodayClasses.map((item) => {
              const isCompleted = item.status === "Completed";
              const isOngoing = item.status === "Ongoing";

              return (
                <View key={item.id} style={styles.classCard}>
                  {/* Left Column: Time */}
                  <View style={styles.timeCol}>
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}>{item.timeRange}</Text>
                  </View>

                  {/* Vertical Timeline Divider */}
                  <View style={styles.timelineBar}>
                    <View
                      style={[
                        styles.timelineDot,
                        isCompleted && styles.timelineDotCompleted,
                        isOngoing && styles.timelineDotOngoing,
                      ]}
                    />
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                  </View>

                  {/* Right Details Card */}
                  <View style={[styles.classDetailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.classDetailsTopRow}>
                      <View style={[styles.classIconBox, { backgroundColor: item.iconBg }]}>
                        <Ionicons name={item.icon} size={18} color={item.iconColor} />
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.classSubject, { color: colors.text }]}>{item.subject}</Text>
                        <Text style={[styles.classFaculty, { color: colors.textSecondary }]}>{item.faculty}</Text>
                      </View>

                      {/* Status Tag */}
                      <View
                        style={[
                          styles.statusBadge,
                          isCompleted && styles.statusBadgeCompleted,
                          isOngoing && styles.statusBadgeOngoing,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isCompleted && styles.statusBadgeTextCompleted,
                            isOngoing && styles.statusBadgeTextOngoing,
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.classCardBottomRow}>
                      <View style={[styles.roomBadge, { backgroundColor: colors.surface }]}>
                        <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                        <Text style={[styles.roomBadgeText, { color: colors.textSecondary }]}>{item.room}</Text>
                      </View>

                      {/* Prominent Subject Teacher Badge */}
                      <View style={[styles.facultyBadge, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="school-outline" size={12} color={colors.primary} />
                        <Text style={[styles.facultyBadgeText, { color: colors.primary }]} numberOfLines={1}>
                          {item.faculty}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ================================================== */}
        {/* 5. NEXT DAY PREVIEW */}
        {/* ================================================== */}
        <View style={[styles.tomorrowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.tomorrowHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="calendar-outline" size={17} color={colors.primary} />
              <Text style={[styles.tomorrowTitle, { color: colors.text }]}>{nextDayName}'s Preview</Text>
            </View>
            <Text style={styles.tomorrowCountText}>
              {filteredTomorrowClasses.length} {filteredTomorrowClasses.length === 1 ? "class" : "classes"}
            </Text>
          </View>

          {filteredTomorrowClasses.length === 0 ? (
            <Text style={styles.tomorrowEmptyText}>No lectures scheduled for {nextDayName}.</Text>
          ) : (
            filteredTomorrowClasses.map((item, index) => (
              <React.Fragment key={item.id}>
                <View style={styles.tomorrowItemRow}>
                  <View style={styles.timeRangeCol}>
                    <Text style={styles.timeRangeText}>{item.timeRange}</Text>
                  </View>

                  <View style={styles.tomorrowDetailsRow}>
                    <View style={[styles.classIconBox, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon} size={16} color={item.iconColor} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.classSubject}>{item.subject}</Text>
                      <Text style={styles.classRoom}>{item.room} • {item.faculty}</Text>
                    </View>
                  </View>
                </View>

                {index < filteredTomorrowClasses.length - 1 && (
                  <View style={styles.tomorrowDivider} />
                )}
              </React.Fragment>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 90,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  headerBrandCol: {
    flex: 1,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#251460",
    letterSpacing: -0.2,
  },
  brandTagline: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  manageSubjectsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4C268F",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* HERO BANNER */
  heroBanner: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#7048E8",
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#7048E8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroGlowCircle: {
    position: "absolute",
    right: -25,
    bottom: -35,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  heroContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  heroSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  heroDescription: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  heroIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* WEEK CAROUSEL */
  weekCarouselContainer: {
    marginTop: 10,
  },
  weekCarouselContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  dayCard: {
    width: 44,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dayCardActive: {
    backgroundColor: "#7048E8",
    borderColor: "#7048E8",
    shadowColor: "#7048E8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  dayNameText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  dayNameTextActive: {
    color: "#FFFFFF",
  },
  dateNumText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },
  dateNumTextActive: {
    color: "#FFFFFF",
  },

  /* SECTION HEADER */
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  sectionSubheading: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  manageScheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  manageScheduleBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  officialBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },

  /* LOADING & EMPTY */
  centerLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 3,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0265DC",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* CLASSES LIST */
  classesList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  classCard: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  timeCol: {
    width: 62,
    paddingTop: 4,
  },
  timeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748B",
    lineHeight: 13,
  },
  timelineBar: {
    width: 14,
    alignItems: "center",
    marginRight: 6,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#94A3B8",
    marginTop: 6,
  },
  timelineDotCompleted: {
    backgroundColor: "#16A34A",
  },
  timelineDotOngoing: {
    backgroundColor: "#0284C7",
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#E2E8F0",
    marginTop: 3,
  },
  classDetailsCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  classDetailsTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  classIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  classSubject: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  classFaculty: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  statusBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  statusBadgeCompleted: {
    backgroundColor: "#DCFCE7",
  },
  statusBadgeOngoing: {
    backgroundColor: "#E0F2FE",
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
  },
  statusBadgeTextCompleted: {
    color: "#16A34A",
  },
  statusBadgeTextOngoing: {
    color: "#0284C7",
  },
  deleteClassBtn: {
    padding: 3,
  },
  classCardBottomRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  roomBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  roomBadgeText: {
    fontSize: 9.5,
    color: "#64748B",
    fontWeight: "500",
  },
  facultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
    maxWidth: 140,
  },
  facultyBadgeText: {
    fontSize: 9.5,
    fontWeight: "600",
  },

  /* SUBJECT & FACULTY DIRECTORY */
  subjectDirectoryCard: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  subDirHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  subDirTitle: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  subDirSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  clearFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  clearFilterBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },
  subDirList: {
    gap: 8,
    paddingVertical: 2,
  },
  subDirChip: {
    width: 140,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
  },
  subDirChipTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  subDirChipSubject: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    marginRight: 4,
  },
  subDirCodeBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  subDirCodeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  subDirTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  subDirAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  subDirTeacherLabel: {
    fontSize: 8.5,
    fontWeight: "600",
  },
  subDirTeacherName: {
    fontSize: 10,
    fontWeight: "700",
  },
  subDirChipFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148, 163, 184, 0.2)",
    paddingTop: 3,
  },
  subDirClassesText: {
    fontSize: 9,
    fontWeight: "500",
  },
  clearFilterCardBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearFilterCardBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  /* TOMORROW CARD */
  tomorrowCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tomorrowHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tomorrowTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  tomorrowCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  tomorrowEmptyText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 8,
  },
  tomorrowItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  timeRangeCol: {
    width: 66,
  },
  timeRangeText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 13,
  },
  tomorrowDetailsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  classRoom: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  tomorrowDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 3,
  },
});
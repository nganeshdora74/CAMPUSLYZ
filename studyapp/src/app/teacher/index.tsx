import React, { useState, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import NotificationBellModal from "../../components/NotificationBellModal";
import UniversalRoleControls from "../../components/UniversalRoleControls";
import MarkdownView from "../../components/MarkdownView";
import { useAppTheme } from "../../context/ThemeContext";
import { parseNameAndRoleFromEmail } from "../../utils/userEmailParser";
import { askCampuslyAI } from "../../services/aiService";
import {
  ConnectedStudentItem,
  listenTeacherConnectedStudents,
  seedDefaultConnectedStudents,
} from "../../firebase/teacherStudent";
import {
  ScheduleEntry,
  subscribeSchedules,
  getDynamicClassStatus,
  ClassStatus,
} from "../../services/scheduleService";

export interface SpecialNoteItem {
  id: string;
  title: string;
  subject: string;
  category: "Important" | "High Priority" | "Reminder" | "Info" | "Exam Special Note";
  priority: "High" | "Medium" | "Normal";
  content: string;
  date?: string;
  targetClass?: string;
  photoUrl?: string;
  pdfUrl?: string;
  createdAt?: any;
}

const SIDEBAR_ITEMS = [
  { id: "home", label: "Home", icon: "home", route: "/teacher" },
  { id: "classes", label: "My Classes", icon: "grid-outline", route: "/teacher/classes" },
  { id: "schedule", label: "Schedule", icon: "calendar-outline", route: "/teacher/schedule" },
  { id: "students", label: "Students", icon: "people-outline", route: "/teacher/students" },
  { id: "assignments", label: "Assignments", icon: "document-text-outline", route: "/teacher/assignments" },
  { id: "exams", label: "Exams", icon: "school-outline", route: "/teacher/exams" },
  { id: "messages", label: "Messages", icon: "chatbubbles-outline", route: "/messages?role=teacher", badge: "3" },
  { id: "resources", label: "Resources", icon: "folder-open-outline", route: "/teacher/resources" },
  { id: "profile", label: "Profile", icon: "person-outline", route: "/teacher/profile" },
  { id: "settings", label: "Settings", icon: "settings-outline", route: "/teacher/settings" },
];

const SCHEDULE_ITEMS = [
  {
    id: "sch-1",
    time: "09:00 - 10:00",
    title: "Data Structures",
    classRoom: "CSE - A • Room 101",
    status: "Ongoing",
    statusType: "ongoing",
    codeIcon: "</>",
    iconBg: "#EFF6FF",
    iconColor: "#2563EB",
  },
  {
    id: "sch-2",
    time: "10:00 - 11:00",
    title: "Web Technologies",
    classRoom: "CSE - A • Room 101",
    status: "Upcoming",
    statusType: "upcoming",
    codeIcon: "globe-outline",
    iconBg: "#EFF6FF",
    iconColor: "#2563EB",
  },
  {
    id: "sch-3",
    time: "11:00 - 12:00",
    title: "Database Management Systems",
    classRoom: "CSE - B • Room 103",
    status: "Upcoming",
    statusType: "upcoming",
    codeIcon: "server-outline",
    iconBg: "#FAF5FF",
    iconColor: "#7C3AED",
  },
  {
    id: "sch-4",
    time: "02:00 - 03:00",
    title: "Computer Networks",
    classRoom: "Lab • Lab 1",
    status: "Upcoming",
    statusType: "upcoming",
    codeIcon: "git-network-outline",
    iconBg: "#F0FDFA",
    iconColor: "#0D9488",
  },
  {
    id: "sch-5",
    time: "04:00 - 05:00",
    title: "Operating Systems",
    classRoom: "CSE - B • Room 102",
    status: "Upcoming",
    statusType: "upcoming",
    codeIcon: "hardware-chip-outline",
    iconBg: "#EFF6FF",
    iconColor: "#2563EB",
  },
];

const getDynamicRecentDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
};

const RECENT_CLASSES = [
  {
    id: "rc-1",
    title: "Data Structures",
    classTag: "CSE - A",
    dept: "CSE - A",
    date: getDynamicRecentDate(0),
    icon: "</>",
    iconBg: "#EFF6FF",
    iconColor: "#2563EB",
  },
  {
    id: "rc-2",
    title: "Web Technologies",
    classTag: "CSE - A",
    dept: "CSE - A",
    date: getDynamicRecentDate(0),
    icon: "globe-outline",
    iconBg: "#ECFDF5",
    iconColor: "#059669",
  },
  {
    id: "rc-3",
    title: "DBMS",
    classTag: "CSE - B",
    dept: "CSE - B",
    date: getDynamicRecentDate(1),
    icon: "server-outline",
    iconBg: "#FFF7ED",
    iconColor: "#EA580C",
  },
  {
    id: "rc-4",
    title: "Operating Systems",
    classTag: "CSE - B",
    dept: "CSE - B",
    date: getDynamicRecentDate(2),
    icon: "hardware-chip-outline",
    iconBg: "#FFF1F2",
    iconColor: "#E11D48",
  },
];

const CLASS_OVERVIEW_LIST = [
  { name: "Data Structures", count: 1, color: "#2563EB" },
  { name: "Web Technologies", count: 1, color: "#7C3AED" },
  { name: "DBMS", count: 1, color: "#EA580C" },
  { name: "Computer Networks", count: 1, color: "#0D9488" },
  { name: "Operating Systems", count: 1, color: "#E11D48" },
  { name: "OOP", count: 1, color: "#DC2626" },
];

const DEFAULT_SPECIAL_NOTES: SpecialNoteItem[] = [
  {
    id: "sn-1",
    title: "Data Structures – Important",
    category: "High Priority",
    priority: "High",
    subject: "Data Structures",
    date: "06 Oct 2026",
    content: "Focus on tree and graph questions for next week's test.",
  },
  {
    id: "sn-2",
    title: "DBMS – Reminder",
    category: "Reminder",
    priority: "Medium",
    subject: "DBMS",
    date: "05 Oct 2026",
    content: "Lab report submission is due on 10 Oct 2026.",
  },
  {
    id: "sn-3",
    title: "General – Announcement",
    category: "Info",
    priority: "Normal",
    subject: "General",
    date: "03 Oct 2026",
    content: "College will remain closed on 15 Oct 2026 (Gandhi Jayanti).",
  },
  {
    id: "sn-4",
    title: "OOP – Exam Tips",
    category: "Important",
    priority: "High",
    subject: "OOP",
    date: "01 Oct 2026",
    content: "Revise inheritance, polymorphism and exception handling.",
  },
];

const AI_SUGGESTIONS = [
  "Show me struggling students in Data Structures",
  "Create a sample test for DBMS",
  "Give me important notes for this week",
  "Explain recursion with an example",
];

export default function TeacherDashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1100;
  const isTablet = width >= 768 && width < 1100;
  const { colors, isDark } = useAppTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [teacherName, setTeacherName] = useState("Dr. Rajesh Kumar");
  const [teacherDept, setTeacherDept] = useState("Faculty - CSE");

  // Schedule filter tab
  const [scheduleTab, setScheduleTab] = useState<"Today" | "This Week" | "Upcoming">("Today");

  // AI Assistant Chat state
  const [aiInput, setAiInput] = useState("");
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "Hello Dr. Kumar! 👋 I'm your AI assistant. You can ask me about classes, students, assignments, resources, exam questions or any teaching related queries.",
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Special Notes state
  const [specialNotes, setSpecialNotes] = useState<SpecialNoteItem[]>(DEFAULT_SPECIAL_NOTES);
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteSubject, setNewNoteSubject] = useState("Data Structures");
  const [newNoteCategory, setNewNoteCategory] = useState<SpecialNoteItem["category"]>("High Priority");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Connected Students
  const [connectedStudents, setConnectedStudents] = useState<ConnectedStudentItem[]>([]);

  // Interactive Calendar state
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Timer for live time ticking (updates ongoing status automatically)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Listen to Firestore shared schedule
  useEffect(() => {
    const unsub = subscribeSchedules((list) => {
      setSchedules(list);
    });
    return () => unsub();
  }, []);

  const todayFullFormatted = useMemo(() => {
    return currentTime.toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [currentTime]);

  const currentDayShort = useMemo(() => {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][currentTime.getDay()];
  }, [currentTime]);

  const displayedSchedules = useMemo(() => {
    if (schedules.length === 0) return [];

    if (scheduleTab === "Today") {
      const todayClasses = schedules.filter((s) => s.day === currentDayShort);
      if (todayClasses.length > 0) return todayClasses;
      return schedules.slice(0, 5);
    }
    if (scheduleTab === "Upcoming") {
      const upcoming = schedules.filter(
        (s) => getDynamicClassStatus(s, currentTime) === "Upcoming"
      );
      return upcoming.length > 0 ? upcoming : schedules.slice(0, 5);
    }
    return schedules;
  }, [schedules, scheduleTab, currentDayShort, currentTime]);

  const calendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const monthNameYear = calendarDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const currentDayNum = today.getDate();

    return {
      monthNameYear,
      firstDayOfWeek,
      totalDays,
      isCurrentMonth,
      currentDayNum,
    };
  }, [calendarDate]);

  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Identity Listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const parsed = parseNameAndRoleFromEmail(user.email);
    setTeacherName(user.displayName || parsed.fullName || "Dr. Rajesh Kumar");

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.fullName || d.name) setTeacherName(d.fullName || d.name);
          if (d.department) setTeacherDept(`Faculty - ${d.department}`);
        }
      },
      (err) => {
        if (err?.code !== "permission-denied") {
          console.warn("Teacher profile error:", err?.message);
        }
      }
    );

    return () => unsub();
  }, []);

  // Real-time Special Notes
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "specialNotes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const loaded: SpecialNoteItem[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          setSpecialNotes(loaded);
        }
      },
      (err) => {
        if (err?.code !== "permission-denied") {
          console.warn("Special notes listener error:", err?.message);
        }
      }
    );
    return () => unsub();
  }, []);

  // Connected Students Listener
  useEffect(() => {
    seedDefaultConnectedStudents();
    const unsub = listenTeacherConnectedStudents("TEACH-CSE-101", (list) => {
      setConnectedStudents(list);
    });
    return () => unsub();
  }, []);

  // Handle Ask AI
  const handleAskAI = async (queryText?: string) => {
    const textToSend = (queryText || aiInput).trim();
    if (!textToSend || aiLoading) return;

    const userMsg = { role: "user" as const, text: textToSend };
    setAiChatMessages((prev) => [...prev, userMsg]);
    setAiInput("");
    setAiLoading(true);

    try {
      const prompt = `You are the Campusly Faculty AI Teaching Companion assisting Professor ${teacherName} (${teacherDept}). Answer helpfully, precisely, and concisely:\n\n${textToSend}`;
      const reply = await askCampuslyAI(prompt);
      setAiChatMessages((prev) => [...prev, { role: "assistant" as const, text: reply }]);
    } catch {
      setAiChatMessages((prev) => [
        ...prev,
        { role: "assistant" as const, text: "⚠️ Unable to connect to AI Assistant right now. Please try again." },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Handle Add Special Note
  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      Alert.alert("Required", "Please provide a note title and details.");
      return;
    }
    setSavingNote(true);
    try {
      const payload = {
        title: newNoteTitle.trim(),
        subject: newNoteSubject,
        category: newNoteCategory,
        priority: newNoteCategory === "High Priority" ? "High" : "Normal",
        content: newNoteContent.trim(),
        targetClass: "CSE - 4th Sem",
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        teacherName,
        teacherId: "TEACH-CSE-101",
        authorRole: "Faculty",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, "specialNotes"), payload);
      setNewNoteTitle("");
      setNewNoteContent("");
      setAddNoteModalOpen(false);
      Alert.alert("Published", "Special note is now live across student dashboards!");
    } catch (e: any) {
      console.warn("Save note error:", e);
      setAddNoteModalOpen(false);
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#0B132B" : "#F4F7FC" }]}>
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR (DARK NAVY LIKE IMAGE) */}
      {/* ======================================================== */}
      {(isDesktop || mobileMenuOpen) && (
        <View style={[styles.sidebar, !isDesktop && styles.mobileSidebar]}>
          {/* Logo & Subtitle */}
          <View style={styles.brandRow}>
            <View style={styles.brandIconBox}>
              <Ionicons name="school" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>Campusly</Text>
              <Text style={styles.brandSubtitle}>Learn • Teach • Grow</Text>
            </View>
            {!isDesktop && (
              <TouchableOpacity onPress={() => setMobileMenuOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Nav Items */}
          <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = item.id === "home";
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                  onPress={() => {
                    setMobileMenuOpen(false);
                    router.push(item.route as any);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={17}
                    color={isActive ? "#FFFFFF" : "#94A3B8"}
                  />
                  <Text style={[styles.sidebarItemText, isActive && styles.sidebarItemTextActive]}>
                    {item.label}
                  </Text>
                  {Boolean(item.badge) && (
                    <View style={styles.redBadge}>
                      <Text style={styles.redBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Bottom Sidebar Cards (Like Image) */}
          <View style={styles.sidebarBottom}>
            {/* Card 1: Better Education Together */}
            <View style={styles.sidebarPromoCard}>
              <View style={styles.promoAvatarRow}>
                <View style={styles.promoAvatar}>
                  <Ionicons name="person" size={16} color="#FFFFFF" />
                </View>
                <Ionicons name="sparkles" size={14} color="#FBBF24" />
              </View>
              <Text style={styles.promoTitle}>Better Education Together</Text>
              <Text style={styles.promoSubtitle}>“Teach, guide, make a difference.”</Text>
            </View>

            {/* Card 2: Today's Quote */}
            <View style={styles.quoteCard}>
              <View style={styles.quoteCardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons name="bulb-outline" size={13} color="#FBBF24" />
                  <Text style={styles.quoteTitle}>Today's Quote</Text>
                </View>
                <Ionicons name="heart-outline" size={13} color="#F43F5E" />
              </View>
              <Text style={styles.quoteText}>“A good teacher can change a student's future.”</Text>
            </View>
          </View>
        </View>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE */}
      {/* ======================================================== */}
      <View style={styles.mainCanvas}>
        {/* TOP BAR */}
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderBottomColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <View style={styles.topBarLeft}>
            {!isDesktop && (
              <TouchableOpacity onPress={() => setMobileMenuOpen(true)} style={{ padding: 4 }}>
                <Ionicons name="menu" size={22} color={colors.text} />
              </TouchableOpacity>
            )}

            {/* Search Input */}
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              <Ionicons name="search-outline" size={15} color="#94A3B8" />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search classes, students, resources..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <View style={styles.topBarRight}>
            <UniversalRoleControls compact />

            {/* Notification Bell with Badge 3 */}
            <TouchableOpacity style={styles.bellBtn} onPress={() => {}}>
              <NotificationBellModal iconColor={colors.textSecondary} badgeBgColor="#EF4444" />
            </TouchableOpacity>

            {/* User Profile Pill */}
            <TouchableOpacity
              style={[
                styles.userPill,
                {
                  backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
              onPress={() => router.push("/teacher/profile")}
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                }}
                style={styles.avatarImg}
              />
              <View>
                <Text style={[styles.userNameText, { color: colors.text }]}>{teacherName}</Text>
                <Text style={styles.userDeptText}>{teacherDept}</Text>
              </View>
              <Ionicons name="chevron-down" size={13} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENT SCROLL */}
        <ScrollView style={styles.scrollCanvas} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ======================================================== */}
          {/* HERO GREETING BANNER (EXACT LIKE IMAGE) */}
          {/* ======================================================== */}
          <View style={[styles.heroBanner, { borderColor: isDark ? "#1E3A8A" : "#BAE6FD" }]}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroTitle}>
                Good Morning, {teacherName}! ☀️
              </Text>
              <Text style={styles.heroSubTitle}>Teach today, build tomorrow.</Text>
              <Text style={styles.heroDescription}>
                Manage your classes, track student progress and create a better learning experience.
              </Text>
            </View>

            {/* Floating Quote Box on the right */}
            <View style={styles.heroQuoteBox}>
              <Text style={styles.heroQuoteText}>
                “Education is the most powerful weapon which you can use to change the world.”
              </Text>
              <Text style={styles.heroQuoteAuthor}>– Nelson Mandela</Text>
            </View>
          </View>

          {/* ======================================================== */}
          {/* 4 TOP STAT CARDS (ROW) */}
          {/* ======================================================== */}
          <View style={styles.statCardsRow}>
            {/* 1. Total Classes */}
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: isDark ? "#1E293B" : "#FAF5FF", borderColor: "#EDE9FE" }]}
              onPress={() => router.push("/teacher/classes")}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconBox, { backgroundColor: "#F3E8FF" }]}>
                <Ionicons name="grid-outline" size={16} color="#7C3AED" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.statLabel}>Total Classes</Text>
                <Text style={[styles.statNumber, { color: colors.text }]}>6</Text>
                <Text style={styles.statSub}>This Semester</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
            </TouchableOpacity>

            {/* 2. Total Students */}
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: isDark ? "#1E293B" : "#ECFDF5", borderColor: "#D1FAE5" }]}
              onPress={() => router.push("/teacher/students")}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconBox, { backgroundColor: "#D1FAE5" }]}>
                <Ionicons name="people-outline" size={16} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.statLabel}>Total Students</Text>
                <Text style={[styles.statNumber, { color: colors.text }]}>186</Text>
                <Text style={styles.statSub}>Enrolled in Your Classes</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
            </TouchableOpacity>

            {/* 3. Assignments */}
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: isDark ? "#1E293B" : "#FFF7ED", borderColor: "#FFEDD5" }]}
              onPress={() => router.push("/teacher/assignments")}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconBox, { backgroundColor: "#FFEDD5" }]}>
                <Ionicons name="document-text-outline" size={16} color="#EA580C" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.statLabel}>Assignments</Text>
                <Text style={[styles.statNumber, { color: colors.text }]}>5</Text>
                <Text style={styles.statSub}>Pending Review</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
            </TouchableOpacity>

            {/* 4. Exams */}
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: isDark ? "#1E293B" : "#FFF1F2", borderColor: "#FFE4E6" }]}
              onPress={() => router.push("/teacher/exams")}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconBox, { backgroundColor: "#FFE4E6" }]}>
                <Ionicons name="school-outline" size={16} color="#E11D48" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.statLabel}>Exams</Text>
                <Text style={[styles.statNumber, { color: colors.text }]}>3</Text>
                <Text style={styles.statSub}>Upcoming</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* ======================================================== */}
          {/* THREE-COLUMN / TWO-COLUMN MAIN BODY GRID */}
          {/* ======================================================== */}
          <View style={[styles.dashboardGrid, !isDesktop && styles.dashboardGridStacked]}>
            {/* ========================================== */}
            {/* LEFT / CENTER BODY (Schedule, Recent Classes, Overview, Notes) */}
            {/* ========================================== */}
            <View style={styles.gridLeftCenter}>
              <View style={[styles.twoInnerCols, !isDesktop && styles.twoInnerColsStacked]}>
                {/* SUB-COLUMN 1: TODAY'S SCHEDULE & RECENT CLASSES */}
                <View style={styles.innerCol}>
                  {/* CARD 1: TODAY'S SCHEDULE */}
                  <View style={[styles.whiteCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="calendar-outline" size={16} color="#2563EB" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Today's Schedule</Text>
                      </View>
                      <TouchableOpacity onPress={() => router.push("/teacher/schedule")} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Text style={styles.dateHeaderLink}>{todayFullFormatted}</Text>
                        <Ionicons name="chevron-forward" size={12} color="#64748B" />
                      </TouchableOpacity>
                    </View>

                    {/* Filter Pills */}
                    <View style={styles.filterPillsRow}>
                      {(["Today", "This Week", "Upcoming"] as const).map((tab) => (
                        <TouchableOpacity
                          key={tab}
                          style={[styles.pillBtn, scheduleTab === tab && styles.pillBtnActive]}
                          onPress={() => setScheduleTab(tab)}
                        >
                          <Text style={[styles.pillBtnText, scheduleTab === tab && styles.pillBtnTextActive]}>
                            {tab}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Schedule List */}
                    <View style={{ gap: 8 }}>
                      {displayedSchedules.length === 0 ? (
                        <View style={{ alignItems: "center", paddingVertical: 18 }}>
                          <Ionicons name="calendar-outline" size={28} color="#94A3B8" />
                          <Text style={{ fontSize: 12, color: colors.text, marginTop: 6, fontWeight: "700" }}>
                            No classes scheduled for {scheduleTab.toLowerCase()}
                          </Text>
                          <TouchableOpacity
                            style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 4 }}
                            onPress={() => router.push("/teacher/schedule")}
                          >
                            <Ionicons name="add-circle" size={14} color="#2563EB" />
                            <Text style={{ fontSize: 11, color: "#2563EB", fontWeight: "700" }}>
                              + Add Class Schedule
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        displayedSchedules.map((item: ScheduleEntry) => {
                          const status: ClassStatus = getDynamicClassStatus(item, currentTime);
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[
                                styles.scheduleItemRow,
                                {
                                  backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                                  borderColor: status === "Ongoing" ? "#10B981" : isDark ? "#334155" : "#E2E8F0",
                                },
                                status === "Ongoing" && {
                                  borderLeftWidth: 3,
                                  borderLeftColor: "#10B981",
                                },
                              ]}
                              onPress={() => router.push("/teacher/schedule")}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.itemIconCircle, { backgroundColor: item.bg || "#EFF6FF" }]}>
                                <Ionicons name={(item.icon as any) || "book-outline"} size={14} color={item.color || "#2563EB"} />
                              </View>

                              <View style={{ width: 85 }}>
                                <Text style={[styles.timeMain, { color: colors.text }]}>{item.startTime || item.timeRange}</Text>
                                <Text style={{ fontSize: 9.5, color: "#64748B" }}>{item.day}</Text>
                              </View>

                              <View style={{ flex: 1, paddingHorizontal: 4 }}>
                                <Text style={[styles.scheduleItemTitle, { color: colors.text }]} numberOfLines={1}>
                                  {item.subject}
                                </Text>
                                <Text style={styles.scheduleItemSub}>{item.room}</Text>
                              </View>

                              <View
                                style={[
                                  styles.statusBadge,
                                  status === "Ongoing"
                                    ? { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }
                                    : status === "Upcoming"
                                    ? { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }
                                    : { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusBadgeText,
                                    {
                                      color:
                                        status === "Ongoing"
                                          ? "#059669"
                                          : status === "Upcoming"
                                          ? "#2563EB"
                                          : "#64748B",
                                    },
                                  ]}
                                >
                                  {status === "Ongoing"
                                    ? "● Ongoing"
                                    : status === "Upcoming"
                                    ? "⏱ Upcoming"
                                    : "✓ Done"}
                                </Text>
                              </View>

                              <Ionicons name="chevron-forward" size={13} color="#94A3B8" />
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  </View>

                  {/* CARD 2: RECENT CLASSES */}
                  <View style={[styles.whiteCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0", marginTop: 12 }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="time-outline" size={16} color="#2563EB" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Classes</Text>
                      </View>
                      <TouchableOpacity onPress={() => router.push("/teacher/classes")}>
                        <Text style={styles.viewAllBlue}>View All &gt;</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ gap: 7 }}>
                      {RECENT_CLASSES.map((rc) => (
                        <View
                          key={rc.id}
                          style={[
                            styles.recentClassRow,
                            {
                              backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                              borderColor: isDark ? "#334155" : "#E2E8F0",
                            },
                          ]}
                        >
                          <View style={[styles.itemIconCircle, { backgroundColor: rc.iconBg }]}>
                            {rc.icon === "</>" ? (
                              <Text style={{ fontSize: 10.5, fontWeight: "900", color: rc.iconColor }}>&lt;/&gt;</Text>
                            ) : (
                              <Ionicons name={rc.icon as any} size={14} color={rc.iconColor} />
                            )}
                          </View>

                          <View style={{ flex: 1, paddingHorizontal: 6 }}>
                            <Text style={[styles.recentClassName, { color: colors.text }]}>{rc.title}</Text>
                            <Text style={styles.recentClassMeta}>{rc.classTag}</Text>
                          </View>

                          <Text style={styles.recentClassDate}>{rc.date}</Text>

                          <TouchableOpacity
                            style={styles.viewDetailsBtn}
                            onPress={() => router.push("/teacher/classes")}
                          >
                            <Text style={styles.viewDetailsBtnText}>View Details</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* SUB-COLUMN 2: CLASS OVERVIEW & SPECIAL NOTES */}
                <View style={styles.innerCol}>
                  {/* CARD 3: CLASS OVERVIEW (DONUT CHART & LEGEND) */}
                  <View style={[styles.whiteCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="bar-chart-outline" size={16} color="#2563EB" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Class Overview</Text>
                      </View>
                      <View style={styles.dropdownPill}>
                        <Text style={styles.dropdownPillText}>This Semester</Text>
                        <Ionicons name="chevron-down" size={11} color="#64748B" />
                      </View>
                    </View>

                    {/* Donut Chart representation & Legend */}
                    <View style={styles.donutOverviewRow}>
                      {/* Donut circle */}
                      <View style={styles.donutContainer}>
                        <View style={styles.donutRing}>
                          <View style={[styles.donutSegment, { borderColor: "#2563EB", borderTopColor: "#7C3AED", borderRightColor: "#EA580C" }]} />
                          <View style={[styles.donutHole, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
                            <Text style={[styles.donutNumber, { color: colors.text }]}>6</Text>
                            <Text style={styles.donutLabel}>Classes</Text>
                          </View>
                        </View>
                      </View>

                      {/* Legend list */}
                      <View style={styles.legendCol}>
                        {CLASS_OVERVIEW_LIST.map((c) => (
                          <View key={c.name} style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                            <Text style={[styles.legendText, { color: colors.text }]} numberOfLines={1}>
                              {c.name}
                            </Text>
                            <Text style={styles.legendCount}>{c.count}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* CARD 4: SPECIAL NOTES (EXACT LIKE IMAGE) */}
                  <View style={[styles.whiteCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0", marginTop: 12 }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="reader-outline" size={16} color="#0284C7" />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Special Notes</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addNoteBtnBlue}
                        onPress={() => setAddNoteModalOpen(true)}
                      >
                        <Ionicons name="add" size={13} color="#FFFFFF" />
                        <Text style={styles.addNoteBtnBlueText}>+ Add Note</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Notes items */}
                    <View style={{ gap: 8 }}>
                      {specialNotes.slice(0, 4).map((note) => {
                        const isHighPriority = note.category === "High Priority" || note.priority === "High";
                        const isReminder = note.category === "Reminder";
                        const isInfo = note.category === "Info";

                        return (
                          <View
                            key={note.id}
                            style={[
                              styles.noteRowCard,
                              {
                                backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                                borderColor: isDark ? "#334155" : "#E2E8F0",
                              },
                            ]}
                          >
                            <View style={[styles.noteIconCircle, { backgroundColor: isHighPriority ? "#FFF7ED" : isReminder ? "#EFF6FF" : "#F5F3FF" }]}>
                              <Ionicons
                                name="document-text-outline"
                                size={14}
                                color={isHighPriority ? "#EA580C" : isReminder ? "#2563EB" : "#7C3AED"}
                              />
                            </View>

                            <View style={{ flex: 1, paddingHorizontal: 6 }}>
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                <Text style={[styles.noteRowTitle, { color: colors.text }]} numberOfLines={1}>
                                  {note.title}
                                </Text>
                                <View
                                  style={[
                                    styles.noteTagPill,
                                    isHighPriority
                                      ? { backgroundColor: "#FFEDD5" }
                                      : isReminder
                                      ? { backgroundColor: "#DBEAFE" }
                                      : isInfo
                                      ? { backgroundColor: "#EDE9FE" }
                                      : { backgroundColor: "#D1FAE5" },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.noteTagPillText,
                                      {
                                        color: isHighPriority
                                          ? "#C2410C"
                                          : isReminder
                                          ? "#1E40AF"
                                          : isInfo
                                          ? "#6D28D9"
                                          : "#065F46",
                                      },
                                    ]}
                                  >
                                    {note.category}
                                  </Text>
                                </View>
                              </View>

                              <Text style={styles.noteRowSnippet} numberOfLines={2}>
                                {note.content}
                              </Text>

                              <Text style={styles.noteRowDate}>{note.date || "Today"}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    <TouchableOpacity
                      onPress={() => router.push("/teacher/special-notes")}
                      style={styles.viewAllNotesFooter}
                    >
                      <Text style={styles.viewAllNotesText}>View All Notes &gt;</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* ========================================== */}
            {/* RIGHT SIDEBAR WIDGETS (AI, ACTIONS, CALENDAR) */}
            {/* ========================================== */}
            <View style={styles.gridRightWidgets}>
              {/* WIDGET 1: AI ASSISTANT (TOP RIGHT) */}
              <View style={[styles.whiteCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" }]}>
                {/* Header */}
                <View style={styles.aiHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={styles.robotIconBox}>
                      <Ionicons name="hardware-chip-outline" size={17} color="#2563EB" />
                    </View>
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>AI Assistant</Text>
                      <Text style={styles.aiSubText}>Your smart teaching companion</Text>
                    </View>
                  </View>
                  <View style={styles.onlineBadge}>
                    <View style={styles.greenDot} />
                    <Text style={styles.onlineText}>Online</Text>
                  </View>
                </View>

                {/* AI Chat Bubble */}
                <View style={[styles.aiBubble, { backgroundColor: isDark ? "#0F172A" : "#EFF6FF" }]}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 7 }}>
                    <View style={styles.bubbleRobotIcon}>
                      <Ionicons name="chatbubble-ellipses" size={12} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bubbleMsgText, { color: isDark ? "#E2E8F0" : "#1E3A8A" }]}>
                        {aiChatMessages[aiChatMessages.length - 1]?.text}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Suggestion Chips */}
                <View style={{ gap: 5, marginTop: 10 }}>
                  {AI_SUGGESTIONS.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.aiSuggestionRow,
                        {
                          backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                          borderColor: isDark ? "#334155" : "#E2E8F0",
                        },
                      ]}
                      onPress={() => handleAskAI(item)}
                    >
                      <Text style={[styles.aiSuggestionText, { color: colors.text }]} numberOfLines={1}>
                        {item}
                      </Text>
                      <Ionicons name="arrow-forward" size={11} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Input Bar with Arrow Button */}
                <View
                  style={[
                    styles.aiInputRow,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.aiInputField, { color: colors.text }]}
                    placeholder="Ask anything..."
                    placeholderTextColor="#94A3B8"
                    value={aiInput}
                    onChangeText={setAiInput}
                    onSubmitEditing={() => handleAskAI()}
                  />
                  <TouchableOpacity
                    style={[styles.aiSubmitArrowBtn, (!aiInput.trim() && !aiLoading) && { opacity: 0.6 }]}
                    onPress={() => handleAskAI()}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="arrow-up" size={14} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* WIDGET 2: QUICK ACTIONS (GRID) */}
              <View style={[styles.whiteCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0", marginTop: 12 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Ionicons name="flash-outline" size={16} color="#0284C7" />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Actions</Text>
                </View>

                <View style={styles.quickActions2Col}>
                  {/* Create Assignment */}
                  <TouchableOpacity
                    style={[styles.actionTile, { backgroundColor: isDark ? "#0F172A" : "#EFF6FF", borderColor: "#DBEAFE" }]}
                    onPress={() => router.push("/teacher/assignments")}
                  >
                    <Ionicons name="document-text-outline" size={16} color="#2563EB" />
                    <Text style={[styles.actionTileText, { color: colors.text }]}>Create Assignment</Text>
                  </TouchableOpacity>

                  {/* Add Exam */}
                  <TouchableOpacity
                    style={[styles.actionTile, { backgroundColor: isDark ? "#0F172A" : "#FFF1F2", borderColor: "#FFE4E6" }]}
                    onPress={() => router.push("/teacher/exams")}
                  >
                    <Ionicons name="school-outline" size={16} color="#E11D48" />
                    <Text style={[styles.actionTileText, { color: colors.text }]}>Add Exam</Text>
                  </TouchableOpacity>

                  {/* Upload Resources */}
                  <TouchableOpacity
                    style={[styles.actionTile, { backgroundColor: isDark ? "#0F172A" : "#F0FDFA", borderColor: "#CCFBF1" }]}
                    onPress={() => router.push("/teacher/resources")}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color="#0D9488" />
                    <Text style={[styles.actionTileText, { color: colors.text }]}>Upload Resources</Text>
                  </TouchableOpacity>

                  {/* Add Special Note */}
                  <TouchableOpacity
                    style={[styles.actionTile, { backgroundColor: isDark ? "#0F172A" : "#FFF7ED", borderColor: "#FFEDD5" }]}
                    onPress={() => setAddNoteModalOpen(true)}
                  >
                    <Ionicons name="reader-outline" size={16} color="#EA580C" />
                    <Text style={[styles.actionTileText, { color: colors.text }]}>Add Special Note</Text>
                  </TouchableOpacity>

                  {/* View Students */}
                  <TouchableOpacity
                    style={[styles.actionTile, { backgroundColor: isDark ? "#0F172A" : "#ECFDF5", borderColor: "#D1FAE5" }]}
                    onPress={() => router.push("/teacher/students")}
                  >
                    <Ionicons name="people-outline" size={16} color="#059669" />
                    <Text style={[styles.actionTileText, { color: colors.text }]}>View Students</Text>
                  </TouchableOpacity>

                  {/* Manage Schedule */}
                  <TouchableOpacity
                    style={[styles.actionTile, { backgroundColor: isDark ? "#0F172A" : "#FAF5FF", borderColor: "#EDE9FE" }]}
                    onPress={() => router.push("/teacher/schedule")}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#7C3AED" />
                    <Text style={[styles.actionTileText, { color: colors.text }]}>Manage Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* WIDGET 3: DYNAMIC CALENDAR */}
              <View style={[styles.whiteCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0", marginTop: 12 }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="calendar-outline" size={15} color="#2563EB" />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Calendar</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <TouchableOpacity style={styles.calNavArrow} onPress={handlePrevMonth}>
                      <Ionicons name="chevron-back" size={12} color="#64748B" />
                    </TouchableOpacity>
                    <Text style={styles.calMonthText}>{calendarData.monthNameYear}</Text>
                    <TouchableOpacity style={styles.calNavArrow} onPress={handleNextMonth}>
                      <Ionicons name="chevron-forward" size={12} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Day Labels */}
                <View style={styles.calWeekRow}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <Text key={d} style={styles.calWeekLabel}>{d}</Text>
                  ))}
                </View>

                {/* Calendar Days Matrix */}
                <View style={styles.calDaysMatrix}>
                  {/* Dynamic empty offsets for first day of the current month */}
                  {Array.from({ length: calendarData.firstDayOfWeek }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.calDayCell} />
                  ))}

                  {Array.from({ length: calendarData.totalDays }, (_, i) => i + 1).map((day) => {
                    const isSelected = day === selectedDay;
                    const isToday = calendarData.isCurrentMonth && day === calendarData.currentDayNum;
                    const hasClass = [1, 2, 3, 4, 5].includes((calendarData.firstDayOfWeek + day - 1) % 7);

                    return (
                      <TouchableOpacity
                        key={day}
                        style={styles.calDayCell}
                        onPress={() => setSelectedDay(day)}
                      >
                        <View
                          style={[
                            styles.calDayNumBox,
                            isSelected && styles.calDayNumBoxActive,
                            isToday && !isSelected && { borderWidth: 1.5, borderColor: "#2563EB" },
                          ]}
                        >
                          <Text style={[styles.calDayNum, isSelected && styles.calDayNumActive, { color: isSelected ? "#FFFFFF" : isToday ? "#2563EB" : colors.text }]}>
                            {day}
                          </Text>
                        </View>
                        {hasClass && !isSelected && <View style={styles.calClassDot} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* ======================================================== */}
      {/* QUICK ADD SPECIAL NOTE MODAL */}
      {/* ======================================================== */}
      <Modal visible={addNoteModalOpen} transparent animationType="fade" onRequestClose={() => setAddNoteModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddNoteModalOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="reader" size={17} color="#2563EB" />
                <Text style={[styles.modalTitleText, { color: colors.text }]}>Add Special Note</Text>
              </View>
              <TouchableOpacity onPress={() => setAddNoteModalOpen(false)}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.modalInputLabel}>Note Title</Text>
              <TextInput
                style={[styles.modalTextInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Data Structures – Unit 3 Important Questions"
                placeholderTextColor="#94A3B8"
                value={newNoteTitle}
                onChangeText={setNewNoteTitle}
              />

              <Text style={styles.modalInputLabel}>Subject</Text>
              <TextInput
                style={[styles.modalTextInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Subject name"
                placeholderTextColor="#94A3B8"
                value={newNoteSubject}
                onChangeText={setNewNoteSubject}
              />

              <Text style={styles.modalInputLabel}>Category</Text>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {(["High Priority", "Important", "Reminder", "Info"] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catPickPill, newNoteCategory === cat && styles.catPickPillActive]}
                    onPress={() => setNewNoteCategory(cat)}
                  >
                    <Text style={[styles.catPickText, newNoteCategory === cat && styles.catPickTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalInputLabel}>Content</Text>
              <TextInput
                style={[styles.modalTextInput, { color: colors.text, borderColor: colors.border, height: 90, textAlignVertical: "top" }]}
                placeholder="Enter important notes, question lists or revision reminders..."
                placeholderTextColor="#94A3B8"
                value={newNoteContent}
                onChangeText={setNewNoteContent}
                multiline
              />
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddNoteModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleCreateNote} disabled={savingNote}>
                {savingNote ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Publish Note</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },

  // 1. SIDEBAR
  sidebar: {
    width: 215,
    backgroundColor: "#0A192F",
    display: "flex",
    flexDirection: "column",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
  },
  mobileSidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
    width: 235,
    elevation: 25,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 8,
  },
  brandIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 9.5,
    color: "#94A3B8",
    fontWeight: "500",
  },
  sidebarScroll: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    marginBottom: 2,
    gap: 8,
  },
  sidebarItemActive: {
    backgroundColor: "#2563EB",
  },
  sidebarItemText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#94A3B8",
    flex: 1,
  },
  sidebarItemTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  redBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  redBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sidebarBottom: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    gap: 6,
    marginBottom: 6,
  },
  sidebarPromoCard: {
    backgroundColor: "#13233D",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  promoAvatarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  promoAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  promoTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  promoSubtitle: {
    fontSize: 9,
    color: "#94A3B8",
    fontStyle: "italic",
    marginTop: 1,
  },
  quoteCard: {
    backgroundColor: "#0D1E38",
    borderRadius: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  quoteCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  quoteTitle: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  quoteText: {
    fontSize: 9,
    color: "#94A3B8",
    lineHeight: 12,
  },

  // 2. TOP BAR
  mainCanvas: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: 280,
    flex: 1,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 11.5,
    padding: 0,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bellBtn: {
    padding: 3,
  },
  userPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 7,
    borderWidth: 1,
  },
  avatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  userNameText: {
    fontSize: 11,
    fontWeight: "700",
  },
  userDeptText: {
    fontSize: 9,
    color: "#64748B",
  },

  // 3. SCROLL CONTENT
  scrollCanvas: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 24,
  },

  // 4. HERO BANNER
  heroBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  heroLeft: {
    flex: 1,
    minWidth: 260,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  heroSubTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 2,
  },
  heroDescription: {
    fontSize: 10.5,
    color: "#475569",
    marginTop: 2,
    maxWidth: 440,
  },
  heroQuoteBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    maxWidth: 240,
    alignSelf: "flex-end",
  },
  heroQuoteText: {
    fontSize: 9.5,
    color: "#334155",
    fontStyle: "italic",
    lineHeight: 13,
  },
  heroQuoteAuthor: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 3,
    textAlign: "right",
  },

  // 5. STAT CARDS ROW
  statCardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 130,
    flexDirection: "row",
    alignItems: "center",
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  statIconBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "900",
    marginVertical: 1,
  },
  statSub: {
    fontSize: 9,
    color: "#9CA3AF",
  },

  // 6. MAIN GRID LAYOUT
  dashboardGrid: {
    flexDirection: "row",
    gap: 10,
  },
  dashboardGridStacked: {
    flexDirection: "column",
  },
  gridLeftCenter: {
    flex: 2.3,
  },
  twoInnerCols: {
    flexDirection: "row",
    gap: 10,
  },
  twoInnerColsStacked: {
    flexDirection: "column",
  },
  innerCol: {
    flex: 1,
  },
  gridRightWidgets: {
    flex: 1,
    minWidth: 260,
  },

  // REUSABLE CARD
  whiteCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  dateHeaderLink: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  viewAllBlue: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#2563EB",
  },

  // SCHEDULE CARD
  filterPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  pillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: "#F1F5F9",
  },
  pillBtnActive: {
    backgroundColor: "#2563EB",
  },
  pillBtnText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  pillBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scheduleItemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 7,
    borderWidth: 1,
  },
  itemIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timeMain: {
    fontSize: 9.5,
    fontWeight: "700",
    marginLeft: 6,
  },
  scheduleItemTitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  scheduleItemSub: {
    fontSize: 9,
    color: "#64748B",
  },
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 4,
  },
  statusBadgeText: {
    fontSize: 8.5,
    fontWeight: "700",
  },

  // RECENT CLASSES
  recentClassRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 7,
    borderWidth: 1,
  },
  recentClassName: {
    fontSize: 11,
    fontWeight: "700",
  },
  recentClassMeta: {
    fontSize: 9,
    color: "#64748B",
  },
  recentClassDate: {
    fontSize: 9,
    color: "#94A3B8",
    marginRight: 6,
  },
  viewDetailsBtn: {
    backgroundColor: "#EFF6FF",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  viewDetailsBtnText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#2563EB",
  },

  // DONUT OVERVIEW
  dropdownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  dropdownPillText: {
    fontSize: 9.5,
    color: "#64748B",
    fontWeight: "600",
  },
  donutOverviewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 12,
  },
  donutContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 90,
    height: 90,
  },
  donutRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  donutSegment: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 8,
  },
  donutHole: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  donutNumber: {
    fontSize: 16,
    fontWeight: "900",
  },
  donutLabel: {
    fontSize: 8.5,
    color: "#64748B",
  },
  legendCol: {
    flex: 1,
    gap: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 10,
    flex: 1,
  },
  legendCount: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },

  // SPECIAL NOTES
  addNoteBtnBlue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#2563EB",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  addNoteBtnBlueText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  noteRowCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 6,
    borderRadius: 7,
    borderWidth: 1,
  },
  noteIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  noteRowTitle: {
    fontSize: 10.5,
    fontWeight: "700",
    flex: 1,
  },
  noteTagPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  noteTagPillText: {
    fontSize: 8.5,
    fontWeight: "700",
  },
  noteRowSnippet: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 1,
    lineHeight: 13,
  },
  noteRowDate: {
    fontSize: 8.5,
    color: "#94A3B8",
    marginTop: 2,
  },
  viewAllNotesFooter: {
    alignItems: "center",
    paddingTop: 8,
  },
  viewAllNotesText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },

  // AI ASSISTANT WIDGET
  aiHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  robotIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  aiSubText: {
    fontSize: 9,
    color: "#64748B",
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#10B981",
  },
  onlineText: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#059669",
  },
  aiBubble: {
    borderRadius: 8,
    padding: 7,
  },
  bubbleRobotIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleMsgText: {
    fontSize: 10,
    lineHeight: 14,
  },
  aiSuggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiSuggestionText: {
    fontSize: 9.5,
    fontWeight: "500",
    flex: 1,
  },
  aiInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 8,
    gap: 4,
  },
  aiInputField: {
    flex: 1,
    fontSize: 10.5,
    paddingVertical: 3,
  },
  aiSubmitArrowBtn: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },

  // QUICK ACTIONS GRID
  quickActions2Col: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  actionTile: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 7,
    borderRadius: 7,
    borderWidth: 1,
  },
  actionTileText: {
    fontSize: 9.5,
    fontWeight: "700",
    flex: 1,
  },

  // CALENDAR
  calNavArrow: {
    padding: 2,
  },
  calMonthText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  calWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  calWeekLabel: {
    width: 24,
    textAlign: "center",
    fontSize: 8.5,
    fontWeight: "700",
    color: "#94A3B8",
  },
  calDaysMatrix: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  calDayCell: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  calDayNumBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayNumBoxActive: {
    backgroundColor: "#2563EB",
  },
  calDayNum: {
    fontSize: 9.5,
    fontWeight: "600",
  },
  calDayNumActive: {
    fontWeight: "800",
  },
  calClassDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#2563EB",
    marginTop: 1,
  },

  // MODAL
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 10,
    padding: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitleText: {
    fontSize: 13,
    fontWeight: "800",
  },
  modalInputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 3,
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    marginBottom: 8,
  },
  catPickPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: "#F1F5F9",
  },
  catPickPillActive: {
    backgroundColor: "#2563EB",
  },
  catPickText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
  },
  catPickTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  modalCancelText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
  },
  modalSaveBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  modalSaveText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
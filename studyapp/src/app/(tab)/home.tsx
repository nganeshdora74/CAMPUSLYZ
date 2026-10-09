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
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import LanguageToggle from "../../components/LanguageToggle";
import UniversalRoleControls from "../../components/UniversalRoleControls";
import OfflineBanner from "../../components/OfflineBanner";
import NotificationBellModal from "../../components/NotificationBellModal";
import { parseNameAndRoleFromEmail } from "../../utils/userEmailParser";
import { subscribeMessMenu } from "../../services/messUnifiedService";

type QuickAccessItem = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  route: string;
};

const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    id: "branchSelection",
    title: "Branch & Subjects",
    description: "Choose branch, core & optional elective subjects",
    icon: "git-branch",
    iconColor: "#2563EB",
    iconBg: "#EFF6FF",
    route: "/branch-selection",
  },
  {
    id: "fees",
    title: "Fees",
    description: "View your fee details and payment status",
    icon: "wallet",
    iconColor: "#7C3AED",
    iconBg: "#EDE9FE",
    route: "/fees",
  },
  {
    id: "hostel",
    title: "Hostel",
    description: "Manage hostel related services",
    icon: "business",
    iconColor: "#0284C7",
    iconBg: "#E0F2FE",
    route: "/hostel",
  },
  {
    id: "mess",
    title: "Mess",
    description: "View mess menu and updates",
    icon: "restaurant",
    iconColor: "#16A34A",
    iconBg: "#DCFCE7",
    route: "/mess",
  },
  {
    id: "notice",
    title: "Notice",
    description: "Latest notices and announcements",
    icon: "document-text",
    iconColor: "#EA580C",
    iconBg: "#FFEDD5",
    route: "/notices",
  },
  {
    id: "report",
    title: "Report",
    description: "View your reports and history",
    icon: "bar-chart",
    iconColor: "#E11D48",
    iconBg: "#FFE4E6",
    route: "/reports",
  },
  {
    id: "faculty",
    title: "Faculty",
    description: "Know about faculty and their details",
    icon: "people",
    iconColor: "#4F46E5",
    iconBg: "#EEF2FF",
    route: "/faculty",
  },
  {
    id: "aiAssistant",
    title: "AI Assistant",
    description: "24/7 study companion & instant answers",
    icon: "sparkles",
    iconColor: "#7C3AED",
    iconBg: "#EDE9FE",
    route: "/(tab)/ai-assistant",
  },
  {
    id: "request",
    title: "Request Center",
    description: "Unified hub: Bonafide, complaints, dues & leave",
    icon: "chatbubbles",
    iconColor: "#0891B2",
    iconBg: "#CFFAFE",
    route: "/requests",
  },
  {
    id: "gatePass",
    title: "Gate Pass",
    description: "Digital out/return pass with QR verification",
    icon: "exit",
    iconColor: "#4F46E5",
    iconBg: "#EEF2FF",
    route: "/gate-pass",
  },
  {
    id: "docRequest",
    title: "Certificates / Forms",
    description: "Bonafide, Transcripts & Academic forms",
    icon: "ribbon",
    iconColor: "#10B981",
    iconBg: "#D1FAE5",
    route: "/document-request",
  },
  {
    id: "more",
    title: "More",
    description: "Explore all modules, tools & campus services",
    icon: "grid",
    iconColor: "#6366F1",
    iconBg: "#EEF2FF",
    route: "/more",
  },
];

type ScheduleClass = {
  id: string;
  timeRange: string;
  subject: string;
  room: string;
  badgeBg: string;
  badgeColor: string;
};

const DEFAULT_SCHEDULE: ScheduleClass[] = [
  {
    id: "1",
    timeRange: "10:30 AM – 11:30 AM",
    subject: "Data Structures",
    room: "Room 204 • 2nd Floor",
    badgeBg: "#EEF2FF",
    badgeColor: "#4F46E5",
  },
  {
    id: "2",
    timeRange: "12:00 PM – 1:00 PM",
    subject: "DBMS",
    room: "Room 302 • 3rd Floor",
    badgeBg: "#E0F2FE",
    badgeColor: "#0284C7",
  },
  {
    id: "3",
    timeRange: "2:00 PM – 3:00 PM",
    subject: "Operating Systems",
    room: "Room 304 • 3rd Floor",
    badgeBg: "#DCFCE7",
    badgeColor: "#16A34A",
  },
];

type RecentNotice = {
  id: string;
  title: string;
  description: string;
  tag: string;
  tagBg: string;
  tagColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  date: string;
};

const DEFAULT_NOTICES: RecentNotice[] = [
  {
    id: "n1",
    title: "Semester Examination Schedule",
    description: "The end-semester examination schedule has been published...",
    tag: "Important",
    tagBg: "#FEE2E2",
    tagColor: "#EF4444",
    icon: "notifications",
    iconBg: "#FEE2E2",
    iconColor: "#EF4444",
    date: "18 Sep 2026",
  },
  {
    id: "n2",
    title: "Internal Assessment Marks",
    description: "Internal assessment marks will be submitted by Friday.",
    tag: "Academic",
    tagBg: "#E0F2FE",
    tagColor: "#0284C7",
    icon: "school",
    iconBg: "#E0F2FE",
    iconColor: "#0284C7",
    date: "17 Sep 2026",
  },
  {
    id: "n3",
    title: "College Holiday Notice",
    description: "Campus will remain closed on 20th September 2026.",
    tag: "General",
    tagBg: "#DCFCE7",
    tagColor: "#16A34A",
    icon: "calendar",
    iconBg: "#DCFCE7",
    iconColor: "#16A34A",
    date: "16 Sep 2026",
  },
];

export default function HomeScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [userName, setUserName] = useState("Tuffan");
  const [userInitial, setUserInitial] = useState("T");
  const [attendancePercentage, setAttendancePercentage] = useState("96%");
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [studyTarget, setStudyTarget] = useState(120);
  const [cgpa, setCgpa] = useState("8.2 / 10");
  const [feeStatus, setFeeStatus] = useState<string>("Paid");
  const [remainingFees, setRemainingFees] = useState<number>(0);
  const [hostelRoom, setHostelRoom] = useState<string>("A-204");
  const [hostelBlock, setHostelBlock] = useState<string>("Block A");
  const [messSpecialNote, setMessSpecialNote] = useState<string>("");

  const [scheduleList, setScheduleList] = useState<ScheduleClass[]>(DEFAULT_SCHEDULE);
  const [noticesList, setNoticesList] = useState<RecentNotice[]>(DEFAULT_NOTICES);

  // Today's formatted date string
  const todayFormatted = useMemo(() => {
    const d = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return d.toLocaleDateString("en-US", options);
  }, []);

  // ======================================================
  // LOAD USER PROFILE DATA & LIVE MANAGER SYNC
  // ======================================================
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setUserName("Student");
      setUserInitial("S");
      return;
    }

    const parsed = parseNameAndRoleFromEmail(user.email);
    const initialName = user.displayName || parsed.fullName || "Student";
    setUserName(initialName);
    setUserInitial(initialName.trim().charAt(0).toUpperCase() || "S");

    // 1. Direct user doc listener (Fees Manager, Notice Manager, Admin, Teacher updates)
    const userRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        const rawName = data.fullName || user.displayName || parsed.fullName || "Student";
        setUserName(rawName);
        setUserInitial(rawName.trim().charAt(0).toUpperCase() || "S");
        if (data.cgpa) {
          setCgpa(`${data.cgpa} / 10`);
        }
        // Direct realtime sync from Fee Manager
        if (data.feeStatus) setFeeStatus(data.feeStatus);
        if (data.remainingFees !== undefined) setRemainingFees(Number(data.remainingFees));
        else if (data.dueFee !== undefined) setRemainingFees(Number(data.dueFee));
        // Direct realtime sync from Notice / Hostel Manager
        if (data.roomNo) setHostelRoom(data.roomNo);
        if (data.hostelBlock) setHostelBlock(data.hostelBlock);
      },
      (err) => console.log("User doc listener:", err.message)
    );

    // 2. Direct realtime sync from Hostel Allocation subcollection
    const hostelAllocRef = doc(db, "users", user.uid, "hostel", "allocation");
    const unsubHostel = onSnapshot(
      hostelAllocRef,
      (hSnap) => {
        if (hSnap.exists()) {
          const h = hSnap.data();
          if (h.roomNo) setHostelRoom(h.roomNo);
          if (h.blockName) setHostelBlock(h.blockName);
        }
      },
      (hErr) => console.log("Hostel allocation sub listener:", hErr.message)
    );

    // 3. Direct realtime sync from Mess Manager
    const unsubMess = subscribeMessMenu((mMenu) => {
      if (mMenu.specialNote) {
        const noteStr = typeof mMenu.specialNote === "string" ? mMenu.specialNote : (mMenu.specialNote as any)?.note || "";
        setMessSpecialNote(noteStr);
      }
    });

    return () => {
      unsubscribeUser();
      unsubHostel();
      unsubMess();
    };
  }, []);

  // ======================================================
  // ATTENDANCE CALCULATION (LIVE FROM USER PROFILE & SUBJECTS)
  // ======================================================
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Direct profile attendance update listener
    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const uData = snap.data();
          if (uData.attendancePercentage) {
            setAttendancePercentage(String(uData.attendancePercentage));
          }
        }
      },
      (err) => console.log("User attendance error:", err.message)
    );

    // 2. Aggregate subjects attendance listener
    const subjectsRef = collection(db, "users", user.uid, "subjects");
    const unsubSubjects = onSnapshot(
      subjectsRef,
      (snapshot) => {
        if (snapshot.empty) return;

        let total = 0;
        let attended = 0;
        snapshot.forEach((d) => {
          const data = d.data();
          total += Number(data.totalClasses || 0);
          attended += Number(data.attendedClasses || 0);
        });

        if (total > 0) {
          const pct = Math.round((attended / total) * 100);
          setAttendancePercentage(`${pct}%`);
        }
      },
      (err) => console.log("Subjects attendance error:", err.message)
    );

    return () => {
      unsubUser();
      unsubSubjects();
    };
  }, []);

  // ======================================================
  // STUDY SESSIONS TODAY
  // ======================================================
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const sessionsRef = collection(db, "users", user.uid, "studySessions");
    const unsubscribe = onSnapshot(
      sessionsRef,
      (snapshot) => {
        let total = 0;
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.date === todayStr) {
            total += Number(data.durationMinutes || 0);
          }
        });
        setStudyMinutes(Math.round(total));
      },
      (err) => console.log("Study sessions error:", err.message)
    );

    return unsubscribe;
  }, []);

  // ======================================================
  // REAL-TIME OFFICIAL SCHEDULE FROM FIRESTORE
  // ======================================================
  useEffect(() => {
    const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDayName = daysMap[new Date().getDay()];

    const schedCol = collection(db, "schedules");
    const unsubscribe = onSnapshot(
      schedCol,
      (snapshot) => {
        if (snapshot.empty) {
          setScheduleList(DEFAULT_SCHEDULE);
          return;
        }

        const todayDocs: ScheduleClass[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (data.day === currentDayName) {
            const sTime = data.startTime || (data.time?.split("-")[0]?.trim()) || "09:00 AM";
            const eTime = data.endTime || (data.time?.split("-")[1]?.trim()) || "10:00 AM";
            todayDocs.push({
              id: d.id,
              subject: data.subject || "Subject",
              room: data.room || "Room 101",
              timeRange: `${sTime} - ${eTime}`,
              badgeColor: "#0284C7",
              badgeBg: "#E0F2FE",
            });
          }
        });

        if (todayDocs.length > 0) {
          setScheduleList(todayDocs);
        } else {
          // If no classes today, show preview of next available scheduled classes
          const anyDocs: ScheduleClass[] = snapshot.docs.slice(0, 4).map((d) => {
            const data = d.data();
            const sTime = data.startTime || (data.time?.split("-")[0]?.trim()) || "09:00 AM";
            const eTime = data.endTime || (data.time?.split("-")[1]?.trim()) || "10:00 AM";
            return {
              id: d.id,
              subject: `${data.subject || "Subject"} (${data.day || "Mon"})`,
              room: data.room || "Room 101",
              timeRange: `${sTime} - ${eTime}`,
              badgeColor: "#0284C7",
              badgeBg: "#E0F2FE",
            };
          });
          setScheduleList(anyDocs);
        }
      },
      (err) => console.log("Home schedule error:", err.message)
    );

    return unsubscribe;
  }, []);

  // ======================================================
  // NOTICES FROM FIRESTORE
  // ======================================================
  useEffect(() => {
    const noticesRef = collection(db, "notices");
    const q = query(noticesRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setNoticesList(DEFAULT_NOTICES);
          return;
        }

        const items: RecentNotice[] = [];
        snapshot.docs.slice(0, 3).forEach((d) => {
          const data = d.data();
          const cat = data.category || "Academic";
          let tagColor = "#0284C7";
          let tagBg = "#E0F2FE";
          let icon: keyof typeof Ionicons.glyphMap = "school";

          if (cat === "Important") {
            tagColor = "#EF4444";
            tagBg = "#FEE2E2";
            icon = "notifications";
          } else if (cat === "General") {
            tagColor = "#16A34A";
            tagBg = "#DCFCE7";
            icon = "calendar";
          }

          items.push({
            id: d.id,
            title: data.title || "Campus Notice",
            description: data.description || "",
            tag: cat,
            tagBg,
            tagColor,
            icon,
            iconBg: tagBg,
            iconColor: tagColor,
            date: data.date || "Today",
          });
        });

        if (items.length > 0) {
          setNoticesList(items);
        }
      },
      (err) => console.log("Notices listener:", err.message)
    );

    return unsubscribe;
  }, []);

  const navigateTo = (routePath: string) => {
    try {
      router.push(routePath as any);
    } catch (e) {
      console.warn("Navigation failed for route:", routePath);
      if (routePath.includes("ai-assistant")) {
        router.push("/ai-assistant" as any);
      }
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ================================================== */}
      {/* TOP HEADER */}
      {/* ================================================== */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerBrandCol}>
          <View style={styles.logoRow}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="school" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>Campusly</Text>
          </View>
          <Text style={[styles.brandTagline, { color: colors.textSecondary }]}>
            {t("academicJourney", "Your College Life, Simplified")}
          </Text>
        </View>

        <View style={styles.headerRightRow}>
          <UniversalRoleControls compact />

          <TouchableOpacity
            style={[
              styles.headerAiBtn,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => router.push("/(tab)/ai-assistant")}
          >
            <Ionicons name="sparkles" size={13} color={colors.primary} />
            <Text style={[styles.headerAiBtnText, { color: colors.primary }]}>AI</Text>
          </TouchableOpacity>

          <NotificationBellModal iconColor={colors.text} badgeBgColor="#EF4444" />

          <TouchableOpacity
            style={styles.profileButton}
            activeOpacity={0.7}
            onPress={() => router.push("/(tab)/profile")}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarLetter}>{userInitial}</Text>
            </View>
            <Ionicons name="chevron-down" size={11} color={colors.textSecondary} style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
      </View>

      <OfflineBanner />

      {/* ================================================== */}
      {/* SCROLLABLE DASHBOARD CONTENT */}
      {/* ================================================== */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================================================== */}
        {/* WELCOME BACK HERO CARD */}
        {/* ================================================== */}
        <View style={styles.welcomeBanner}>
          <View style={styles.welcomeLeftCol}>
            <View style={styles.welcomeTagRow}>
              <Text style={styles.welcomeTagText}>{t("welcomeBack", "WELCOME BACK").toUpperCase()} 👋</Text>
            </View>

            <Text style={styles.welcomeName} numberOfLines={1}>
              {userName}
            </Text>

            <Text style={styles.welcomeHeading}>{t("learnConnectGrow", "Learn. Connect. Grow.")}</Text>

            <Text style={styles.welcomeSubtext}>
              {t("collegeSubtext", "Everything you need for your college life in one place.")}
            </Text>
          </View>

          {/* Right Vector Study Illustration */}
          <View style={styles.illustrationWrapper}>
            {/* Open Laptop */}
            <View style={styles.laptopContainer}>
              <View style={styles.laptopScreen}>
                <Ionicons name="school" size={16} color="#DDD6FE" />
              </View>
              <View style={styles.laptopKeyboard} />
            </View>

            {/* Stack of colorful study books */}
            <View style={styles.booksStack}>
              <View style={[styles.bookPill, { backgroundColor: "#60A5FA", width: 32 }]} />
              <View style={[styles.bookPill, { backgroundColor: "#FBBF24", width: 36 }]} />
              <View style={[styles.bookPill, { backgroundColor: "#C084FC", width: 40 }]} />
            </View>

            {/* Little potted desk plant */}
            <View style={styles.pottedPlant}>
              <Ionicons name="leaf" size={14} color="#86EFAC" />
              <View style={styles.plantPot} />
            </View>
          </View>
        </View>

        {/* ================================================== */}
        {/* REALTIME MANAGER SYNC HUB */}
        {/* ================================================== */}
        <View style={styles.syncHubContainer}>
          <View style={styles.syncHubHeader}>
            <View style={styles.syncPulseDot} />
            <Text style={[styles.syncHubTitle, { color: colors.text }]}>
              LIVE CAMPUS SYNC
            </Text>
            <Text style={[styles.syncHubSub, { color: colors.textSecondary }]}>
              Realtime updates from Fees, Hostel, Mess & Teachers
            </Text>
          </View>

          <View style={styles.syncGrid}>
            {/* 1. FEES MANAGER STATUS */}
            <TouchableOpacity
              style={[
                styles.syncCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => navigateTo("/fees")}
              activeOpacity={0.8}
            >
              <View style={styles.syncCardTop}>
                <View style={[styles.syncIconBox, { backgroundColor: "#EDE9FE" }]}>
                  <Ionicons name="wallet-outline" size={15} color="#7C3AED" />
                </View>
                <View
                  style={[
                    styles.syncBadge,
                    {
                      backgroundColor:
                        feeStatus === "Paid" || remainingFees === 0
                          ? "#DCFCE7"
                          : "#FEE2E2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.syncBadgeText,
                      {
                        color:
                          feeStatus === "Paid" || remainingFees === 0
                            ? "#16A34A"
                            : "#EF4444",
                      },
                    ]}
                  >
                    {feeStatus === "Paid" || remainingFees === 0
                      ? "Cleared"
                      : `₹${remainingFees.toLocaleString("en-IN")} Due`}
                  </Text>
                </View>
              </View>
              <Text style={[styles.syncCardLabel, { color: colors.textSecondary }]}>
                Fees Manager
              </Text>
              <Text style={[styles.syncCardValue, { color: colors.text }]} numberOfLines={1}>
                {feeStatus === "Paid" || remainingFees === 0 ? "No Pending Dues" : "Installment Pending"}
              </Text>
            </TouchableOpacity>

            {/* 2. HOSTEL MANAGER STATUS */}
            <TouchableOpacity
              style={[
                styles.syncCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => navigateTo("/hostel")}
              activeOpacity={0.8}
            >
              <View style={styles.syncCardTop}>
                <View style={[styles.syncIconBox, { backgroundColor: "#E0F2FE" }]}>
                  <Ionicons name="business-outline" size={15} color="#0284C7" />
                </View>
                <View style={[styles.syncBadge, { backgroundColor: "#E0F2FE" }]}>
                  <Text style={[styles.syncBadgeText, { color: "#0284C7" }]}>
                    Room {hostelRoom}
                  </Text>
                </View>
              </View>
              <Text style={[styles.syncCardLabel, { color: colors.textSecondary }]}>
                Hostel / Notice
              </Text>
              <Text style={[styles.syncCardValue, { color: colors.text }]} numberOfLines={1}>
                {hostelBlock || "Block A"} • Allocated
              </Text>
            </TouchableOpacity>

            {/* 3. MESS MANAGER STATUS */}
            <TouchableOpacity
              style={[
                styles.syncCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => navigateTo("/mess")}
              activeOpacity={0.8}
            >
              <View style={styles.syncCardTop}>
                <View style={[styles.syncIconBox, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="restaurant-outline" size={15} color="#16A34A" />
                </View>
                <View style={[styles.syncBadge, { backgroundColor: "#FEF3C7" }]}>
                  <Text style={[styles.syncBadgeText, { color: "#D97706" }]}>
                    Active
                  </Text>
                </View>
              </View>
              <Text style={[styles.syncCardLabel, { color: colors.textSecondary }]}>
                Mess Manager
              </Text>
              <Text style={[styles.syncCardValue, { color: colors.text }]} numberOfLines={1}>
                {messSpecialNote || "Kitchen Menu Synced"}
              </Text>
            </TouchableOpacity>

            {/* 4. TEACHER ATTENDANCE */}
            <TouchableOpacity
              style={[
                styles.syncCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => navigateTo("/attendence")}
              activeOpacity={0.8}
            >
              <View style={styles.syncCardTop}>
                <View style={[styles.syncIconBox, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="checkbox-outline" size={15} color="#2563EB" />
                </View>
                <View style={[styles.syncBadge, { backgroundColor: "#EFF6FF" }]}>
                  <Text style={[styles.syncBadgeText, { color: "#2563EB" }]}>
                    {attendancePercentage}
                  </Text>
                </View>
              </View>
              <Text style={[styles.syncCardLabel, { color: colors.textSecondary }]}>
                Teacher Attendance
              </Text>
              <Text style={[styles.syncCardValue, { color: colors.text }]} numberOfLines={1}>
                Official Faculty Log
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================================================== */}
        {/* QUICK ACCESS */}
        {/* ================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("services", "Quick Access")}</Text>
          <TouchableOpacity
            onPress={() => navigateTo("/more")}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewAllText, { color: colors.primary }]}>{t("viewAll", "View All →")}</Text>
          </TouchableOpacity>
        </View>

        {/* 2-Row Responsive Grid of Quick Access Cards */}
        <View style={styles.quickAccessGrid}>
          {QUICK_ACCESS_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.quickAccessCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              activeOpacity={0.8}
              onPress={() => navigateTo(item.route)}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.cardIconBox, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={16} color={item.iconColor} />
                </View>
                <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} />
              </View>

              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {t(item.id, item.title)}
              </Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ================================================== */}
        {/* TODAY'S SCHEDULE */}
        {/* ================================================== */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.titleWithIcon}>
            <View style={[styles.titleIconBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="calendar" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("todaySchedule", "Today's Schedule")}</Text>
          </View>

          <View style={styles.titleRightRow}>
            <Text style={[styles.scheduleDateText, { color: colors.textSecondary }]}>{todayFormatted}</Text>
            <TouchableOpacity
              onPress={() => navigateTo("/schedule")}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewAllText, { marginLeft: 6, color: colors.primary }]}>{t("viewAll", "View All →")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {scheduleList.map((item, index) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity
                style={styles.scheduleRow}
                activeOpacity={0.7}
                onPress={() => navigateTo("/schedule")}
              >
                <View style={[styles.timeBadge, { backgroundColor: item.badgeBg }]}>
                  <Text style={[styles.timeBadgeText, { color: item.badgeColor }]}>
                    {item.timeRange}
                  </Text>
                </View>

                <View style={styles.scheduleDetailCol}>
                  <Text style={[styles.scheduleSubject, { color: colors.text }]} numberOfLines={1}>{item.subject}</Text>
                  <Text style={[styles.scheduleRoom, { color: colors.textSecondary }]} numberOfLines={1}>{item.room}</Text>
                </View>

                <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
              </TouchableOpacity>

              {index < scheduleList.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* ================================================== */}
        {/* RECENT NOTICES */}
        {/* ================================================== */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.titleWithIcon}>
            <View style={[styles.titleIconBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="megaphone" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("recentNotices", "Recent Notices")}</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigateTo("/notices")}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewAllText, { color: colors.primary }]}>{t("viewAll", "View All →")}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {noticesList.map((item, index) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity
                style={styles.noticeRow}
                activeOpacity={0.7}
                onPress={() => navigateTo("/notices")}
              >
                <View style={[styles.noticeIconBox, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={15} color={item.iconColor} />
                </View>

                <View style={styles.noticeTextCol}>
                  <View style={styles.noticeTagTitleRow}>
                    <View style={[styles.noticePill, { backgroundColor: item.tagBg }]}>
                      <Text style={[styles.noticePillText, { color: item.tagColor }]}>
                        {item.tag}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.noticeTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.noticeDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>

                <View style={styles.noticeRightCol}>
                  <Text style={[styles.noticeDate, { color: colors.textSecondary }]}>{item.date}</Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} style={{ marginTop: 2 }} />
                </View>
              </TouchableOpacity>

              {index < noticesList.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* ================================================== */}
        {/* 3 STATS CARDS ROW (Attendance, Study Today, CGPA) */}
        {/* ================================================== */}
        <View style={styles.statsRow}>
          {/* 1. Attendance */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => navigateTo("/attendance")}
          >
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="calendar-outline" size={12} color={colors.primary} />
              </View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("attendance", "Attendance")}</Text>
              <Ionicons name="chevron-forward" size={10} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
            </View>

            <Text style={[styles.statValue, { color: colors.primary }]}>
              {attendancePercentage}
            </Text>
            <Text style={[styles.statSubtext, { color: colors.textSecondary }]} numberOfLines={1}>{t("attendanceGood", "Good attendance")}</Text>
          </TouchableOpacity>

          {/* 2. Study Today */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => navigateTo("/study")}
          >
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconBadge, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="school-outline" size={12} color="#0284C7" />
              </View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("studyHours", "Study")}</Text>
              <Ionicons name="chevron-forward" size={10} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
            </View>

            <Text style={[styles.statValue, { color: "#0284C7" }]}>
              {studyMinutes}m / {Math.round(studyTarget / 60)}h
            </Text>
            <Text style={[styles.statSubtext, { color: colors.textSecondary }]} numberOfLines={1}>{t("targetReached", "Daily goal")}</Text>
          </TouchableOpacity>

          {/* 3. CGPA */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => navigateTo("/cgpa-calculator")}
          >
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconBadge, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="star" size={12} color="#16A34A" />
              </View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("cgpa", "CGPA")}</Text>
              <Ionicons name="chevron-forward" size={10} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
            </View>

            <Text style={[styles.statValue, { color: "#16A34A" }]}>
              {cgpa}
            </Text>
            <Text style={[styles.statSubtext, { color: "#16A34A" }]} numberOfLines={1}>
              {t("cgpaStatus", "Score")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================================================== */}
        {/* ASK CAMPUSLY AI BANNER */}
        {/* ================================================== */}
        <TouchableOpacity
          style={[
            styles.aiBanner,
            {
              backgroundColor: isDark ? colors.card : "#F5F3FF",
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.85}
          onPress={() => navigateTo("/(tab)/ai-assistant")}
        >
          <View
            style={[
              styles.aiIconCircle,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </View>

          <View style={styles.aiTextCol}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={[styles.aiTitle, { color: colors.text }]}>
                {t("askCampuslyAI", "Ask Campusly AI")}
              </Text>
              <View style={{ backgroundColor: "#6366F1", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 8.5, fontWeight: "800" }}>MOBILENET</Text>
              </View>
            </View>
            <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              Visual neural scanner: Snap lab items, circuit diagrams, math, or notes for instant solutions!
            </Text>
          </View>

          <View style={[styles.chatNowBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.chatNowBtnText}>{t("chatNow", "Scan →")}</Text>
          </View>
        </TouchableOpacity>

        {/* ================================================== */}
        {/* LEAVE & GATE PASS PORTAL CARD (LOWER SECTION) */}
        {/* ================================================== */}
        <TouchableOpacity
          style={[
            styles.aiBanner,
            {
              backgroundColor: isDark ? colors.card : "#EEF2FF",
              borderColor: colors.border,
              marginTop: 10,
            },
          ]}
          activeOpacity={0.85}
          onPress={() => navigateTo("/leave-gatepass")}
        >
          <View
            style={[
              styles.aiIconCircle,
              {
                backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#E0E7FF",
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="exit" size={17} color="#4F46E5" />
          </View>

          <View style={styles.aiTextCol}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={[styles.aiTitle, { color: colors.text }]}>
                Leave & Gate Pass
              </Text>
              <View style={{ backgroundColor: "#4F46E5", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 8.5, fontWeight: "800" }}>PASS</Text>
              </View>
            </View>
            <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              Apply for campus out passes & absence leaves, attach hardcopies, and track approval status.
            </Text>
          </View>

          <View style={[styles.chatNowBtn, { backgroundColor: "#4F46E5" }]}>
            <Text style={styles.chatNowBtnText}>Apply →</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ================================================== */}
      {/* FLOATING AI ASSISTANT ACTION BUTTON (FAB) */}
      {/* ================================================== */}
      <TouchableOpacity
        style={[
          styles.floatingAiFab,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
        activeOpacity={0.88}
        onPress={() => navigateTo("/(tab)/ai-assistant")}
      >
        <Ionicons name="sparkles" size={15} color="#FFFFFF" />
        <Text style={styles.floatingFabText}>AI Help</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 75,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
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
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#251460",
    letterSpacing: -0.2,
  },
  brandTagline: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "400",
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 2,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#4C268F",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4C268F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* WELCOME BANNER */
  welcomeBanner: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#7048E8",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#7048E8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  welcomeLeftCol: {
    flex: 1.3,
    paddingRight: 6,
  },
  welcomeTagRow: {
    marginBottom: 2,
  },
  welcomeTagText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  welcomeName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  welcomeHeading: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  welcomeSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 10.5,
    marginTop: 2,
    lineHeight: 14,
  },

  /* ILLUSTRATION VECTOR */
  illustrationWrapper: {
    flex: 0.9,
    alignItems: "center",
    justifyContent: "center",
    height: 75,
    position: "relative",
  },
  laptopContainer: {
    alignItems: "center",
    marginBottom: 4,
  },
  laptopScreen: {
    width: 50,
    height: 32,
    borderRadius: 5,
    backgroundColor: "#4C268F",
    borderWidth: 1.5,
    borderColor: "#E9D5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  laptopKeyboard: {
    width: 60,
    height: 4,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: "#E9D5FF",
  },
  booksStack: {
    position: "absolute",
    left: 2,
    bottom: 4,
    alignItems: "flex-start",
  },
  bookPill: {
    height: 5,
    borderRadius: 2.5,
    marginBottom: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  pottedPlant: {
    position: "absolute",
    right: 4,
    bottom: 6,
    alignItems: "center",
  },
  plantPot: {
    width: 11,
    height: 9,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    marginTop: -2,
  },

  /* SECTION HEADERS */
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    marginTop: 14,
    marginBottom: 6,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#4318FF",
  },
  titleRightRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  scheduleDateText: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "500",
  },

  /* QUICK ACCESS GRID */
  quickAccessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  quickAccessCard: {
    width: "23%",
    minWidth: 72,
    flexGrow: 1,
    margin: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardDesc: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 12,
  },

  /* WHITE CONTENT CARD (SCHEDULE & NOTICES) */
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginHorizontal: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  /* SCHEDULE ROWS */
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  timeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 92,
    alignItems: "center",
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  scheduleDetailCol: {
    flex: 1,
  },
  scheduleSubject: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  scheduleRoom: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },

  /* NOTICE ROWS */
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  noticeIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  noticeTextCol: {
    flex: 1,
    marginRight: 6,
  },
  noticeTagTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  noticePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  noticePillText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  noticeDesc: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  noticeRightCol: {
    alignItems: "flex-end",
  },
  noticeDate: {
    fontSize: 9.5,
    color: "#94A3B8",
    fontWeight: "500",
  },

  /* STATS CARDS ROW (3-COLUMNS) */
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  statLabel: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  statValue: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  statSubtext: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },

  /* ASK CAMPUSLY AI BANNER */
  aiBanner: {
    backgroundColor: "#F5F3FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    marginHorizontal: 12,
    marginTop: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  aiIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  aiTextCol: {
    flex: 1,
    marginLeft: 8,
    marginRight: 6,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  aiSubtitle: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  chatNowBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chatNowBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  /* HEADER AI BUTTON */
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerAiBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  headerAiBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* FLOATING AI ASSISTANT FAB */
  floatingAiFab: {
    position: "absolute",
    bottom: 16,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 999,
  },
  floatingFabText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  /* REALTIME MANAGER SYNC HUB */
  syncHubContainer: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  syncHubHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  syncPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  syncHubTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  syncHubSub: {
    fontSize: 10,
    fontWeight: "500",
    flex: 1,
    marginLeft: 4,
  },
  syncGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  syncCard: {
    flex: 1,
    minWidth: "47%",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  syncCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  syncIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  syncBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  syncBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  syncCardLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  syncCardValue: {
    fontSize: 12,
    fontWeight: "700",
  },
});
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import RoleSwitcherModal from "../components/RoleSwitcherModal";

interface ClassSession {
  id: string;
  time: string;
  subject: string;
  section: string;
  room: string;
  status: "completed" | "upcoming" | "in_progress";
}

export default function TeacherDashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [roleSwitcherVisible, setRoleSwitcherVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "attendance" | "subjects" | "students" | "profile">("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mark Attendance Modal
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);

  const todayClasses: ClassSession[] = [
    {
      id: "cls-1",
      time: "9:00 AM",
      subject: "Data Structures",
      section: "CSE-3A",
      room: "Lab 2 (Room 302)",
      status: "completed",
    },
    {
      id: "cls-2",
      time: "11:00 AM",
      subject: "DBMS",
      section: "CSE-3A",
      room: "Hall 204",
      status: "in_progress",
    },
  ];

  const handleMarkAttendancePress = (cls: ClassSession) => {
    setSelectedClass(cls);
    setAttendanceModalVisible(true);
  };

  const navItems = [
    { id: "home", label: "Home", icon: "home-outline" as const, action: () => setActiveTab("home") },
    { id: "subjects", label: "My Subjects", icon: "book-outline" as const, action: () => router.push("/admin/academics") },
    { id: "students", label: "My Students", icon: "people-outline" as const, action: () => router.push("/admin/student") },
    { id: "attendance", label: "Attendance", icon: "checkbox-outline" as const, action: () => router.push("/admin/attendence") },
    { id: "assignments", label: "Assignments", icon: "document-text-outline" as const, action: () => Alert.alert("Assignments", "Assignment manager: 4 active assignments for CSE-3A.") },
    { id: "materials", label: "Study Materials", icon: "folder-open-outline" as const, action: () => router.push("/admin/special-notes") },
    { id: "exams", label: "Exams & Marks", icon: "ribbon-outline" as const, action: () => router.push("/admin/academics") },
    { id: "notices", label: "Academic Notices", icon: "megaphone-outline" as const, action: () => router.push("/admin/notices") },
    { id: "ai", label: "AI Assistant", icon: "sparkles-outline" as const, action: () => router.push("/ai-assistant") },
    { id: "profile", label: "Profile", icon: "person-outline" as const, action: () => router.push("/admin/profile") },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        {/* DESKTOP SIDEBAR */}
        {isDesktop && (
          <View style={styles.sidebar}>
            {/* Logo */}
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Ionicons name="school" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.brandTitle}>Campusly</Text>
            </View>

            {/* Subtitle pill */}
            <View style={styles.facultyBadge}>
              <Ionicons name="easel" size={14} color="#60A5FA" />
              <Text style={styles.facultyBadgeText}>Faculty Portal</Text>
            </View>

            {/* Nav list */}
            <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                    onPress={item.action}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isActive ? "#FFFFFF" : "#94A3B8"}
                    />
                    <Text
                      style={[styles.sidebarItemText, isActive && styles.sidebarItemTextActive]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* User card at bottom */}
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>SR</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>Dr. S. Reddy</Text>
                <Text style={styles.userRole}>reddy.teacher@gmail.com</Text>
              </View>
            </View>
          </View>
        )}

        {/* MAIN CONTENT AREA */}
        <View style={styles.mainContent}>
          {/* TOP BAR */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              {!isDesktop && (
                <TouchableOpacity
                  style={styles.menuBtn}
                  onPress={() => setMobileMenuOpen(true)}
                >
                  <Ionicons name="menu" size={22} color="#0F172A" />
                </TouchableOpacity>
              )}
              <View>
                <Text style={styles.greetingTitle}>Good Morning, Dr. S. Reddy 👋</Text>
                <Text style={styles.greetingSub}>Here's your day at a glance</Text>
              </View>
            </View>

            <View style={styles.topBarRight}>
              <TouchableOpacity
                style={styles.roleSwitchBtn}
                onPress={() => setRoleSwitcherVisible(true)}
              >
                <Ionicons name="swap-horizontal" size={16} color="#2563EB" />
                <Text style={styles.roleSwitchText}>Switch Role</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconCircle}
                onPress={() => router.push("/admin/notices")}
              >
                <Ionicons name="notifications-outline" size={18} color="#475569" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarCircle}
                onPress={() => router.push("/admin/profile")}
              >
                <Text style={styles.avatarCircleText}>SR</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* DASHBOARD BODY */}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 3 TOP STAT CARDS */}
            <View style={styles.statCardsRow}>
              {/* My Subjects */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}
                onPress={() => router.push("/admin/academics")}
              >
                <Text style={[styles.statLabel, { color: "#1D4ED8" }]}>My Subjects</Text>
                <Text style={[styles.statValue, { color: "#1E40AF" }]}>4</Text>
              </TouchableOpacity>

              {/* Today's Classes */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}
                onPress={() => router.push("/admin/schedule")}
              >
                <Text style={[styles.statLabel, { color: "#047857" }]}>Today's Classes</Text>
                <Text style={[styles.statValue, { color: "#065F46" }]}>2</Text>
              </TouchableOpacity>

              {/* Pending Attendance */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}
                onPress={() => router.push("/admin/attendence")}
              >
                <Text style={[styles.statLabel, { color: "#C2410C" }]}>Pending Attendance</Text>
                <Text style={[styles.statValue, { color: "#9A3412" }]}>1</Text>
              </TouchableOpacity>
            </View>

            {/* TODAY'S CLASSES */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Classes</Text>
                <TouchableOpacity onPress={() => router.push("/admin/schedule")}>
                  <Text style={styles.linkText}>View Schedule</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.classesList}>
                {todayClasses.map((cls) => (
                  <View key={cls.id} style={styles.classRow}>
                    <View style={styles.classTimeBadge}>
                      <Ionicons name="time-outline" size={14} color="#2563EB" />
                      <Text style={styles.classTimeText}>{cls.time}</Text>
                    </View>

                    <View style={styles.classInfo}>
                      <Text style={styles.classSubject}>{cls.subject}</Text>
                      <Text style={styles.classRoom}>{cls.room}</Text>
                    </View>

                    <View style={styles.sectionTag}>
                      <Text style={styles.sectionTagText}>{cls.section}</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.markBtn,
                        cls.status === "completed" && styles.markBtnCompleted,
                      ]}
                      onPress={() => handleMarkAttendancePress(cls)}
                    >
                      <Ionicons
                        name={cls.status === "completed" ? "checkmark-circle" : "create-outline"}
                        size={14}
                        color={cls.status === "completed" ? "#059669" : "#FFFFFF"}
                      />
                      <Text
                        style={[
                          styles.markBtnText,
                          cls.status === "completed" && styles.markBtnTextCompleted,
                        ]}
                      >
                        {cls.status === "completed" ? "Marked" : "Mark"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* 4 ACTION BUTTONS */}
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/admin/attendence")}
              >
                <View style={[styles.actionIconBox, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="calendar-outline" size={22} color="#1D4ED8" />
                </View>
                <Text style={styles.actionTitle}>Mark Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/admin/student")}
              >
                <View style={[styles.actionIconBox, { backgroundColor: "#E0E7FF" }]}>
                  <Ionicons name="people-outline" size={22} color="#4338CA" />
                </View>
                <Text style={styles.actionTitle}>My Students</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => Alert.alert("Assignments", "4 active assignments uploaded for CSE-3A.")}
              >
                <View style={[styles.actionIconBox, { backgroundColor: "#EDE9FE" }]}>
                  <Ionicons name="clipboard-outline" size={22} color="#6D28D9" />
                </View>
                <Text style={styles.actionTitle}>Assignments</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/admin/special-notes")}
              >
                <View style={[styles.actionIconBox, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="document-text-outline" size={22} color="#15803D" />
                </View>
                <Text style={styles.actionTitle}>Study Material</Text>
              </TouchableOpacity>
            </View>

            {/* ATTENDANCE OVERVIEW & RECENT ACTIVITIES */}
            <View style={[styles.twoColRow, !isDesktop && styles.colStack]}>
              {/* Left: Attendance Overview */}
              <View style={[styles.sectionCard, { flex: 1 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Attendance Overview</Text>
                  <TouchableOpacity onPress={() => router.push("/admin/attendence")}>
                    <Text style={styles.linkText}>View Details</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.overviewBody}>
                  {/* Circular progress visual */}
                  <View style={styles.gaugeContainer}>
                    <View style={styles.gaugeOuter}>
                      <View style={styles.gaugeInner}>
                        <Text style={styles.gaugePercent}>85%</Text>
                        <Text style={styles.gaugeLabel}>Overall</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.overviewSub}>Overall Attendance (Your Subjects)</Text>

                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#059669" }]} />
                      <Text style={styles.legendText}>Data Structures: 88%</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#2563EB" }]} />
                      <Text style={styles.legendText}>DBMS: 82%</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Right: Recent Activities */}
              <View style={[styles.sectionCard, { flex: 1 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Activities</Text>
                </View>

                <View style={styles.activityList}>
                  <View style={styles.activityItem}>
                    <View style={[styles.activityDot, { backgroundColor: "#2563EB" }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>Attendance marked</Text>
                      <Text style={styles.activitySub}>DBMS • CSE-3A</Text>
                    </View>
                    <Text style={styles.activityTime}>Today, 10:15 AM</Text>
                  </View>

                  <View style={styles.activityItem}>
                    <View style={[styles.activityDot, { backgroundColor: "#7C3AED" }]}>
                      <Ionicons name="document-text" size={12} color="#FFFFFF" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>New assignment</Text>
                      <Text style={styles.activitySub}>Data Structures (Trees & Graphs)</Text>
                    </View>
                    <Text style={styles.activityTime}>Today, 09:20 AM</Text>
                  </View>

                  <View style={styles.activityItem}>
                    <View style={[styles.activityDot, { backgroundColor: "#EF4444" }]}>
                      <Ionicons name="alert" size={12} color="#FFFFFF" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>3 students absent</Text>
                      <Text style={styles.activitySub}>DBMS • CSE-3A</Text>
                    </View>
                    <Text style={styles.activityTime}>Yesterday, 04:20 PM</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* MOBILE BOTTOM NAV */}
          {!isDesktop && (
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => setActiveTab("home")}
              >
                <Ionicons
                  name={activeTab === "home" ? "home" : "home-outline"}
                  size={20}
                  color={activeTab === "home" ? "#2563EB" : "#64748B"}
                />
                <Text
                  style={[
                    styles.bottomNavText,
                    activeTab === "home" && styles.bottomNavTextActive,
                  ]}
                >
                  Dashboard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => router.push("/admin/attendence")}
              >
                <Ionicons name="checkbox-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => router.push("/admin/academics")}
              >
                <Ionicons name="book-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Subjects</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => router.push("/admin/student")}
              >
                <Ionicons name="people-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Students</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => router.push("/admin/profile")}
              >
                <Ionicons name="person-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* QUICK ATTENDANCE MARK MODAL */}
      <Modal
        visible={attendanceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAttendanceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark Class Attendance</Text>
              <TouchableOpacity onPress={() => setAttendanceModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedClass && (
              <View style={styles.modalDetails}>
                <Text style={styles.modalSubject}>{selectedClass.subject}</Text>
                <Text style={styles.modalSub}>{selectedClass.section} • {selectedClass.time}</Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalActionBtnFull}
                    onPress={() => {
                      setAttendanceModalVisible(false);
                      router.push("/admin/attendence");
                    }}
                  >
                    <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.modalActionBtnText}>Open Attendance Roster</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ROLE SWITCHER */}
      <RoleSwitcherModal
        visible={roleSwitcherVisible}
        currentRole="teacher"
        onClose={() => setRoleSwitcherVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B1E38",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  sidebar: {
    width: 260,
    backgroundColor: "#0B1E38",
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  facultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
    gap: 6,
  },
  facultyBadgeText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
  },
  navScroll: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  sidebarItemActive: {
    backgroundColor: "#1E3A8A",
  },
  sidebarItemText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
  },
  sidebarItemTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    marginTop: 10,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  userAvatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  userRole: {
    fontSize: 12,
    color: "#94A3B8",
  },
  mainContent: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuBtn: {
    padding: 6,
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  greetingSub: {
    fontSize: 12,
    color: "#64748B",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roleSwitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  roleSwitchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircleText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statCardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "900",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  classesList: {
    gap: 10,
  },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  classTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginRight: 12,
  },
  classTimeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  classInfo: {
    flex: 1,
  },
  classSubject: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  classRoom: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  sectionTag: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
  },
  sectionTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  markBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  markBtnCompleted: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  markBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  markBtnTextCompleted: {
    color: "#059669",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 16,
  },
  colStack: {
    flexDirection: "column",
  },
  overviewBody: {
    alignItems: "center",
    paddingVertical: 10,
  },
  gaugeContainer: {
    marginBottom: 12,
  },
  gaugeOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 8,
    borderColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  gaugeInner: {
    alignItems: "center",
  },
  gaugePercent: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1E40AF",
  },
  gaugeLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  overviewSub: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: "#64748B",
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  activityDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  activitySub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingVertical: 8,
    justifyContent: "space-around",
  },
  bottomNavItem: {
    alignItems: "center",
    gap: 4,
  },
  bottomNavText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  bottomNavTextActive: {
    color: "#2563EB",
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalDetails: {
    gap: 8,
  },
  modalSubject: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },
  modalSub: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
  },
  modalActions: {
    gap: 10,
  },
  modalActionBtnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  modalActionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

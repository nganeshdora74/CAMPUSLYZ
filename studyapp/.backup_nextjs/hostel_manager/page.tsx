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
import RoleSwitcherModal from "../../components/RoleSwitcherModal";

export default function HostelManagerDashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [roleSwitcherVisible, setRoleSwitcherVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "rooms" | "students" | "complaints" | "reports">("home");
  const [checkInOutModal, setCheckInOutModal] = useState(false);

  const complaints = [
    {
      id: "comp-1",
      title: "Room AC not working",
      meta: "10 Oct 2025 • Room 204",
      status: "Pending",
      badgeColor: "#EA580C",
      badgeBg: "#FFF7ED",
    },
    {
      id: "comp-2",
      title: "Water issue",
      meta: "11 Oct 2025 • Room 118",
      status: "In Progress",
      badgeColor: "#0284C7",
      badgeBg: "#F0F9FF",
    },
    {
      id: "comp-3",
      title: "Mess timing issue",
      meta: "10 Oct 2025 • Room 302",
      status: "Resolved",
      badgeColor: "#16A34A",
      badgeBg: "#F0FDF4",
    },
  ];

  const navItems = [
    { id: "home", label: "Home", icon: "home-outline" as const, action: () => setActiveTab("home") },
    { id: "rooms", label: "Rooms", icon: "bed-outline" as const, action: () => router.push("/admin/hostel") },
    { id: "allocation", label: "Room Allocation", icon: "git-network-outline" as const, action: () => router.push("/admin/hostel") },
    { id: "students", label: "Hostel Students", icon: "people-outline" as const, action: () => router.push("/admin/student") },
    { id: "checkin", label: "Check-in / Check-out", icon: "swap-horizontal-outline" as const, action: () => setCheckInOutModal(true) },
    { id: "complaints", label: "Complaints", icon: "document-text-outline" as const, action: () => router.push("/admin/requests") },
    { id: "notices", label: "Hostel Notices", icon: "megaphone-outline" as const, action: () => router.push("/admin/notices") },
    { id: "reports", label: "Reports", icon: "bar-chart-outline" as const, action: () => router.push("/admin/reports") },
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
                <Ionicons name="home" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.brandTitle}>Campusly</Text>
            </View>

            {/* Subtitle pill */}
            <View style={styles.hostelBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#6EE7B7" />
              <Text style={styles.hostelBadgeText}>Hostel Operations</Text>
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
                      color={isActive ? "#FFFFFF" : "#A7F3D0"}
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
                <Text style={styles.userAvatarText}>RS</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>Rahul Sharma</Text>
                <Text style={styles.userRole}>rahul.hostel@gmail.com</Text>
              </View>
            </View>
          </View>
        )}

        {/* MAIN CONTENT AREA */}
        <View style={styles.mainContent}>
          {/* TOP BAR */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View>
                <Text style={styles.greetingTitle}>Welcome, Rahul Sharma 👋</Text>
                <Text style={styles.greetingSub}>Hostel Operations Dashboard</Text>
              </View>
            </View>

            <View style={styles.topBarRight}>
              <TouchableOpacity
                style={styles.roleSwitchBtn}
                onPress={() => setRoleSwitcherVisible(true)}
              >
                <Ionicons name="swap-horizontal" size={16} color="#059669" />
                <Text style={styles.roleSwitchText}>Switch Role</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconCircle}
                onPress={() => router.push("/admin/requests")}
              >
                <Ionicons name="notifications-outline" size={18} color="#475569" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarCircle}
                onPress={() => router.push("/admin/profile")}
              >
                <Text style={styles.avatarCircleText}>RS</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* DASHBOARD BODY */}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 4 TOP STAT CARDS */}
            <View style={styles.statCardsRow}>
              {/* Total Rooms */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#E0F2FE", borderColor: "#BAE6FD" }]}
                onPress={() => router.push("/admin/hostel")}
              >
                <Text style={[styles.statLabel, { color: "#0369A1" }]}>Total Rooms</Text>
                <Text style={[styles.statValue, { color: "#0C4A6E" }]}>120</Text>
              </TouchableOpacity>

              {/* Occupied */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}
                onPress={() => router.push("/admin/hostel")}
              >
                <Text style={[styles.statLabel, { color: "#15803D" }]}>Occupied</Text>
                <Text style={[styles.statValue, { color: "#14532D" }]}>96</Text>
              </TouchableOpacity>

              {/* Available */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}
                onPress={() => router.push("/admin/hostel")}
              >
                <Text style={[styles.statLabel, { color: "#B45309" }]}>Available</Text>
                <Text style={[styles.statValue, { color: "#78350F" }]}>24</Text>
              </TouchableOpacity>

              {/* Students */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#F3E8FF", borderColor: "#E9D5FF" }]}
                onPress={() => router.push("/admin/student")}
              >
                <Text style={[styles.statLabel, { color: "#7E22CE" }]}>Students</Text>
                <Text style={[styles.statValue, { color: "#581C87" }]}>96</Text>
              </TouchableOpacity>
            </View>

            {/* ROOM OCCUPANCY & RECENT COMPLAINTS */}
            <View style={[styles.twoColRow, !isDesktop && styles.colStack]}>
              {/* Left: Room Occupancy Donut */}
              <View style={[styles.sectionCard, { flex: 1 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Room Occupancy</Text>
                </View>

                <View style={styles.donutContainer}>
                  <View style={styles.donutRing}>
                    <View style={styles.donutInner}>
                      <Text style={styles.donutPercent}>80%</Text>
                      <Text style={styles.donutSub}>Occupied</Text>
                    </View>
                  </View>

                  <View style={styles.legendCol}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
                      <Text style={styles.legendLabel}>Occupied</Text>
                      <Text style={styles.legendVal}>96</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                      <Text style={styles.legendLabel}>Available</Text>
                      <Text style={styles.legendVal}>24</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#94A3B8" }]} />
                      <Text style={styles.legendLabel}>Under Maintenance</Text>
                      <Text style={styles.legendVal}>0</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Right: Recent Complaints */}
              <View style={[styles.sectionCard, { flex: 1.2 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Complaints</Text>
                  <TouchableOpacity onPress={() => router.push("/admin/requests")}>
                    <Text style={styles.linkText}>View All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.complaintsList}>
                  {complaints.map((c) => (
                    <View key={c.id} style={styles.complaintRow}>
                      <View style={styles.complaintIcon}>
                        <Ionicons name="alert-circle-outline" size={20} color="#059669" />
                      </View>
                      <View style={styles.complaintContent}>
                        <Text style={styles.complaintTitle}>{c.title}</Text>
                        <Text style={styles.complaintMeta}>{c.meta}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: c.badgeBg }]}>
                        <Text style={[styles.statusBadgeText, { color: c.badgeColor }]}>
                          {c.status}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* QUICK ACTIONS */}
            <View style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push("/admin/hostel")}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: "#DCFCE7" }]}>
                    <Ionicons name="bed-outline" size={22} color="#059669" />
                  </View>
                  <Text style={styles.actionTitle}>Room Allocation</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => setCheckInOutModal(true)}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: "#E0F2FE" }]}>
                    <Ionicons name="swap-horizontal-outline" size={22} color="#0284C7" />
                  </View>
                  <Text style={styles.actionTitle}>Check-in / Check-out</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push("/admin/requests")}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: "#FEF3C7" }]}>
                    <Ionicons name="document-text-outline" size={22} color="#D97706" />
                  </View>
                  <Text style={styles.actionTitle}>Complaints</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push("/admin/notices")}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: "#F3E8FF" }]}>
                    <Ionicons name="megaphone-outline" size={22} color="#7E22CE" />
                  </View>
                  <Text style={styles.actionTitle}>Hostel Notices</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* BOTTOM BANNER */}
            <View style={styles.promoBanner}>
              <View style={styles.promoContent}>
                <Text style={styles.promoHeading}>Better Hostel</Text>
                <Text style={styles.promoSub}>Better Experience</Text>
                <Text style={styles.promoDesc}>
                  Ensuring clean facilities, 24/7 security, high-speed Wi-Fi, and comfortable stay for every resident.
                </Text>
              </View>
              <View style={styles.promoIconCircle}>
                <Ionicons name="business" size={40} color="#059669" />
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
                  color={activeTab === "home" ? "#059669" : "#64748B"}
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
                onPress={() => router.push("/admin/hostel")}
              >
                <Ionicons name="bed-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Rooms</Text>
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
                onPress={() => router.push("/admin/requests")}
              >
                <Ionicons name="document-text-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Complaints</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => router.push("/admin/reports")}
              >
                <Ionicons name="bar-chart-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Reports</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* CHECK-IN / CHECK-OUT MODAL */}
      <Modal
        visible={checkInOutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckInOutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hostel Check-in / Check-out</Text>
              <TouchableOpacity onPress={() => setCheckInOutModal(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubText}>
              Scan student QR code or select room number to record arrival or departure.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: "#059669" }]}
                onPress={() => {
                  setCheckInOutModal(false);
                  Alert.alert("Success", "Student check-in recorded for Block B Room 204.");
                }}
              >
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                <Text style={styles.modalActionBtnText}>Record Check-in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: "#D97706" }]}
                onPress={() => {
                  setCheckInOutModal(false);
                  Alert.alert("Success", "Student check-out recorded.");
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                <Text style={styles.modalActionBtnText}>Record Check-out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ROLE SWITCHER */}
      <RoleSwitcherModal
        visible={roleSwitcherVisible}
        currentRole="hostel_manager"
        onClose={() => setRoleSwitcherVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#062E25",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  sidebar: {
    width: 260,
    backgroundColor: "#062E25",
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
    backgroundColor: "#059669",
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
  hostelBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(5, 150, 105, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
    gap: 6,
  },
  hostelBadgeText: {
    color: "#6EE7B7",
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
    backgroundColor: "#047857",
  },
  sidebarItemText: {
    fontSize: 14,
    color: "#A7F3D0",
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
    backgroundColor: "#059669",
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
    color: "#6EE7B7",
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
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  roleSwitchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
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
    backgroundColor: "#059669",
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
  twoColRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  colStack: {
    flexDirection: "column",
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
    color: "#059669",
  },
  donutContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  donutRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
  },
  donutInner: {
    alignItems: "center",
  },
  donutPercent: {
    fontSize: 22,
    fontWeight: "900",
    color: "#047857",
  },
  donutSub: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  legendCol: {
    gap: 8,
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
  legendLabel: {
    fontSize: 12,
    color: "#64748B",
    width: 110,
  },
  legendVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  complaintsList: {
    gap: 10,
  },
  complaintRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  complaintIcon: {
    marginRight: 10,
  },
  complaintContent: {
    flex: 1,
  },
  complaintTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  complaintMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
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
  promoBanner: {
    backgroundColor: "#064E3B",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promoContent: {
    flex: 1,
    paddingRight: 16,
  },
  promoHeading: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  promoSub: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6EE7B7",
    marginBottom: 6,
  },
  promoDesc: {
    fontSize: 12,
    color: "#A7F3D0",
    lineHeight: 16,
  },
  promoIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
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
    color: "#059669",
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
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubText: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 20,
    lineHeight: 18,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  modalActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

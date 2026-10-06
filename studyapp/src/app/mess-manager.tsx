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

export default function MessManagerDashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [roleSwitcherVisible, setRoleSwitcherVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "menu" | "feedback" | "complaints" | "reports">("home");
  const [menuModalVisible, setMenuModalVisible] = useState(false);

  const todayMenu = [
    {
      id: "m-1",
      meal: "Breakfast",
      items: "Idli + Chutney, Upma, Tea",
      status: "Served",
      statusColor: "#059669",
      statusBg: "#ECFDF5",
      time: "07:30 AM - 09:30 AM",
    },
    {
      id: "m-2",
      meal: "Lunch",
      items: "Rice + Sambar, Veg Curry, Curd",
      status: "Ongoing",
      statusColor: "#D97706",
      statusBg: "#FEF3C7",
      time: "12:30 PM - 02:30 PM",
    },
    {
      id: "m-3",
      meal: "Dinner",
      items: "Roti + Dal, Veg Curry, Salad",
      status: "Upcoming",
      statusColor: "#2563EB",
      statusBg: "#EFF6FF",
      time: "07:30 PM - 09:30 PM",
    },
  ];

  const complaints = [
    {
      id: "c-1",
      title: "Food quality issue",
      meta: "12 Oct 2025 • Mess 1",
      status: "Pending",
      badgeColor: "#EA580C",
      badgeBg: "#FFF7ED",
    },
    {
      id: "c-2",
      title: "Late serving",
      meta: "11 Oct 2025 • Mess 2",
      status: "In Progress",
      badgeColor: "#0284C7",
      badgeBg: "#F0F9FF",
    },
  ];

  const navItems = [
    { id: "home", label: "Home", icon: "home-outline" as const, action: () => setActiveTab("home") },
    { id: "menu", label: "Menu", icon: "restaurant-outline" as const, action: () => router.push("/mess") },
    { id: "feedback", label: "Feedback", icon: "star-outline" as const, action: () => Alert.alert("Student Feedback", "Average Rating: 4.2 / 5.0 across 120 verified reviews.") },
    { id: "complaints", label: "Complaints", icon: "alert-circle-outline" as const, action: () => router.push("/admin/requests") },
    { id: "notices", label: "Mess Notices", icon: "megaphone-outline" as const, action: () => router.push("/admin/notices") },
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
                <Ionicons name="restaurant" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.brandTitle}>Campusly</Text>
            </View>

            {/* Subtitle pill */}
            <View style={styles.messBadge}>
              <Ionicons name="nutrition" size={14} color="#FDBA74" />
              <Text style={styles.messBadgeText}>Mess Operations</Text>
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
                      color={isActive ? "#FFFFFF" : "#FDBA74"}
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
                <Text style={styles.userAvatarText}>PN</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>Priya Nair</Text>
                <Text style={styles.userRole}>priya.mess@gmail.com</Text>
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
                <Text style={styles.greetingTitle}>Good Morning, Priya Nair 👋</Text>
                <Text style={styles.greetingSub}>Here's today's mess overview</Text>
              </View>
            </View>

            <View style={styles.topBarRight}>
              <TouchableOpacity
                style={styles.roleSwitchBtn}
                onPress={() => setRoleSwitcherVisible(true)}
              >
                <Ionicons name="swap-horizontal" size={16} color="#EA580C" />
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
                <Text style={styles.avatarCircleText}>PN</Text>
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
              {/* Today's Menu */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }]}
                onPress={() => router.push("/mess")}
              >
                <Text style={[styles.statLabel, { color: "#C2410C" }]}>Today's Menu</Text>
                <View style={styles.statActionRow}>
                  <Text style={[styles.statActionText, { color: "#EA580C" }]}>View Menu</Text>
                  <Ionicons name="arrow-forward" size={16} color="#EA580C" />
                </View>
              </TouchableOpacity>

              {/* Students */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#ECFEFF", borderColor: "#CFFAFE" }]}
                onPress={() => router.push("/admin/student")}
              >
                <Text style={[styles.statLabel, { color: "#0E7490" }]}>Students</Text>
                <Text style={[styles.statValue, { color: "#155E75" }]}>480</Text>
              </TouchableOpacity>

              {/* Complaints */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#FFF1F2", borderColor: "#FFE4E6" }]}
                onPress={() => router.push("/admin/requests")}
              >
                <Text style={[styles.statLabel, { color: "#BE123C" }]}>Complaints</Text>
                <Text style={[styles.statValue, { color: "#9F1239" }]}>5</Text>
              </TouchableOpacity>
            </View>

            {/* TODAY'S MENU CARD */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Menu</Text>
                <TouchableOpacity onPress={() => router.push("/mess")}>
                  <Text style={styles.linkText}>Edit Menu</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.menuItemsList}>
                {todayMenu.map((m) => (
                  <View key={m.id} style={styles.menuRow}>
                    <View style={styles.mealBadge}>
                      <Text style={styles.mealBadgeText}>{m.meal}</Text>
                    </View>

                    <View style={styles.menuItemDetails}>
                      <Text style={styles.menuItemText}>{m.items}</Text>
                      <Text style={styles.menuItemTime}>{m.time}</Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: m.statusBg }]}>
                      <Text style={[styles.statusBadgeText, { color: m.statusColor }]}>
                        {m.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* STUDENT FEEDBACK & RECENT COMPLAINTS */}
            <View style={[styles.twoColRow, !isDesktop && styles.colStack]}>
              {/* Left: Student Feedback */}
              <View style={[styles.sectionCard, { flex: 1 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Student Feedback</Text>
                  <TouchableOpacity onPress={() => Alert.alert("Feedback", "120 reviews collected this month.")}>
                    <Text style={styles.linkText}>View Details</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.feedbackContainer}>
                  <View style={styles.ratingBox}>
                    <Text style={styles.ratingNumber}>4.2</Text>
                    <View style={styles.starsRow}>
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Ionicons name="star-half" size={16} color="#F59E0B" />
                    </View>
                    <Text style={styles.reviewCount}>(120 reviews)</Text>
                  </View>

                  <View style={styles.ratingProgressList}>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>Food Quality</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: "88%" }]} />
                      </View>
                      <Text style={styles.progressVal}>4.4</Text>
                    </View>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>Cleanliness</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: "84%" }]} />
                      </View>
                      <Text style={styles.progressVal}>4.2</Text>
                    </View>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>Service Speed</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: "78%" }]} />
                      </View>
                      <Text style={styles.progressVal}>3.9</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Right: Recent Complaints */}
              <View style={[styles.sectionCard, { flex: 1 }]}>
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
                        <Ionicons name="fast-food-outline" size={20} color="#EA580C" />
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

            {/* BOTTOM BANNER */}
            <View style={styles.promoBanner}>
              <View style={styles.promoContent}>
                <Text style={styles.promoHeading}>Healthy Food</Text>
                <Text style={styles.promoSub}>Happy Students</Text>
                <Text style={styles.promoDesc}>
                  Balanced nutrition, freshly prepared daily batches, and high hygiene standards across all messes.
                </Text>
              </View>
              <View style={styles.promoIconCircle}>
                <Ionicons name="restaurant" size={38} color="#EA580C" />
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
                  color={activeTab === "home" ? "#EA580C" : "#64748B"}
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
                onPress={() => router.push("/mess")}
              >
                <Ionicons name="restaurant-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Menu</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => Alert.alert("Feedback", "Rating: 4.2 / 5.0")}
              >
                <Ionicons name="star-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Feedback</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => router.push("/admin/requests")}
              >
                <Ionicons name="alert-circle-outline" size={20} color="#64748B" />
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

      {/* ROLE SWITCHER */}
      <RoleSwitcherModal
        visible={roleSwitcherVisible}
        currentRole="mess_manager"
        onClose={() => setRoleSwitcherVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#3E1806",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  sidebar: {
    width: 260,
    backgroundColor: "#3E1806",
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
    backgroundColor: "#EA580C",
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
  messBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(234, 88, 12, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
    gap: 6,
  },
  messBadgeText: {
    color: "#FDBA74",
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
    backgroundColor: "#C2410C",
  },
  sidebarItemText: {
    fontSize: 14,
    color: "#FDBA74",
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
    backgroundColor: "#EA580C",
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
    color: "#FDBA74",
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
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  roleSwitchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
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
    backgroundColor: "#EA580C",
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
    justifyContent: "center",
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
  statActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statActionText: {
    fontSize: 15,
    fontWeight: "800",
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
    color: "#EA580C",
  },
  menuItemsList: {
    gap: 10,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  mealBadge: {
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 12,
  },
  mealBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#C2410C",
  },
  menuItemDetails: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  menuItemTime: {
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
  twoColRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  colStack: {
    flexDirection: "column",
  },
  feedbackContainer: {
    paddingVertical: 8,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  ratingNumber: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewCount: {
    fontSize: 12,
    color: "#64748B",
  },
  ratingProgressList: {
    gap: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressLabel: {
    width: 90,
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 4,
  },
  progressVal: {
    width: 28,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "right",
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
  promoBanner: {
    backgroundColor: "#7C2D12",
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
    color: "#FDBA74",
    marginBottom: 6,
  },
  promoDesc: {
    fontSize: 12,
    color: "#FED7AA",
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
    color: "#EA580C",
    fontWeight: "800",
  },
});

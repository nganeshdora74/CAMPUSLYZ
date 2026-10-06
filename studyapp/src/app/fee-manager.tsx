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

export default function FeeManagerDashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [roleSwitcherVisible, setRoleSwitcherVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "records" | "collection" | "dues" | "reports">("home");
  const [collectModalVisible, setCollectModalVisible] = useState(false);

  const duesByBranch = [
    { branch: "CSE", amount: "₹ 2,50,000", students: "45 students", color: "#2563EB", bg: "#EFF6FF" },
    { branch: "ECE", amount: "₹ 1,80,000", students: "32 students", color: "#7C3AED", bg: "#F5F3FF" },
    { branch: "ME", amount: "₹ 1,20,000", students: "26 students", color: "#D97706", bg: "#FFFBEB" },
    { branch: "EEE", amount: "₹ 1,10,000", students: "20 students", color: "#DC2626", bg: "#FEF2F2" },
  ];

  const monthlyBars = [
    { month: "Jun", collectedHeight: 45, pendingHeight: 25 },
    { month: "Jul", collectedHeight: 65, pendingHeight: 35 },
    { month: "Aug", collectedHeight: 80, pendingHeight: 40 },
    { month: "Sep", collectedHeight: 70, pendingHeight: 30 },
    { month: "Oct", collectedHeight: 90, pendingHeight: 20 },
    { month: "Nov", collectedHeight: 60, pendingHeight: 45 },
  ];

  const navItems = [
    { id: "home", label: "Home", icon: "home-outline" as const, action: () => setActiveTab("home") },
    { id: "records", label: "Fee Records", icon: "document-text-outline" as const, action: () => router.push("/admin/fees") },
    { id: "collection", label: "Collection", icon: "card-outline" as const, action: () => setCollectModalVisible(true) },
    { id: "dues", label: "Pending Dues", icon: "time-outline" as const, action: () => router.push("/admin/fees") },
    { id: "status", label: "Payment Status", icon: "checkmark-circle-outline" as const, action: () => router.push("/admin/fees") },
    { id: "receipts", label: "Fee Receipts", icon: "receipt-outline" as const, action: () => Alert.alert("Receipts", "Instant digital fee receipts with university seal.") },
    { id: "reports", label: "Reports", icon: "bar-chart-outline" as const, action: () => router.push("/admin/reports") },
    { id: "notices", label: "Notices", icon: "megaphone-outline" as const, action: () => router.push("/admin/notices") },
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
                <Ionicons name="wallet" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.brandTitle}>Campusly</Text>
            </View>

            {/* Subtitle pill */}
            <View style={styles.feeBadge}>
              <Ionicons name="cash" size={14} color="#7DD3FC" />
              <Text style={styles.feeBadgeText}>Finance & Fees</Text>
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
                      color={isActive ? "#FFFFFF" : "#7DD3FC"}
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
                <Text style={styles.userAvatarText}>VS</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>Vikram Singh</Text>
                <Text style={styles.userRole}>Fee Manager</Text>
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
                <Text style={styles.greetingTitle}>Welcome, Vikram Singh 👋</Text>
                <Text style={styles.greetingSub}>Fee Management Dashboard</Text>
              </View>
            </View>

            <View style={styles.topBarRight}>
              <TouchableOpacity
                style={styles.roleSwitchBtn}
                onPress={() => setRoleSwitcherVisible(true)}
              >
                <Ionicons name="swap-horizontal" size={16} color="#0284C7" />
                <Text style={styles.roleSwitchText}>Switch Role</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconCircle}
                onPress={() => router.push("/admin/fees")}
              >
                <Ionicons name="notifications-outline" size={18} color="#475569" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarCircle}
                onPress={() => router.push("/admin/profile")}
              >
                <Text style={styles.avatarCircleText}>VS</Text>
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
              {/* Total Students */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#E0F2FE", borderColor: "#BAE6FD" }]}
                onPress={() => router.push("/admin/student")}
              >
                <Text style={[styles.statLabel, { color: "#0369A1" }]}>Total Students</Text>
                <Text style={[styles.statValue, { color: "#0C4A6E" }]}>480</Text>
              </TouchableOpacity>

              {/* Collected */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}
                onPress={() => router.push("/admin/fees")}
              >
                <Text style={[styles.statLabel, { color: "#15803D" }]}>Collected</Text>
                <Text style={[styles.statValue, { color: "#14532D" }]}>₹ 24,80,000</Text>
              </TouchableOpacity>

              {/* Pending */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}
                onPress={() => router.push("/admin/fees")}
              >
                <Text style={[styles.statLabel, { color: "#EA580C" }]}>Pending</Text>
                <Text style={[styles.statValue, { color: "#9A3412" }]}>₹ 6,20,000</Text>
              </TouchableOpacity>
            </View>

            {/* FEE COLLECTION OVERVIEW & PENDING DUES */}
            <View style={[styles.twoColRow, !isDesktop && styles.colStack]}>
              {/* Left: Fee Collection Overview Chart */}
              <View style={[styles.sectionCard, { flex: 1.2 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Fee Collection Overview</Text>
                  <View style={styles.chartLegend}>
                    <View style={styles.legendPair}>
                      <View style={[styles.legendDot, { backgroundColor: "#0284C7" }]} />
                      <Text style={styles.legendText}>Collected</Text>
                    </View>
                    <View style={styles.legendPair}>
                      <View style={[styles.legendDot, { backgroundColor: "#F97316" }]} />
                      <Text style={styles.legendText}>Pending</Text>
                    </View>
                  </View>
                </View>

                {/* Simulated Bar Chart */}
                <View style={styles.barChartContainer}>
                  <View style={styles.barChartGrid}>
                    {monthlyBars.map((b, i) => (
                      <View key={i} style={styles.barGroup}>
                        <View style={styles.barsPair}>
                          <View
                            style={[
                              styles.singleBar,
                              { height: b.collectedHeight, backgroundColor: "#0284C7" },
                            ]}
                          />
                          <View
                            style={[
                              styles.singleBar,
                              { height: b.pendingHeight, backgroundColor: "#F97316" },
                            ]}
                          />
                        </View>
                        <Text style={styles.barMonthLabel}>{b.month}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Right: Pending Dues */}
              <View style={[styles.sectionCard, { flex: 1 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pending Dues</Text>
                  <TouchableOpacity onPress={() => router.push("/admin/fees")}>
                    <Text style={styles.linkText}>View All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.duesList}>
                  {duesByBranch.map((d, i) => (
                    <View key={i} style={styles.dueRow}>
                      <View style={[styles.branchBadge, { backgroundColor: d.bg }]}>
                        <Text style={[styles.branchBadgeText, { color: d.color }]}>
                          {d.branch}
                        </Text>
                      </View>

                      <View style={styles.dueDetails}>
                        <Text style={styles.dueAmount}>{d.amount}</Text>
                        <Text style={styles.dueStudents}>{d.students}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.remindBtn}
                        onPress={() => Alert.alert("Reminder Sent", `Payment reminder SMS & Email sent to ${d.branch} students.`)}
                      >
                        <Text style={styles.remindBtnText}>Remind</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* 4 QUICK ACTIONS */}
            <View style={styles.sectionCard}>
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push("/admin/fees")}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: "#E0F2FE" }]}>
                    <Ionicons name="document-text-outline" size={22} color="#0284C7" />
                  </View>
                  <Text style={styles.actionTitle}>Fee Records</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => setCollectModalVisible(true)}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: "#DCFCE7" }]}>
                    <Ionicons name="card-outline" size={22} color="#15803D" />
                  </View>
                  <Text style={styles.actionTitle}>Collect Payment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => Alert.alert("Receipts", "Generate PDF Receipt with QR verification.")}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: "#FEF3C7" }]}>
                    <Ionicons name="receipt-outline" size={22} color="#D97706" />
                  </View>
                  <Text style={styles.actionTitle}>Fee Receipts</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push("/admin/reports")}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: "#F3E8FF" }]}>
                    <Ionicons name="bar-chart-outline" size={22} color="#7E22CE" />
                  </View>
                  <Text style={styles.actionTitle}>Reports</Text>
                </TouchableOpacity>
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
                  color={activeTab === "home" ? "#0284C7" : "#64748B"}
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
                onPress={() => router.push("/admin/fees")}
              >
                <Ionicons name="document-text-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Records</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => setCollectModalVisible(true)}
              >
                <Ionicons name="card-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Collection</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => router.push("/admin/fees")}
              >
                <Ionicons name="time-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Dues</Text>
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

      {/* COLLECT PAYMENT MODAL */}
      <Modal
        visible={collectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCollectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Collect Student Fee</Text>
              <TouchableOpacity onPress={() => setCollectModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubText}>
              Record Cash, UPI, Netbanking or Cheque payment against student roll number.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: "#0284C7" }]}
                onPress={() => {
                  setCollectModalVisible(false);
                  router.push("/admin/fees");
                }}
              >
                <Ionicons name="arrow-forward-circle" size={18} color="#FFFFFF" />
                <Text style={styles.modalActionBtnText}>Open Fee Entry Form</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ROLE SWITCHER */}
      <RoleSwitcherModal
        visible={roleSwitcherVisible}
        currentRole="fee_manager"
        onClose={() => setRoleSwitcherVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#06283D",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  sidebar: {
    width: 260,
    backgroundColor: "#06283D",
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
    backgroundColor: "#0284C7",
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
  feeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2, 132, 199, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
    gap: 6,
  },
  feeBadgeText: {
    color: "#7DD3FC",
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
    backgroundColor: "#0369A1",
  },
  sidebarItemText: {
    fontSize: 14,
    color: "#7DD3FC",
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
    backgroundColor: "#0284C7",
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
    color: "#7DD3FC",
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
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  roleSwitchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
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
    backgroundColor: "#0284C7",
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
    fontSize: 24,
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
  chartLegend: {
    flexDirection: "row",
    gap: 12,
  },
  legendPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: "#64748B",
  },
  barChartContainer: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  barChartGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 120,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 4,
  },
  barGroup: {
    alignItems: "center",
  },
  barsPair: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  singleBar: {
    width: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barMonthLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 6,
    fontWeight: "600",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0284C7",
  },
  duesList: {
    gap: 10,
  },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  branchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  branchBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  dueDetails: {
    flex: 1,
  },
  dueAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  dueStudents: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  remindBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  remindBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
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
    color: "#0284C7",
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
  modalActions: {
    gap: 10,
  },
  modalActionBtn: {
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

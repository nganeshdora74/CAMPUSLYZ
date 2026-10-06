import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
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
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { sendBroadcastNotification } from "../services/notificationService";
import RoleSwitcherModal from "../components/RoleSwitcherModal";

export default function NoticeManagerDashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [roleSwitcherVisible, setRoleSwitcherVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "create" | "manage" | "scheduled" | "reports">("home");
  const [createNoticeModal, setCreateNoticeModal] = useState(false);

  // Live Notices State
  const [notices, setNotices] = useState<any[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // New notice form - default target is "Hostel Students"
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeTarget, setNoticeTarget] = useState<"Hostel Students" | "All Students">("Hostel Students");
  const [noticeBody, setNoticeBody] = useState("");

  // Live listener on Firestore notices collection
  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setNotices(loaded);
        setLoadingNotices(false);
      },
      (err) => {
        console.warn("Notices listener error:", err);
        setNotices([]);
        setLoadingNotices(false);
      }
    );
    return () => unsub();
  }, []);

  const totalNoticesCount = notices.length;
  const hostelNoticesCount = notices.filter(
    (n) =>
      n.target === "Hostel Students" ||
      n.target === "Hostel Only" ||
      n.isHostelOnly ||
      n.isHostelNotice
  ).length;
  const publishedNoticesCount = notices.filter((n) => n.status !== "Draft").length;

  const handlePublishNotice = async () => {
    if (!noticeTitle.trim()) {
      Alert.alert("Missing Title", "Please provide a notice title.");
      return;
    }
    if (!noticeBody.trim()) {
      Alert.alert("Missing Content", "Please enter notice description or body.");
      return;
    }

    try {
      setPublishing(true);
      const isHostel = noticeTarget === "Hostel Students";

      // 1. Add to notices collection
      const docRef = await addDoc(collection(db, "notices"), {
        title: noticeTitle.trim(),
        description: noticeBody.trim(),
        body: noticeBody.trim(),
        content: noticeBody.trim(),
        target: noticeTarget,
        audience: noticeTarget,
        isHostelOnly: isHostel,
        isHostelNotice: isHostel,
        publishedBy: "Anita Verma (Notice Manager)",
        publishedByRole: "notice_manager",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: "Published",
        createdAt: serverTimestamp(),
      });

      // 2. Dispatch Live Broadcast Notification (reaches hostel students or all students)
      await sendBroadcastNotification({
        title: `📢 ${noticeTitle.trim()}`,
        message: noticeBody.trim(),
        target: isHostel ? "Hostel Students" : "All Students",
        type: "notice",
        actionRoute: "/(tab)/notices",
        metadata: {
          noticeId: docRef.id,
          target: noticeTarget,
          isHostelOnly: isHostel,
        },
      });

      // 3. Log activity
      await addDoc(collection(db, "activities"), {
        title: `Notice Published: "${noticeTitle.trim()}" for ${noticeTarget}`,
        time: "Just now",
        user: "Notice Manager",
        type: "notice",
        createdAt: serverTimestamp(),
      });

      setCreateNoticeModal(false);
      setNoticeTitle("");
      setNoticeBody("");
      Alert.alert(
        "Notice Broadcasted! 📢",
        `Your announcement "${noticeTitle.trim()}" has been published and notifications were dispatched to ${noticeTarget}.`
      );
    } catch (e: any) {
      Alert.alert("Publish Failed", e?.message || "Could not publish notice.");
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteNotice = async (noticeId: string, title: string) => {
    Alert.alert("Delete Notice", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "notices", noticeId));
            Alert.alert("Deleted", "Notice removed from campus portal.");
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Could not delete notice.");
          }
        },
      },
    ]);
  };

  const navItems = [
    { id: "home", label: "Home", icon: "home-outline" as const, action: () => setActiveTab("home") },
    { id: "create", label: "Create Notice", icon: "add-circle-outline" as const, action: () => setCreateNoticeModal(true) },
    { id: "manage", label: "Manage Notices", icon: "newspaper-outline" as const, action: () => router.push("/admin/notices") },
    { id: "scheduled", label: "Scheduled Notices", icon: "calendar-outline" as const, action: () => Alert.alert("Scheduled", "4 scheduled notices set for upcoming university events.") },
    { id: "department", label: "Department Notices", icon: "business-outline" as const, action: () => router.push("/admin/notices") },
    { id: "campus", label: "Campus Notices", icon: "megaphone-outline" as const, action: () => router.push("/admin/notices") },
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
                <Ionicons name="megaphone" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.brandTitle}>Campusly</Text>
            </View>

            {/* Subtitle pill */}
            <View style={styles.noticeBadge}>
              <Ionicons name="notifications" size={14} color="#F472B6" />
              <Text style={styles.noticeBadgeText}>Notice Operations</Text>
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
                      color={isActive ? "#FFFFFF" : "#F472B6"}
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
                <Text style={styles.userAvatarText}>AV</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>Anita Verma</Text>
                <Text style={styles.userRole}>anita.notice@gmail.com</Text>
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
                <Text style={styles.greetingTitle}>Welcome, Anita Verma 👋</Text>
                <Text style={styles.greetingSub}>Manage Campus Notices</Text>
              </View>
            </View>

            <View style={styles.topBarRight}>
              <TouchableOpacity
                style={styles.createBtnTop}
                onPress={() => setCreateNoticeModal(true)}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.createBtnTopText}>Create</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roleSwitchBtn}
                onPress={() => setRoleSwitcherVisible(true)}
              >
                <Ionicons name="swap-horizontal" size={16} color="#BE185D" />
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
                <Text style={styles.avatarCircleText}>AV</Text>
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
              {/* Total Notices */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#FCE7F3", borderColor: "#FBCFE8" }]}
                onPress={() => router.push("/admin/notices")}
              >
                <Text style={[styles.statLabel, { color: "#BE185D" }]}>Total Notices</Text>
                <Text style={[styles.statValue, { color: "#9D174D" }]}>{totalNoticesCount}</Text>
              </TouchableOpacity>

              {/* Hostel Notices */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}
                onPress={() => router.push("/admin/notices")}
              >
                <Text style={[styles.statLabel, { color: "#15803D" }]}>Hostel Notices</Text>
                <Text style={[styles.statValue, { color: "#14532D" }]}>{hostelNoticesCount}</Text>
              </TouchableOpacity>

              {/* Published */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}
                onPress={() => router.push("/admin/notices")}
              >
                <Text style={[styles.statLabel, { color: "#B45309" }]}>Published</Text>
                <Text style={[styles.statValue, { color: "#78350F" }]}>{publishedNoticesCount}</Text>
              </TouchableOpacity>

              {/* Active Audience */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#F3E8FF", borderColor: "#E9D5FF" }]}
                onPress={() => setCreateNoticeModal(true)}
              >
                <Text style={[styles.statLabel, { color: "#7E22CE" }]}>Audience</Text>
                <Text style={[styles.statValue, { color: "#581C87", fontSize: 15 }]}>Hostel & Campus</Text>
              </TouchableOpacity>
            </View>

            {/* RECENT NOTICES SECTION */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Notices</Text>
                <TouchableOpacity onPress={() => router.push("/admin/notices")}>
                  <Text style={styles.linkText}>View All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.noticesList}>
                {loadingNotices ? (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <ActivityIndicator size="small" color="#BE185D" />
                  </View>
                ) : notices.length === 0 ? (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <Text style={{ color: "#94A3B8", fontSize: 13 }}>
                      No notices published yet. Tap "Create" to broadcast to Hostel Students.
                    </Text>
                  </View>
                ) : (
                  notices.slice(0, 8).map((n) => {
                    const isHostel =
                      n.target === "Hostel Students" ||
                      n.target === "Hostel Only" ||
                      n.isHostelOnly ||
                      n.isHostelNotice;
                    return (
                      <View key={n.id} style={styles.noticeRow}>
                        <View
                          style={[
                            styles.noticeIconCircle,
                            isHostel && { backgroundColor: "#ECFDF5" },
                          ]}
                        >
                          <Ionicons
                            name={isHostel ? "bed-outline" : "document-text-outline"}
                            size={20}
                            color={isHostel ? "#059669" : "#BE185D"}
                          />
                        </View>

                        <View style={styles.noticeInfo}>
                          <Text style={styles.noticeTitle}>{n.title}</Text>
                          <Text style={styles.noticeMeta}>
                            {n.date || "Recent"} • {n.target || n.audience || "Hostel Students"}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: isHostel ? "#DCFCE7" : "#FCE7F3" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: isHostel ? "#15803D" : "#BE185D" },
                              ]}
                            >
                              {n.status || "Published"}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => handleDeleteNotice(n.id, n.title)}
                            style={{ padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={17} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {/* BOTTOM BANNER */}
            <View style={styles.promoBanner}>
              <View style={styles.promoContent}>
                <Text style={styles.promoHeading}>Stay Informed</Text>
                <Text style={styles.promoSub}>Stay Ahead</Text>
                <Text style={styles.promoDesc}>
                  Deliver instant alerts, circulars, exam schedules, and holiday broadcasts to all students and staff.
                </Text>
              </View>
              <View style={styles.promoIconCircle}>
                <Ionicons name="megaphone" size={38} color="#BE185D" />
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
                  color={activeTab === "home" ? "#BE185D" : "#64748B"}
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
                onPress={() => setCreateNoticeModal(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Create</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => router.push("/admin/notices")}
              >
                <Ionicons name="newspaper-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Manage</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomNavItem}
                onPress={() => Alert.alert("Scheduled", "4 scheduled notices active.")}
              >
                <Ionicons name="calendar-outline" size={20} color="#64748B" />
                <Text style={styles.bottomNavText}>Scheduled</Text>
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

      {/* CREATE NOTICE MODAL */}
      <Modal
        visible={createNoticeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateNoticeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Draft & Publish Notice</Text>
              <TouchableOpacity onPress={() => setCreateNoticeModal(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Notice Heading (e.g. Midterm Exams Announced)"
              value={noticeTitle}
              onChangeText={setNoticeTitle}
            />

            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Notice content / body..."
              value={noticeBody}
              onChangeText={setNoticeBody}
              multiline
              numberOfLines={4}
            />

            <View style={styles.targetRow}>
              <Text style={styles.targetLabel}>Target Audience:</Text>
              {(["Hostel Students", "All Students"] as const).map((tgt) => (
                <TouchableOpacity
                  key={tgt}
                  style={[
                    styles.targetChip,
                    noticeTarget === tgt && styles.targetChipActive,
                  ]}
                  onPress={() => setNoticeTarget(tgt)}
                >
                  <Text
                    style={[
                      styles.targetChipText,
                      noticeTarget === tgt && styles.targetChipTextActive,
                    ]}
                  >
                    {tgt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: "#BE185D" }]}
                onPress={handlePublishNotice}
                disabled={publishing}
              >
                {publishing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.modalActionBtnText}>Broadcast Notice</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ROLE SWITCHER */}
      <RoleSwitcherModal
        visible={roleSwitcherVisible}
        currentRole="notice_manager"
        onClose={() => setRoleSwitcherVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#3C0D23",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  sidebar: {
    width: 260,
    backgroundColor: "#3C0D23",
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
    backgroundColor: "#BE185D",
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
  noticeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(190, 24, 93, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
    gap: 6,
  },
  noticeBadgeText: {
    color: "#F472B6",
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
    backgroundColor: "#831843",
  },
  sidebarItemText: {
    fontSize: 14,
    color: "#F472B6",
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
    backgroundColor: "#BE185D",
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
    color: "#F472B6",
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
  createBtnTop: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#BE185D",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  createBtnTopText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  roleSwitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF2F8",
    borderWidth: 1,
    borderColor: "#FBCFE8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  roleSwitchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#BE185D",
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
    backgroundColor: "#BE185D",
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
    color: "#BE185D",
  },
  noticesList: {
    gap: 10,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  noticeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FDF2F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  noticeInfo: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  noticeMeta: {
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
  promoBanner: {
    backgroundColor: "#831843",
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
    color: "#F472B6",
    marginBottom: 6,
  },
  promoDesc: {
    fontSize: 12,
    color: "#FCE7F3",
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
    color: "#BE185D",
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
    maxWidth: 440,
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
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  modalTextArea: {
    height: 90,
    textAlignVertical: "top",
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginRight: 4,
  },
  targetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  targetChipActive: {
    backgroundColor: "#FCE7F3",
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  targetChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  targetChipTextActive: {
    color: "#BE185D",
    fontWeight: "700",
  },
  modalActions: {
    marginTop: 4,
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
    fontSize: 14,
    fontWeight: "700",
  },
});

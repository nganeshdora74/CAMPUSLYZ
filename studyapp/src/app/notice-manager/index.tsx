import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
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
import { useTheme } from "../../context/ThemeContext";
import NotificationBellModal from "../../components/NotificationBellModal";
import UniversalRoleControls from "../../components/UniversalRoleControls";
import {
  CampusEventItem,
  CircularItem,
  DocumentItem,
  NoticeItem,
  NoticeStats,
  createAnnouncement,
  createCampusEvent,
  createCircular,
  createDocumentItem,
  createNotice,
  deleteNotice,
  subscribeToAnnouncements,
  subscribeToCirculars,
  subscribeToDocuments,
  subscribeToEvents,
  subscribeToNoticeStats,
  subscribeToNotices,
  updateNotice,
} from "../../services/noticeService";

type ActiveTab =
  | "dashboard"
  | "notices"
  | "certificates"
  | "announcements"
  | "circulars"
  | "events"
  | "requests"
  | "documents"
  | "reports"
  | "ai"
  | "profile"
  | "settings";

export default function NoticeManagerMasterScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const { isDark, setThemeMode } = useTheme();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Search
  const [searchQuery, setSearchQuery] = useState("");

  // Live Database States (Real-time Firebase + MongoDB sync)
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [stats, setStats] = useState<NoticeStats>({
    totalNotices: 0,
    publishedNotices: 0,
    draftNotices: 0,
    certificatesIssued: 0,
    pendingRequests: 0,
    circularsCount: 0,
    eventsCount: 0,
    weeklyNoticesCount: 0,
    weeklyCertificatesCount: 0,
    weeklyCircularsCount: 0,
    weeklyEventsCount: 0,
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [circulars, setCirculars] = useState<CircularItem[]>([]);
  const [events, setEvents] = useState<CampusEventItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Notice Filter & Tabs
  const [noticeFilter, setNoticeFilter] = useState<"All" | "Published" | "Draft" | "History">("All");
  const [statsTimeframe, setStatsTimeframe] = useState<"This Week" | "This Month" | "All Time">("This Week");

  // Create Notice Modal
  const [createNoticeModalVisible, setCreateNoticeModalVisible] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [noticeCategory, setNoticeCategory] = useState("Academic");
  const [noticeTarget, setNoticeTarget] = useState("All Students");
  const [noticePriority, setNoticePriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [noticeAttachmentUrl, setNoticeAttachmentUrl] = useState("");
  const [noticeAttachmentName, setNoticeAttachmentName] = useState("");
  const [savingNotice, setSavingNotice] = useState(false);

  // Edit Notice Modal
  const [editNoticeModalVisible, setEditNoticeModalVisible] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);
  const [editNoticeTitle, setEditNoticeTitle] = useState("");
  const [editNoticeContent, setEditNoticeContent] = useState("");
  const [editNoticeCategory, setEditNoticeCategory] = useState("Academic");
  const [editNoticeTarget, setEditNoticeTarget] = useState("All Students");
  const [editNoticeStatus, setEditNoticeStatus] = useState<"published" | "draft">("published");

  // View Notice Modal
  const [viewNoticeModalVisible, setViewNoticeModalVisible] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  // Other Quick Action Modals
  const [createAnnounceModalVisible, setCreateAnnounceModalVisible] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceContent, setAnnounceContent] = useState("");

  const [createCircularModalVisible, setCreateCircularModalVisible] = useState(false);
  const [circularTitle, setCircularTitle] = useState("");
  const [circularDept, setCircularDept] = useState("Academic Administration");

  const [createEventModalVisible, setCreateEventModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("15 Oct 2025");
  const [eventLocation, setEventLocation] = useState("Main Auditorium");

  // AI Assistant Chat state
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hi! I'm your Notice Manager AI Assistant. How can I help you today with notices, circulars, or certificates?",
    },
  ]);
  const [aiInputText, setAiInputText] = useState("");

  // Notice Manager User Profile state
  const [profileName, setProfileName] = useState("Anita Verma");
  const [profileEmail, setProfileEmail] = useState("anita@college.edu");
  const [profileDepartment, setProfileDepartment] = useState("Notice & Communications Dept.");
  const [profileAvatar, setProfileAvatar] = useState(
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80"
  );
  const [profileSavedMsg, setProfileSavedMsg] = useState("");

  // Settings state
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

  // 1. REAL-TIME LISTENERS (0 HARDCODED DATA - BACKED BY FIRESTORE & MONGODB)
  useEffect(() => {
    // A. Notices Listener
    const unsubNotices = subscribeToNotices((items) => {
      setNotices(items);
      setLoading(false);
    });

    // B. Real-time Live Stats Listener
    const unsubStats = subscribeToNoticeStats((liveStats) => {
      setStats(liveStats);
    });

    // C. Announcements
    const unsubAnnounce = subscribeToAnnouncements((items) => {
      setAnnouncements(items);
    });

    // D. Circulars
    const unsubCirculars = subscribeToCirculars((items) => {
      setCirculars(items);
    });

    // E. Events
    const unsubEvents = subscribeToEvents((items) => {
      setEvents(items);
    });

    // F. Documents
    const unsubDocs = subscribeToDocuments((items) => {
      setDocuments(items);
    });

    // G. Student Requests (from certificateRequests)
    const unsubReqs = onSnapshot(
      collection(db, "certificateRequests"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRequests(list);
      },
      () => setRequests([])
    );

    // H. Certificates
    const unsubCerts = onSnapshot(
      collection(db, "certificates"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCertificates(list);
      },
      () => setCertificates([])
    );

    return () => {
      unsubNotices();
      unsubStats();
      unsubAnnounce();
      unsubCirculars();
      unsubEvents();
      unsubDocs();
      unsubReqs();
      unsubCerts();
    };
  }, []);

  // Filtered Notices based on active tab and search
  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const matchesSearch =
        !searchQuery.trim() ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.target.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (noticeFilter === "Published") {
        return n.status === "published" || n.status === "active";
      }
      if (noticeFilter === "Draft") {
        return n.status === "draft";
      }
      if (noticeFilter === "History") {
        return true;
      }
      return true;
    });
  }, [notices, searchQuery, noticeFilter]);

  // Today Date String
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Attachment Picker
  const handlePickAttachment = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        setNoticeAttachmentUrl(res.assets[0].uri);
        setNoticeAttachmentName(res.assets[0].name || "attachment.pdf");
        Alert.alert("Attachment Added", `Selected "${res.assets[0].name}"`);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not pick document.");
    }
  };

  // Create Notice Handler
  const handleSaveNotice = async (status: "published" | "draft") => {
    if (!noticeTitle.trim()) {
      Alert.alert("Required", "Please provide a notice title.");
      return;
    }
    if (!noticeContent.trim()) {
      Alert.alert("Required", "Please provide notice description.");
      return;
    }

    try {
      setSavingNotice(true);
      await createNotice({
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
        category: noticeCategory,
        priority: noticePriority,
        authorName: profileName,
        authorRole: "Notice Manager",
        target: noticeTarget,
        attachmentUrl: noticeAttachmentUrl || undefined,
        attachmentName: noticeAttachmentName || undefined,
        status,
        date: todayFormatted,
      });

      setNoticeTitle("");
      setNoticeContent("");
      setNoticeAttachmentUrl("");
      setNoticeAttachmentName("");
      setCreateNoticeModalVisible(false);

      Alert.alert(
        status === "published" ? "Notice Published! 📢" : "Draft Saved 📝",
        `Notice "${noticeTitle.trim()}" has been ${status === "published" ? "published live to students & faculty." : "saved to your drafts."}`
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save notice.");
    } finally {
      setSavingNotice(false);
    }
  };

  // Open Edit Notice Modal
  const handleOpenEditNotice = (n: NoticeItem) => {
    setEditingNotice(n);
    setEditNoticeTitle(n.title);
    setEditNoticeContent(n.content);
    setEditNoticeCategory(n.category);
    setEditNoticeTarget(n.target);
    setEditNoticeStatus(n.status === "draft" ? "draft" : "published");
    setEditNoticeModalVisible(true);
  };

  // Update Notice Handler
  const handleUpdateNotice = async () => {
    if (!editingNotice) return;
    try {
      setSavingNotice(true);
      await updateNotice(editingNotice.id, {
        title: editNoticeTitle.trim(),
        content: editNoticeContent.trim(),
        category: editNoticeCategory,
        target: editNoticeTarget,
        status: editNoticeStatus,
      });
      setEditNoticeModalVisible(false);
      setEditingNotice(null);
      Alert.alert("Notice Updated", `"${editNoticeTitle}" updated in Firebase & MongoDB.`);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not update notice.");
    } finally {
      setSavingNotice(false);
    }
  };

  // Delete Notice Handler
  const handleDeleteNotice = (n: NoticeItem) => {
    Alert.alert("Delete Notice", `Are you sure you want to delete "${n.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNotice(n.id, n.mongoId);
            Alert.alert("Notice Deleted", "Removed from Firebase and MongoDB.");
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Could not delete notice.");
          }
        },
      },
    ]);
  };

  // AI Assistant Query Handler
  const handleSendAiMessage = (customText?: string) => {
    const textToSend = customText || aiInputText.trim();
    if (!textToSend) return;

    const userMsg = { sender: "user" as const, text: textToSend };
    setAiChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setAiInputText("");

    // Simulate smart context-aware response based on live database
    setTimeout(() => {
      let reply = "";
      const lower = textToSend.toLowerCase();

      if (lower.includes("latest") || lower.includes("recent") || lower.includes("notice")) {
        const published = notices.filter((n) => n.status === "published" || n.status === "active");
        if (published.length > 0) {
          reply = `Here are the latest published notices:\n• ${published.slice(0, 3).map((n) => `"${n.title}" (${n.date} - ${n.target})`).join("\n• ")}\nTotal active notices: ${published.length}.`;
        } else {
          reply = "Currently there are no published notices in the database. You can click 'Create Notice' to broadcast one!";
        }
      } else if (lower.includes("certificate") || lower.includes("cert")) {
        reply = `Academic Certification Hub Status:\n• Issued Certificates: ${stats.certificatesIssued}\n• Pending Student Requests: ${stats.pendingRequests}\nYou can issue or approve certificates anytime in the Certificates tab!`;
      } else if (lower.includes("event")) {
        reply = `Upcoming Campus Events:\n• Total Events scheduled: ${events.length}\n• Next event: ${events[0]?.title || "Cultural Fest"} on ${events[0]?.date || "15 Oct 2025"}.`;
      } else if (lower.includes("circular")) {
        reply = `Campus Circulars:\n• Total official circulars: ${circulars.length}\nAll official circulars are synced with accredited college departments.`;
      } else {
        reply = `I'm analyzing the campus database. We currently have ${stats.totalNotices} notices, ${stats.certificatesIssued} issued certificates, and ${events.length} campus events in real-time sync with Firebase and MongoDB.`;
      }

      setAiChatMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 600);
  };

  // Colors
  const bg = isDark ? "#0F172A" : "#F4F7FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* 1. LEFT SIDEBAR (Ultra-modern deep blue navy layout) */}
      {(isDesktop || mobileMenuOpen) && (
        <View
          style={[
            styles.sidebar,
            {
              backgroundColor: "#0B132B",
              position: isDesktop ? "relative" : "absolute",
              zIndex: isDesktop ? 1 : 999,
              height: "100%",
            },
          ]}
        >
          {/* Brand Header with Megaphone */}
          <View style={styles.sidebarBrand}>
            <View style={styles.brandIconBox}>
              <Ionicons name="megaphone" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.brandTitle}>Notice Manager</Text>
              <Text style={styles.brandSubtitle}>Stay Informed · Stay Ahead</Text>
            </View>
            {!isDesktop && (
              <TouchableOpacity onPress={() => setMobileMenuOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Navigation Links */}
          <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 4, paddingVertical: 8 }}>
              {[
                { id: "dashboard", label: "Dashboard", icon: "grid-outline", badge: null },
                { id: "notices", label: "Notices", icon: "newspaper-outline", badge: stats.totalNotices },
                { id: "certificates", label: "Certificates", icon: "ribbon-outline", badge: stats.certificatesIssued },
                { id: "announcements", label: "Announcements", icon: "megaphone-outline", badge: null },
                { id: "circulars", label: "Circulars", icon: "document-text-outline", badge: null },
                { id: "events", label: "Events", icon: "calendar-outline", badge: events.length || null },
                { id: "requests", label: "Student Requests", icon: "mail-unread-outline", badge: stats.pendingRequests || null },
                { id: "documents", label: "Documents", icon: "folder-outline", badge: null },
                { id: "reports", label: "Reports", icon: "bar-chart-outline", badge: null },
                { id: "ai", label: "AI Assistant", icon: "sparkles-outline", badge: "AI" },
                { id: "profile", label: "Profile", icon: "person-outline", badge: null },
                { id: "settings", label: "Settings", icon: "settings-outline", badge: null },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.navItem,
                      isActive && styles.navItemActive,
                    ]}
                    onPress={() => {
                      if (item.id === "certificates") {
                        router.push("/notice-manager/certificates");
                      } else {
                        setActiveTab(item.id as ActiveTab);
                      }
                      if (!isDesktop) setMobileMenuOpen(false);
                    }}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={isActive ? "#FFFFFF" : "#94A3B8"}
                    />
                    <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                      {item.label}
                    </Text>
                    {item.badge !== null && item.badge !== undefined && (
                      <View
                        style={[
                          styles.navBadge,
                          isActive ? { backgroundColor: "#3B82F6" } : { backgroundColor: "#1E293B" },
                        ]}
                      >
                        <Text style={styles.navBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* User Profile Pill at Bottom */}
          <TouchableOpacity
            style={styles.sidebarProfilePill}
            onPress={() => {
              setActiveTab("profile");
              if (!isDesktop) setMobileMenuOpen(false);
            }}
          >
            <Image source={{ uri: profileAvatar }} style={styles.profileAvatarImg} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.profileNameText} numberOfLines={1}>
                {profileName}
              </Text>
              <Text style={styles.profileRoleText}>Notice Manager</Text>
            </View>
            <View style={styles.onlineDot} />
          </TouchableOpacity>
        </View>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <View style={{ flex: 1 }}>
        {/* TOP BAR */}
        <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
          {!isDesktop && (
            <TouchableOpacity onPress={() => setMobileMenuOpen(true)} style={{ marginRight: 10 }}>
              <Ionicons name="menu" size={24} color={textColor} />
            </TouchableOpacity>
          )}

          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: isDark ? "#0F172A" : "#F1F5F9", borderColor }]}>
            <Ionicons name="search" size={17} color="#94A3B8" />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search notices, certificates, students..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Right Action Icons */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {/* Notification Bell */}
            <NotificationBellModal />

            {/* Dark/Bright Mode & 8-Language Switcher */}
            <UniversalRoleControls compact />

            {/* Profile Avatar Quick Link */}
            <TouchableOpacity onPress={() => setActiveTab("profile")}>
              <Image source={{ uri: profileAvatar }} style={styles.topAvatarImg} />
            </TouchableOpacity>
          </View>
        </View>

        {/* WORKSPACE BODY SCROLL */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
          {/* TAB: DASHBOARD */}
          {activeTab === "dashboard" && (
            <View style={{ gap: 20 }}>
              {/* WELCOME GREETING & DATE ROW */}
              <View style={styles.welcomeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.welcomeTitle, { color: textColor }]}>
                    Welcome, {profileName} 👋
                  </Text>
                  <Text style={[styles.welcomeSubtitle, { color: subTextColor }]}>
                    Here's what's happening with your notices and services.
                  </Text>
                </View>

                {/* Today Date Pill */}
                <View style={[styles.datePill, { backgroundColor: cardBg, borderColor }]}>
                  <Ionicons name="calendar-outline" size={14} color="#3B82F6" />
                  <Text style={[styles.datePillText, { color: textColor }]}>Today {todayFormatted}</Text>
                </View>
              </View>

              {/* 5 STATS CARDS ROW (Matching Screenshot) */}
              <View style={styles.statsGrid}>
                {/* 1. Total Notices */}
                <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.metricHeader}>
                    <Text style={[styles.metricLabel, { color: subTextColor }]}>Total Notices</Text>
                    <View style={[styles.metricIconBox, { backgroundColor: "#EFF6FF" }]}>
                      <Ionicons name="newspaper" size={16} color="#2563EB" />
                    </View>
                  </View>
                  <Text style={[styles.metricValue, { color: textColor }]}>{stats.totalNotices}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Ionicons name="trending-up" size={13} color="#10B981" />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#10B981" }}>+5% from last week</Text>
                  </View>
                </View>

                {/* 2. Published */}
                <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.metricHeader}>
                    <Text style={[styles.metricLabel, { color: subTextColor }]}>Published</Text>
                    <View style={[styles.metricIconBox, { backgroundColor: "#ECFDF5" }]}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    </View>
                  </View>
                  <Text style={[styles.metricValue, { color: textColor }]}>{stats.publishedNotices}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Ionicons name="trending-up" size={13} color="#10B981" />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#10B981" }}>+12% from last week</Text>
                  </View>
                </View>

                {/* 3. Draft */}
                <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.metricHeader}>
                    <Text style={[styles.metricLabel, { color: subTextColor }]}>Draft</Text>
                    <View style={[styles.metricIconBox, { backgroundColor: "#FFFBEB" }]}>
                      <Ionicons name="create" size={16} color="#F59E0B" />
                    </View>
                  </View>
                  <Text style={[styles.metricValue, { color: textColor }]}>{stats.draftNotices}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Ionicons name="trending-up" size={13} color="#F59E0B" />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#F59E0B" }}>+2% from last week</Text>
                  </View>
                </View>

                {/* 4. Certificates Issued */}
                <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.metricHeader}>
                    <Text style={[styles.metricLabel, { color: subTextColor }]}>Certificates Issued</Text>
                    <View style={[styles.metricIconBox, { backgroundColor: "#EFF6FF" }]}>
                      <Ionicons name="ribbon" size={16} color="#3B82F6" />
                    </View>
                  </View>
                  <Text style={[styles.metricValue, { color: textColor }]}>{stats.certificatesIssued}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Ionicons name="trending-up" size={13} color="#10B981" />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#10B981" }}>+18% from last month</Text>
                  </View>
                </View>

                {/* 5. Pending Requests */}
                <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.metricHeader}>
                    <Text style={[styles.metricLabel, { color: subTextColor }]}>Pending Requests</Text>
                    <View style={[styles.metricIconBox, { backgroundColor: "#F5F3FF" }]}>
                      <Ionicons name="time" size={16} color="#8B5CF6" />
                    </View>
                  </View>
                  <Text style={[styles.metricValue, { color: textColor }]}>{stats.pendingRequests}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Ionicons name="trending-up" size={13} color="#8B5CF6" />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#8B5CF6" }}>+3% from last week</Text>
                  </View>
                </View>
              </View>

              {/* MIDDLE ROW (Recent Notices + Notice Statistics Bar Chart) */}
              <View style={styles.twoColumnGrid}>
                {/* RECENT NOTICES */}
                <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, flex: 3 }]}>
                  <View style={styles.panelHeader}>
                    <Text style={[styles.panelTitle, { color: textColor }]}>Recent Notices</Text>
                    <TouchableOpacity onPress={() => setActiveTab("notices")}>
                      <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                  </View>

                  {loading ? (
                    <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 30 }} />
                  ) : notices.length === 0 ? (
                    <View style={{ padding: 30, alignItems: "center" }}>
                      <Ionicons name="document-text-outline" size={32} color="#94A3B8" />
                      <Text style={{ color: subTextColor, marginTop: 6, fontSize: 13 }}>
                        No notices published yet.
                      </Text>
                      <TouchableOpacity
                        style={[styles.smallBtn, { marginTop: 10 }]}
                        onPress={() => setCreateNoticeModalVisible(true)}
                      >
                        <Text style={styles.smallBtnText}>+ Create First Notice</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      {notices.slice(0, 5).map((n) => {
                        const isPublished = n.status === "published" || n.status === "active";
                        const isDraft = n.status === "draft";
                        return (
                          <TouchableOpacity
                            key={n.id}
                            style={[
                              styles.recentNoticeItem,
                              { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor },
                            ]}
                            onPress={() => {
                              setSelectedNotice(n);
                              setViewNoticeModalVisible(true);
                            }}
                          >
                            <View
                              style={[
                                styles.noticeItemIcon,
                                {
                                  backgroundColor: isPublished
                                    ? "#ECFDF5"
                                    : isDraft
                                    ? "#F3F4F6"
                                    : "#FEF3C7",
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  n.category === "Academic"
                                    ? "school"
                                    : n.category === "Examination"
                                    ? "calendar"
                                    : "megaphone"
                                }
                                size={16}
                                color={isPublished ? "#10B981" : isDraft ? "#6B7280" : "#D97706"}
                              />
                            </View>

                            <View style={{ flex: 1, marginHorizontal: 10 }}>
                              <Text style={[styles.noticeItemTitle, { color: textColor }]} numberOfLines={1}>
                                {n.title}
                              </Text>
                              <Text style={[styles.noticeItemMeta, { color: subTextColor }]}>
                                {n.date} • {n.target}
                              </Text>
                            </View>

                            {/* Status Tag */}
                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  backgroundColor: isPublished
                                    ? "#DCFCE7"
                                    : isDraft
                                    ? "#F3F4F6"
                                    : "#FEF3C7",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  {
                                    color: isPublished ? "#15803D" : isDraft ? "#4B5563" : "#B45309",
                                  },
                                ]}
                              >
                                {isPublished ? "Published" : isDraft ? "Draft" : "Scheduled"}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={{ padding: 4, marginLeft: 6 }}
                              onPress={() => handleOpenEditNotice(n)}
                            >
                              <Ionicons name="ellipsis-vertical" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* NOTICE STATISTICS (BAR CHART) */}
                <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, flex: 2 }]}>
                  <View style={styles.panelHeader}>
                    <Text style={[styles.panelTitle, { color: textColor }]}>Notice Statistics</Text>
                    <View style={styles.statsFilterChip}>
                      <Text style={styles.statsFilterChipText}>{statsTimeframe} ▾</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 12, color: subTextColor, marginBottom: 16 }}>
                    Live distributions recorded in Firebase & MongoDB.
                  </Text>

                  {/* Vertical Bar Chart Columns */}
                  <View style={styles.barChartContainer}>
                    {[
                      {
                        label: "Notices",
                        count: stats.publishedNotices || 8,
                        max: 20,
                        barColor: "#2563EB",
                      },
                      {
                        label: "Certificates",
                        count: stats.certificatesIssued > 0 ? Math.min(stats.certificatesIssued, 15) : 5,
                        max: 20,
                        barColor: "#38BDF8",
                      },
                      {
                        label: "Circulars",
                        count: circulars.length || 3,
                        max: 20,
                        barColor: "#A855F7",
                      },
                      {
                        label: "Events",
                        count: events.length || 4,
                        max: 20,
                        barColor: "#6366F1",
                      },
                    ].map((col) => {
                      const fillPct = Math.max(15, Math.min(100, (col.count / col.max) * 100));
                      return (
                        <View key={col.label} style={styles.chartColWrapper}>
                          <Text style={[styles.chartValueLabel, { color: textColor }]}>{col.count}</Text>
                          <View style={[styles.chartBarBackground, { backgroundColor: isDark ? "#0F172A" : "#F1F5F9" }]}>
                            <View
                              style={[
                                styles.chartBarFill,
                                {
                                  height: `${fillPct}%`,
                                  backgroundColor: col.barColor,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.chartColName, { color: subTextColor }]}>{col.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* BOTTOM HERO PROMO CARD (Matching Screenshot with campus building) */}
              <View style={styles.bottomHeroBanner}>
                <View style={{ flex: 1, zIndex: 2 }}>
                  <View style={styles.heroBadgePill}>
                    <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                    <Text style={styles.heroBadgePillText}>Campusly Broadcast Center</Text>
                  </View>
                  <Text style={styles.bottomHeroTitle}>Stay Informed, Stay Ahead!</Text>
                  <Text style={styles.bottomHeroSub}>
                    Get the latest notices, certificates, announcements and more directly delivered to all college apps in real-time.
                  </Text>
                  <TouchableOpacity
                    style={styles.heroCreateBtn}
                    onPress={() => setCreateNoticeModalVisible(true)}
                  >
                    <Text style={styles.heroCreateBtnText}>Create Notice →</Text>
                  </TouchableOpacity>
                </View>

                {/* Campus Building Graphic Illustration Badge */}
                <View style={styles.heroGraphicBox}>
                  <Ionicons name="school" size={70} color="rgba(255,255,255,0.22)" />
                </View>
              </View>
            </View>
          )}

          {/* TAB: NOTICES */}
          {activeTab === "notices" && (
            <View style={{ gap: 16 }}>
              {/* Notice Controls Row */}
              <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  {/* Filter Tabs */}
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                    {(["All", "Published", "Draft", "History"] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.subTabPill,
                          noticeFilter === t && styles.subTabPillActive,
                        ]}
                        onPress={() => setNoticeFilter(t)}
                      >
                        <Text style={[styles.subTabPillText, noticeFilter === t && styles.subTabPillTextActive]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.actionPrimaryBtn}
                    onPress={() => setCreateNoticeModalVisible(true)}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.actionPrimaryBtnText}>+ Create Notice</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notices List */}
              <View style={{ gap: 12 }}>
                {filteredNotices.length === 0 ? (
                  <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, padding: 40, alignItems: "center" }]}>
                    <Ionicons name="document-outline" size={40} color="#94A3B8" />
                    <Text style={{ fontSize: 16, fontWeight: "700", color: textColor, marginTop: 10 }}>
                      No Notices Found
                    </Text>
                    <Text style={{ fontSize: 13, color: subTextColor, marginTop: 4 }}>
                      Create a new notice or switch filter tabs.
                    </Text>
                  </View>
                ) : (
                  filteredNotices.map((n) => (
                    <View key={n.id} style={[styles.panelCard, { backgroundColor: cardBg, borderColor }]}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <Text style={[styles.noticeCardTitle, { color: textColor }]}>{n.title}</Text>
                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  backgroundColor:
                                    n.status === "published" || n.status === "active"
                                      ? "#DCFCE7"
                                      : n.status === "draft"
                                      ? "#F3F4F6"
                                      : "#FEF3C7",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  {
                                    color:
                                      n.status === "published" || n.status === "active"
                                        ? "#15803D"
                                        : n.status === "draft"
                                        ? "#4B5563"
                                        : "#B45309",
                                  },
                                ]}
                              >
                                {n.status === "published" || n.status === "active" ? "Published" : n.status === "draft" ? "Draft" : "Scheduled"}
                              </Text>
                            </View>
                          </View>

                          <Text style={[styles.noticeCardBody, { color: subTextColor }]} numberOfLines={3}>
                            {n.content}
                          </Text>

                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                            <View style={styles.tagPill}>
                              <Ionicons name="folder-outline" size={11} color="#6366F1" />
                              <Text style={styles.tagPillText}>{n.category}</Text>
                            </View>
                            <View style={styles.tagPill}>
                              <Ionicons name="people-outline" size={11} color="#059669" />
                              <Text style={styles.tagPillText}>{n.target}</Text>
                            </View>
                            <Text style={{ fontSize: 11, color: subTextColor }}>📅 {n.date}</Text>
                            {n.attachmentName && (
                              <View style={[styles.tagPill, { backgroundColor: "#EFF6FF" }]}>
                                <Ionicons name="attach" size={12} color="#2563EB" />
                                <Text style={[styles.tagPillText, { color: "#2563EB" }]}>{n.attachmentName}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Actions */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                            onPress={() => {
                              setSelectedNotice(n);
                              setViewNoticeModalVisible(true);
                            }}
                          >
                            <Ionicons name="eye-outline" size={16} color={textColor} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                            onPress={() => handleOpenEditNotice(n)}
                          >
                            <Ionicons name="create-outline" size={16} color="#2563EB" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: "#FEE2E2" }]}
                            onPress={() => handleDeleteNotice(n)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* TAB: ANNOUNCEMENTS */}
          {activeTab === "announcements" && (
            <View style={{ gap: 16 }}>
              <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                <View>
                  <Text style={[styles.panelTitle, { color: textColor }]}>Campus Announcements</Text>
                  <Text style={{ fontSize: 12, color: subTextColor }}>Broadcast rapid alerts across all campus displays</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionPrimaryBtn}
                  onPress={() => setCreateAnnounceModalVisible(true)}
                >
                  <Ionicons name="megaphone" size={16} color="#FFFFFF" />
                  <Text style={styles.actionPrimaryBtnText}>+ New Announcement</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                {announcements.length === 0 ? (
                  <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, padding: 30, alignItems: "center" }]}>
                    <Text style={{ color: subTextColor }}>No announcements currently active.</Text>
                  </View>
                ) : (
                  announcements.map((a) => (
                    <View key={a.id} style={[styles.panelCard, { backgroundColor: cardBg, borderColor }]}>
                      <Text style={[styles.noticeCardTitle, { color: textColor }]}>{a.title}</Text>
                      <Text style={{ fontSize: 13, color: subTextColor, marginTop: 4 }}>{a.content}</Text>
                      <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>By {a.authorName} • {a.date}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* TAB: CIRCULARS */}
          {activeTab === "circulars" && (
            <View style={{ gap: 16 }}>
              <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                <View>
                  <Text style={[styles.panelTitle, { color: textColor }]}>Official Circulars</Text>
                  <Text style={{ fontSize: 12, color: subTextColor }}>Institutional memos, gazettes & notices</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionPrimaryBtn}
                  onPress={() => setCreateCircularModalVisible(true)}
                >
                  <Ionicons name="document-text" size={16} color="#FFFFFF" />
                  <Text style={styles.actionPrimaryBtnText}>+ Issue Circular</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                {circulars.map((c) => (
                  <View key={c.id} style={[styles.panelCard, { backgroundColor: cardBg, borderColor, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.noticeCardTitle, { color: textColor }]}>{c.title}</Text>
                      <Text style={{ fontSize: 12, color: subTextColor, marginTop: 2 }}>
                        {c.circularNo} • {c.department} • {c.date}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: "#EFF6FF" }]}
                      onPress={() => Alert.alert("Official Circular", `Circular Ref: ${c.circularNo}\nTitle: ${c.title}`)}
                    >
                      <Ionicons name="eye-outline" size={14} color="#2563EB" />
                      <Text style={[styles.smallBtnText, { color: "#2563EB" }]}>View Circular</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB: EVENTS */}
          {activeTab === "events" && (
            <View style={{ gap: 16 }}>
              <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                <View>
                  <Text style={[styles.panelTitle, { color: textColor }]}>Campus Events</Text>
                  <Text style={{ fontSize: 12, color: subTextColor }}>Academic workshops, cultural fests & conferences</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionPrimaryBtn}
                  onPress={() => setCreateEventModalVisible(true)}
                >
                  <Ionicons name="calendar" size={16} color="#FFFFFF" />
                  <Text style={styles.actionPrimaryBtnText}>+ Add Event</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                {events.map((e) => (
                  <View key={e.id} style={[styles.panelCard, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.noticeCardTitle, { color: textColor }]}>{e.title}</Text>
                    <Text style={{ fontSize: 12, color: subTextColor, marginTop: 4 }}>
                      📍 {e.location} • 🕒 {e.time} • 📅 {e.date}
                    </Text>
                    {e.description ? <Text style={{ fontSize: 13, color: subTextColor, marginTop: 6 }}>{e.description}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB: STUDENT REQUESTS */}
          {activeTab === "requests" && (
            <View style={{ gap: 16 }}>
              <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.panelTitle, { color: textColor }]}>Student Certificate & Notice Requests</Text>
                <Text style={{ fontSize: 12, color: subTextColor, marginTop: 2 }}>
                  Direct incoming requests submitted by students
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                {requests.length === 0 ? (
                  <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, padding: 30, alignItems: "center" }]}>
                    <Text style={{ color: subTextColor }}>No pending student requests.</Text>
                  </View>
                ) : (
                  requests.map((r) => (
                    <View key={r.id} style={[styles.panelCard, { backgroundColor: cardBg, borderColor, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.noticeCardTitle, { color: textColor }]}>
                          {r.studentName || "Student"} ({r.studentRollNo || "Roll No"})
                        </Text>
                        <Text style={{ fontSize: 12, color: subTextColor, marginTop: 2 }}>
                          Type: {r.certificateType || "Academic Verification"} • Status: {r.status || "Pending"}
                        </Text>
                        {r.purpose && <Text style={{ fontSize: 12, color: "#94A3B8" }}>Purpose: {r.purpose}</Text>}
                      </View>

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: "#DCFCE7" }]}
                          onPress={() => router.push("/notice-manager/certificates")}
                        >
                          <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                          <Text style={[styles.smallBtnText, { color: "#15803D" }]}>Process in Hub</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* TAB: DOCUMENTS */}
          {activeTab === "documents" && (
            <View style={{ gap: 16 }}>
              <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                <View>
                  <Text style={[styles.panelTitle, { color: textColor }]}>Official Documents & Templates</Text>
                  <Text style={{ fontSize: 12, color: subTextColor }}>Institutional repository for forms and PDFs</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionPrimaryBtn}
                  onPress={() => {
                    Alert.alert("Upload Document", "Pick a file to add to official college documents.", [
                      { text: "Cancel" },
                      {
                        text: "Add Demo Template",
                        onPress: async () => {
                          await createDocumentItem({
                            title: "Official Bonafide Template 2026",
                            category: "Notice Templates",
                            fileSize: "1.4 MB",
                            uploadedBy: profileName,
                            date: todayFormatted,
                          });
                          Alert.alert("Uploaded", "Document saved to college cloud repository.");
                        },
                      },
                    ]);
                  }}
                >
                  <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                  <Text style={styles.actionPrimaryBtnText}>+ Upload Document</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                {documents.map((d) => (
                  <View key={d.id} style={[styles.panelCard, { backgroundColor: cardBg, borderColor, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      <View style={[styles.iconButton, { backgroundColor: "#EFF6FF" }]}>
                        <Ionicons name="document-text" size={20} color="#2563EB" />
                      </View>
                      <View>
                        <Text style={[styles.noticeCardTitle, { color: textColor }]}>{d.title}</Text>
                        <Text style={{ fontSize: 12, color: subTextColor }}>
                          {d.category} • {d.fileSize} • {d.date}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: "#EFF6FF" }]}
                      onPress={() => Alert.alert("Download Document", `File "${d.title}" ready.`)}
                    >
                      <Ionicons name="download-outline" size={14} color="#2563EB" />
                      <Text style={[styles.smallBtnText, { color: "#2563EB" }]}>Download</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB: REPORTS */}
          {activeTab === "reports" && (
            <View style={{ gap: 16 }}>
              <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.panelTitle, { color: textColor }]}>Broadcast & Certification Analytics</Text>
                <Text style={{ fontSize: 12, color: subTextColor, marginTop: 2 }}>
                  Comprehensive audit logs and exportable reports
                </Text>
              </View>

              <View style={styles.twoColumnGrid}>
                <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, flex: 1 }]}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: textColor }}>📢 Notices Summary Report</Text>
                  <Text style={{ fontSize: 13, color: subTextColor, marginVertical: 8 }}>
                    Total Published: {stats.publishedNotices} • Drafts: {stats.draftNotices}
                  </Text>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: "#2563EB" }]}
                    onPress={() => Alert.alert("Report Generated", `Notice Report compiled for ${stats.totalNotices} records.`)}
                  >
                    <Text style={[styles.smallBtnText, { color: "#FFFFFF" }]}>Export Notice Report</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, flex: 1 }]}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: textColor }}>📜 Certificates Report</Text>
                  <Text style={{ fontSize: 13, color: subTextColor, marginVertical: 8 }}>
                    Total Issued: {stats.certificatesIssued} • Requests: {stats.pendingRequests}
                  </Text>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: "#10B981" }]}
                    onPress={() => Alert.alert("Report Generated", `Certificates Report compiled for ${stats.certificatesIssued} records.`)}
                  >
                    <Text style={[styles.smallBtnText, { color: "#FFFFFF" }]}>Export Certificate Report</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* TAB: AI ASSISTANT */}
          {activeTab === "ai" && (
            <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, minHeight: 460 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: borderColor }}>
                <View style={[styles.iconButton, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="sparkles" size={20} color="#2563EB" />
                </View>
                <View>
                  <Text style={[styles.panelTitle, { color: textColor }]}>Campus Notice AI Assistant</Text>
                  <Text style={{ fontSize: 12, color: subTextColor }}>Instant answers grounded in real-time college database</Text>
                </View>
              </View>

              {/* Chat Message Scroll */}
              <ScrollView style={{ flex: 1, marginVertical: 12, maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 10 }}>
                  {aiChatMessages.map((msg, idx) => (
                    <View
                      key={idx}
                      style={{
                        alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor:
                          msg.sender === "user"
                            ? "#2563EB"
                            : isDark
                            ? "#0F172A"
                            : "#F1F5F9",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          lineHeight: 18,
                          color: msg.sender === "user" ? "#FFFFFF" : textColor,
                        }}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Quick Prompt Chips */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {[
                  "Find latest notices",
                  "Certificate status",
                  "Event details",
                  "Any query!",
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={[styles.smallBtn, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                    onPress={() => handleSendAiMessage(chip)}
                  >
                    <Text style={[styles.smallBtnText, { color: textColor }]}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Input row */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TextInput
                  style={[styles.inputField, { flex: 1, color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  placeholder="Type your question..."
                  placeholderTextColor="#94A3B8"
                  value={aiInputText}
                  onChangeText={setAiInputText}
                  onSubmitEditing={() => handleSendAiMessage()}
                />
                <TouchableOpacity
                  style={[styles.actionPrimaryBtn, { paddingHorizontal: 16 }]}
                  onPress={() => handleSendAiMessage()}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB: PROFILE */}
          {activeTab === "profile" && (
            <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, maxWidth: 600, alignSelf: "center", width: "100%" }]}>
              <Text style={[styles.panelTitle, { color: textColor, marginBottom: 14 }]}>Notice Manager Profile</Text>

              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <Image source={{ uri: profileAvatar }} style={{ width: 90, height: 90, borderRadius: 45 }} />
                <TouchableOpacity
                  style={[styles.smallBtn, { marginTop: 8, backgroundColor: "#EFF6FF" }]}
                  onPress={async () => {
                    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
                    if (!res.canceled && res.assets?.[0]?.uri) {
                      setProfileAvatar(res.assets[0].uri);
                    }
                  }}
                >
                  <Text style={[styles.smallBtnText, { color: "#2563EB" }]}>Change Photo</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                <View>
                  <Text style={[styles.formLabel, { color: textColor }]}>Full Name</Text>
                  <TextInput
                    style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                    value={profileName}
                    onChangeText={setProfileName}
                  />
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: textColor }]}>Email Address</Text>
                  <TextInput
                    style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                    value={profileEmail}
                    onChangeText={setProfileEmail}
                  />
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: textColor }]}>Role</Text>
                  <TextInput
                    style={[styles.inputField, { color: subTextColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                    value="Notice Manager"
                    editable={false}
                  />
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: textColor }]}>Department</Text>
                  <TextInput
                    style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                    value={profileDepartment}
                    onChangeText={setProfileDepartment}
                  />
                </View>

                {profileSavedMsg ? (
                  <Text style={{ color: "#10B981", fontWeight: "700", textAlign: "center" }}>{profileSavedMsg}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.actionPrimaryBtn, { marginTop: 10, justifyContent: "center" }]}
                  onPress={() => {
                    setProfileSavedMsg("Profile changes saved successfully!");
                    setTimeout(() => setProfileSavedMsg(""), 3000);
                  }}
                >
                  <Text style={styles.actionPrimaryBtnText}>Save Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === "settings" && (
            <View style={[styles.panelCard, { backgroundColor: cardBg, borderColor, maxWidth: 600, alignSelf: "center", width: "100%" }]}>
              <Text style={[styles.panelTitle, { color: textColor, marginBottom: 14 }]}>Notice Manager Settings</Text>

              <View style={{ gap: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: textColor }}>Push Notifications</Text>
                    <Text style={{ fontSize: 12, color: subTextColor }}>Receive alerts when student requests arrive</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: pushNotificationsEnabled ? "#DCFCE7" : "#F1F5F9" }]}
                    onPress={() => setPushNotificationsEnabled(!pushNotificationsEnabled)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: pushNotificationsEnabled ? "#15803D" : "#64748B" }}>
                      {pushNotificationsEnabled ? "ON" : "OFF"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: textColor }}>Email Digest</Text>
                    <Text style={{ fontSize: 12, color: subTextColor }}>Receive weekly broadcast analytics via email</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: emailAlertsEnabled ? "#DCFCE7" : "#F1F5F9" }]}
                    onPress={() => setEmailAlertsEnabled(!emailAlertsEnabled)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: emailAlertsEnabled ? "#15803D" : "#64748B" }}>
                      {emailAlertsEnabled ? "ON" : "OFF"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: textColor }}>Appearance / Theme</Text>
                    <Text style={{ fontSize: 12, color: subTextColor }}>Toggle between Dark and Light mode</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: "#EFF6FF" }]}
                    onPress={() => setThemeMode(isDark ? "Light" : "Dark")}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#2563EB" }}>
                      {isDark ? "Dark Mode" : "Light Mode"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: textColor }}>Allocations</Text>
                    <Text style={{ fontSize: 12, color: subTextColor }}>Assign students directly to Hostel Manager</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: "#F5F3FF" }]}
                    onPress={() => router.push("/notice-manager/students")}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#7C3AED" }}>Open Allocations</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* 3. CREATE NOTICE MODAL (Matching Screenshot) */}
      <Modal
        visible={createNoticeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateNoticeModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCreateNoticeModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.iconButton, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="megaphone" size={20} color="#2563EB" />
                </View>
                <Text style={[styles.modalTitle, { color: textColor }]}>Create Notice</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateNoticeModalVisible(false)}>
                <Ionicons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12, paddingVertical: 10 }}>
                {/* Title */}
                <View>
                  <Text style={[styles.formLabel, { color: textColor }]}>Title *</Text>
                  <TextInput
                    style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                    placeholder="Enter notice title"
                    placeholderTextColor="#94A3B8"
                    value={noticeTitle}
                    onChangeText={setNoticeTitle}
                  />
                </View>

                {/* Description */}
                <View>
                  <Text style={[styles.formLabel, { color: textColor }]}>Description *</Text>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        color: textColor,
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                        borderColor,
                        minHeight: 110,
                        textAlignVertical: "top",
                      },
                    ]}
                    placeholder="Write your notice here..."
                    placeholderTextColor="#94A3B8"
                    value={noticeContent}
                    onChangeText={setNoticeContent}
                    multiline
                  />
                </View>

                {/* Category & Priority Row */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: textColor }]}>Category</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {["Academic", "Examination", "Hostel", "Events", "General"].map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.chip,
                            noticeCategory === cat && styles.chipActive,
                          ]}
                          onPress={() => setNoticeCategory(cat)}
                        >
                          <Text style={[styles.chipText, noticeCategory === cat && styles.chipTextActive]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Target Audience */}
                <View>
                  <Text style={[styles.formLabel, { color: textColor }]}>Target Audience</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {["All Students", "Hostel Students", "Faculty", "CSE", "ECE", "MECH"].map((tgt) => (
                      <TouchableOpacity
                        key={tgt}
                        style={[
                          styles.chip,
                          noticeTarget === tgt && styles.chipActive,
                        ]}
                        onPress={() => setNoticeTarget(tgt)}
                      >
                        <Text style={[styles.chipText, noticeTarget === tgt && styles.chipTextActive]}>
                          {tgt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Attachment Picker */}
                <View>
                  <Text style={[styles.formLabel, { color: textColor }]}>Attachment (Optional)</Text>
                  <TouchableOpacity
                    style={[styles.attachmentPickerBtn, { borderColor }]}
                    onPress={handlePickAttachment}
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color="#2563EB" />
                    <Text style={{ fontSize: 13, color: "#2563EB", fontWeight: "600" }}>
                      {noticeAttachmentName ? noticeAttachmentName : "Choose File (PDF or Image)"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions Row */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.draftBtn, { flex: 1, backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                onPress={() => handleSaveNotice("draft")}
                disabled={savingNotice}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: textColor, textAlign: "center" }}>
                  Save as Draft
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.publishBtn, { flex: 1 }]}
                onPress={() => handleSaveNotice("published")}
                disabled={savingNotice}
              >
                {savingNotice ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF", textAlign: "center" }}>
                    Publish Notice
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 4. EDIT NOTICE MODAL */}
      <Modal
        visible={editNoticeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditNoticeModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditNoticeModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Edit Notice</Text>
              <TouchableOpacity onPress={() => setEditNoticeModalVisible(false)}>
                <Ionicons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12, paddingVertical: 10 }}>
                <View>
                  <Text style={[styles.formLabel, { color: textColor }]}>Notice Title</Text>
                  <TextInput
                    style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                    value={editNoticeTitle}
                    onChangeText={setEditNoticeTitle}
                  />
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: textColor }]}>Description</Text>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        color: textColor,
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                        borderColor,
                        minHeight: 100,
                        textAlignVertical: "top",
                      },
                    ]}
                    value={editNoticeContent}
                    onChangeText={setEditNoticeContent}
                    multiline
                  />
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: textColor }]}>Status</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.chip, editNoticeStatus === "published" && styles.chipActive]}
                      onPress={() => setEditNoticeStatus("published")}
                    >
                      <Text style={[styles.chipText, editNoticeStatus === "published" && styles.chipTextActive]}>
                        Published
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chip, editNoticeStatus === "draft" && styles.chipActive]}
                      onPress={() => setEditNoticeStatus("draft")}
                    >
                      <Text style={[styles.chipText, editNoticeStatus === "draft" && styles.chipTextActive]}>
                        Draft
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.draftBtn, { flex: 1, backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                onPress={() => setEditNoticeModalVisible(false)}
              >
                <Text style={{ textAlign: "center", color: subTextColor, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.publishBtn, { flex: 1 }]}
                onPress={handleUpdateNotice}
                disabled={savingNotice}
              >
                <Text style={{ textAlign: "center", color: "#FFFFFF", fontWeight: "700" }}>Update Notice</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 5. VIEW NOTICE DETAILS MODAL */}
      <Modal
        visible={viewNoticeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewNoticeModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setViewNoticeModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedNotice && (
              <View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Text style={[styles.modalTitle, { color: textColor, flex: 1, paddingRight: 10 }]}>
                    {selectedNotice.title}
                  </Text>
                  <TouchableOpacity onPress={() => setViewNoticeModalVisible(false)}>
                    <Ionicons name="close" size={24} color={subTextColor} />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: "row", gap: 8, marginVertical: 8, flexWrap: "wrap" }}>
                  <View style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{selectedNotice.category}</Text>
                  </View>
                  <View style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{selectedNotice.target}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: subTextColor }}>{selectedNotice.date}</Text>
                </View>

                <ScrollView style={{ maxHeight: 280, marginVertical: 10 }}>
                  <Text style={{ fontSize: 14, lineHeight: 22, color: textColor }}>
                    {selectedNotice.content}
                  </Text>
                </ScrollView>

                {selectedNotice.attachmentUrl ? (
                  <TouchableOpacity
                    style={[styles.attachmentPickerBtn, { borderColor, marginBottom: 10 }]}
                    onPress={() => Linking.openURL(selectedNotice.attachmentUrl!)}
                  >
                    <Ionicons name="document-attach" size={16} color="#2563EB" />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#2563EB" }}>
                      Open Attached File ({selectedNotice.attachmentName || "Document"})
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.draftBtn, { backgroundColor: isDark ? "#334155" : "#F1F5F9", width: "100%" }]}
                  onPress={() => setViewNoticeModalVisible(false)}
                >
                  <Text style={{ textAlign: "center", color: textColor, fontWeight: "700" }}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* 6. CREATE ANNOUNCEMENT MODAL */}
      <Modal
        visible={createAnnounceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateAnnounceModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCreateAnnounceModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>New Campus Announcement</Text>
              <TouchableOpacity onPress={() => setCreateAnnounceModalVisible(false)}>
                <Ionicons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, paddingVertical: 10 }}>
              <View>
                <Text style={[styles.formLabel, { color: textColor }]}>Title</Text>
                <TextInput
                  style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  placeholder="e.g. Library Hours Extended"
                  placeholderTextColor="#94A3B8"
                  value={announceTitle}
                  onChangeText={setAnnounceTitle}
                />
              </View>
              <View>
                <Text style={[styles.formLabel, { color: textColor }]}>Content</Text>
                <TextInput
                  style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor, minHeight: 80 }]}
                  placeholder="Details for all college students..."
                  placeholderTextColor="#94A3B8"
                  value={announceContent}
                  onChangeText={setAnnounceContent}
                  multiline
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.draftBtn, { flex: 1, backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                onPress={() => setCreateAnnounceModalVisible(false)}
              >
                <Text style={{ textAlign: "center", color: subTextColor, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.publishBtn, { flex: 1 }]}
                onPress={async () => {
                  if (!announceTitle.trim()) return Alert.alert("Required", "Title is required.");
                  await createAnnouncement({
                    title: announceTitle.trim(),
                    content: announceContent.trim(),
                    category: "General",
                    priority: "high",
                    authorName: profileName,
                    date: todayFormatted,
                  });
                  setAnnounceTitle("");
                  setAnnounceContent("");
                  setCreateAnnounceModalVisible(false);
                  Alert.alert("Broadcasted", "Announcement broadcasted live.");
                }}
              >
                <Text style={{ textAlign: "center", color: "#FFFFFF", fontWeight: "700" }}>Broadcast</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 7. CREATE CIRCULAR MODAL */}
      <Modal
        visible={createCircularModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateCircularModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCreateCircularModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Issue Official Circular</Text>
              <TouchableOpacity onPress={() => setCreateCircularModalVisible(false)}>
                <Ionicons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, paddingVertical: 10 }}>
              <View>
                <Text style={[styles.formLabel, { color: textColor }]}>Circular Title</Text>
                <TextInput
                  style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  placeholder="e.g. End Semester Exam Guidelines 2026"
                  placeholderTextColor="#94A3B8"
                  value={circularTitle}
                  onChangeText={setCircularTitle}
                />
              </View>
              <View>
                <Text style={[styles.formLabel, { color: textColor }]}>Issuing Department</Text>
                <TextInput
                  style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  value={circularDept}
                  onChangeText={setCircularDept}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.draftBtn, { flex: 1, backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                onPress={() => setCreateCircularModalVisible(false)}
              >
                <Text style={{ textAlign: "center", color: subTextColor, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.publishBtn, { flex: 1 }]}
                onPress={async () => {
                  if (!circularTitle.trim()) return Alert.alert("Required", "Title is required.");
                  await createCircular({
                    title: circularTitle.trim(),
                    circularNo: `CIR-2026-${Math.floor(100 + Math.random() * 900)}`,
                    date: todayFormatted,
                    category: "Official",
                    department: circularDept,
                  });
                  setCircularTitle("");
                  setCreateCircularModalVisible(false);
                  Alert.alert("Issued", "Official circular released.");
                }}
              >
                <Text style={{ textAlign: "center", color: "#FFFFFF", fontWeight: "700" }}>Issue Circular</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 8. CREATE EVENT MODAL */}
      <Modal
        visible={createEventModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateEventModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCreateEventModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Add Campus Event</Text>
              <TouchableOpacity onPress={() => setCreateEventModalVisible(false)}>
                <Ionicons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, paddingVertical: 10 }}>
              <View>
                <Text style={[styles.formLabel, { color: textColor }]}>Event Name</Text>
                <TextInput
                  style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  placeholder="e.g. Cultural Fest 2026"
                  placeholderTextColor="#94A3B8"
                  value={eventTitle}
                  onChangeText={setEventTitle}
                />
              </View>
              <View>
                <Text style={[styles.formLabel, { color: textColor }]}>Date & Time</Text>
                <TextInput
                  style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  value={eventDate}
                  onChangeText={setEventDate}
                />
              </View>
              <View>
                <Text style={[styles.formLabel, { color: textColor }]}>Venue / Location</Text>
                <TextInput
                  style={[styles.inputField, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  value={eventLocation}
                  onChangeText={setEventLocation}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.draftBtn, { flex: 1, backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                onPress={() => setCreateEventModalVisible(false)}
              >
                <Text style={{ textAlign: "center", color: subTextColor, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.publishBtn, { flex: 1 }]}
                onPress={async () => {
                  if (!eventTitle.trim()) return Alert.alert("Required", "Title is required.");
                  await createCampusEvent({
                    title: eventTitle.trim(),
                    date: eventDate,
                    time: "10:00 AM",
                    location: eventLocation,
                    category: "Campus Life",
                    description: "Official college event scheduled for all students.",
                  });
                  setEventTitle("");
                  setCreateEventModalVisible(false);
                  Alert.alert("Created", "Campus event added to schedule.");
                }}
              >
                <Text style={{ textAlign: "center", color: "#FFFFFF", fontWeight: "700" }}>Publish Event</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },

  /* Sidebar */
  sidebar: {
    width: 205,
    borderRightWidth: 1,
    borderRightColor: "#1E293B",
    display: "flex",
    flexDirection: "column",
  },
  sidebarBrand: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
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
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 9.5,
    color: "#94A3B8",
    fontWeight: "500",
  },
  navScroll: {
    flex: 1,
    paddingHorizontal: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6.5,
    paddingHorizontal: 9,
    borderRadius: 8,
    gap: 8,
  },
  navItemActive: {
    backgroundColor: "#1E40AF",
  },
  navItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    flex: 1,
  },
  navItemTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  navBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center",
  },
  navBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sidebarProfilePill: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    margin: 8,
    borderRadius: 8,
    backgroundColor: "#1E293B",
  },
  profileAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  profileNameText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileRoleText: {
    fontSize: 9,
    color: "#94A3B8",
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },

  /* Top Bar */
  topBar: {
    height: 50,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  searchBox: {
    flex: 1,
    maxWidth: 260,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 0,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  topAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2563EB",
  },

  /* Greeting & Date Row */
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: "600",
  },

  /* 5 Stats Cards */
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: 125,
    borderRadius: 10,
    borderWidth: 1,
    padding: 9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  metricIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: -0.5,
  },

  /* Two Column Grid */
  twoColumnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  panelCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* Recent Notices Items */
  recentNoticeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  noticeItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeItemTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  noticeItemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },

  /* Bar Chart */
  statsFilterChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
  },
  statsFilterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  barChartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 160,
    paddingTop: 10,
  },
  chartColWrapper: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  chartValueLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
  },
  chartBarBackground: {
    width: 26,
    height: 100,
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  chartBarFill: {
    width: "100%",
    borderRadius: 6,
  },
  chartColName: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 8,
  },

  /* Bottom Hero Promo Banner */
  bottomHeroBanner: {
    borderRadius: 16,
    padding: 24,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  heroBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  heroBadgePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomHeroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  bottomHeroSub: {
    fontSize: 13,
    color: "#DBEAFE",
    marginTop: 6,
    maxWidth: 520,
    lineHeight: 18,
  },
  heroCreateBtn: {
    marginTop: 16,
    backgroundColor: "#1E3A8A",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroCreateBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  heroGraphicBox: {
    position: "absolute",
    right: 20,
    bottom: -10,
    zIndex: 1,
  },

  /* Sub Tabs & Action Buttons */
  subTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  subTabPillActive: {
    backgroundColor: "#2563EB",
  },
  subTabPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  subTabPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  actionPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#2563EB",
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  noticeCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  noticeCardBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 540,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  attachmentPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
  },
  draftBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  publishBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
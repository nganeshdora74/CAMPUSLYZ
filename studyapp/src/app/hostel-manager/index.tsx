import React, { useState, useEffect } from "react";
import {
  Alert,
  Dimensions,
  Image,
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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { confirmLogout } from "../../firebase/auth";
import NotificationBellModal from "../../components/NotificationBellModal";
import UniversalRoleControls from "../../components/UniversalRoleControls";
import { useLanguage } from "../../context/LanguageContext";
import { parseNameAndRoleFromEmail } from "../../utils/userEmailParser";
import hostelDataService, {
  GatePassItem,
  HostelRoom,
} from "../../services/hostelDataService";
import { notifyStudent } from "../../services/notificationService";

const HOSTEL_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "grid-outline", route: "/hostel-manager" },
  { id: "rooms", label: "Rooms", icon: "business-outline", route: "/hostel-manager/rooms" },
  { id: "students", label: "Students", icon: "people-outline", route: "/hostel-manager/students" },
  { id: "gate-pass", label: "Gate Pass", icon: "exit-outline", route: "/hostel-manager/gate-pass" },
  { id: "leave", label: "Leave", icon: "calendar-outline", route: "/hostel-manager/leave" },
  { id: "complaints", label: "Complaints", icon: "alert-circle-outline", route: "/hostel-manager/complaints" },
  { id: "notices", label: "Notices", icon: "megaphone-outline", route: "/hostel-manager/notices" },
  { id: "reports", label: "Reports", icon: "bar-chart-outline", route: "/hostel-manager/reports" },
  { id: "ai", label: "AI Assistant", icon: "sparkles-outline", route: "/hostel-manager/ai-assistant" },
  { id: "profile", label: "Profile", icon: "person-outline", route: "/hostel-manager/profile" },
  { id: "settings", label: "Settings", icon: "settings-outline", route: "/hostel-manager/settings" },
];

export default function HostelDashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [managerName, setManagerName] = useState("Rahul Sharma");
  const [stats, setStats] = useState(hostelDataService.getStats());
  const [gatePasses, setGatePasses] = useState<GatePassItem[]>(hostelDataService.getGatePasses());
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // New Gate Pass Quick Modal
  const [gatePassModal, setGatePassModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newPurpose, setNewPurpose] = useState("Personal");
  const [newOutTime, setNewOutTime] = useState("05:00 PM");

  // Post Notice Quick Modal
  const [noticeModal, setNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeAudience, setNoticeAudience] = useState("All Residents");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const parsed = parseNameAndRoleFromEmail(user.email);
    setManagerName(user.displayName || parsed.fullName || "Rahul Sharma");

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.fullName || d.name) setManagerName(d.fullName || d.name);
        }
      },
      (err) => console.warn("Hostel dashboard user listener:", err?.message)
    );

    return () => unsub();
  }, []);

  // Live Firestore synchronization for hostel requests, complaints, and leaves
  useEffect(() => {
    const unsubReqs = onSnapshot(
      collection(db, "requests"),
      (snap) => {
        let pendingLvs = 0;
        let pendingGps = 0;
        snap.docs.forEach((d) => {
          const dt = d.data();
          const isPending = dt.status === "Pending";
          if ((dt.category === "Leave" || dt.passType === "leave") && isPending) {
            pendingLvs++;
          }
          if ((dt.category === "Gate Pass" || dt.passType === "gate") && isPending) {
            pendingGps++;
          }
        });
        setStats((prev) => ({
          ...prev,
          pendingLeaves: pendingLvs,
          pendingGatePasses: pendingGps,
        }));
      },
      (err) => console.warn("Requests snap error:", err?.message)
    );

    const unsubComps = onSnapshot(
      collection(db, "complaints"),
      (snap) => {
        const openC = snap.docs.filter(
          (d) => d.data().type === "Hostel" && d.data().status !== "Resolved"
        ).length;
        setStats((prev) => ({
          ...prev,
          newComplaints: openC,
        }));
      },
      (err) => console.warn("Complaints snap error:", err?.message)
    );

    return () => {
      unsubReqs();
      unsubComps();
    };
  }, []);

  const refreshData = () => {
    setStats(hostelDataService.getStats());
    setGatePasses(hostelDataService.getGatePasses());
  };

  const handleApproveGatePass = (id: string, name: string) => {
    const pass = hostelDataService.updateGatePassStatus(id, "Approved");
    refreshData();
    if (pass?.studentName) {
      notifyStudent(
        "",
        "Gate Pass Approved! 🚪",
        `Your gate pass request has been approved by the Hostel Manager. Out-Time: ${pass.outTime}`,
        "gate_pass",
        { studentName: pass.studentName }
      );
    }
    setActionNotice(`Gate pass approved for ${name}`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleRejectGatePass = (id: string, name: string) => {
    const pass = hostelDataService.updateGatePassStatus(id, "Rejected");
    refreshData();
    if (pass?.studentName) {
      notifyStudent(
        "",
        "Gate Pass Rejected",
        `Your gate pass request was rejected by the Hostel Manager.`,
        "gate_pass",
        { studentName: pass.studentName }
      );
    }
    setActionNotice(`Gate pass rejected for ${name}`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleCreateGatePass = () => {
    if (!newStudentName.trim()) {
      Alert.alert("Required", "Please enter resident name");
      return;
    }
    hostelDataService.createGatePass({
      studentName: newStudentName.trim(),
      purpose: newPurpose,
      outTime: newOutTime,
      requestedAt: "Today, Just now",
      status: "Pending",
    });
    setNewStudentName("");
    setGatePassModal(false);
    refreshData();
    setActionNotice("New gate pass request created");
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handlePostNotice = () => {
    if (!noticeTitle.trim()) {
      Alert.alert("Required", "Please enter notice title");
      return;
    }
    hostelDataService.createNotice({
      title: noticeTitle.trim(),
      audience: noticeAudience,
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: "Active",
    });
    setNoticeTitle("");
    setNoticeModal(false);
    refreshData();
    setActionNotice("Notice broadcasted to all residents");
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <View style={styles.root}>
      {/* ======================================================== */}
      {/* LEFT SIDEBAR (Desktop or Mobile Drawer) */}
      {/* ======================================================== */}
      {(isDesktop || mobileMenuOpen) && (
        <View style={[styles.sidebar, !isDesktop && styles.mobileSidebar]}>
          <View style={styles.logoRow}>
            <View style={styles.logoIconBox}>
              <Ionicons name="business" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.logoText}>Campusly</Text>
              <Text style={styles.logoSubText}>Hostel Manager</Text>
            </View>
            {!isDesktop && (
              <TouchableOpacity
                onPress={() => setMobileMenuOpen(false)}
                style={styles.closeDrawerBtn}
              >
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
            {HOSTEL_NAV_ITEMS.map((item) => {
              const isActive = item.id === "dashboard";
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => {
                    setMobileMenuOpen(false);
                    router.push(item.route as any);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={18}
                    color={isActive ? "#FFFFFF" : "#94A3B8"}
                  />
                  <Text
                    style={[styles.navLabel, isActive && styles.navLabelActive]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sidebarBottom}>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => router.push("/hostel-manager/profile")}
            >
              <View style={styles.miniAvatar}>
                <Text style={styles.miniAvatarText}>
                  {managerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sidebarUserText} numberOfLines={1}>
                  {managerName}
                </Text>
                <Text style={styles.sidebarUserSub}>Chief Warden</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navItem,
                {
                  marginTop: 8,
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(239, 68, 68, 0.25)",
                },
              ]}
              onPress={() => {
                setMobileMenuOpen(false);
                confirmLogout("Are you sure you want to log out of the Hostel Manager portal?");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={[styles.navLabel, { color: "#EF4444", fontWeight: "700" }]}>
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ======================================================== */}
      <View style={styles.mainCanvas}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            {!isDesktop && (
              <TouchableOpacity
                onPress={() => setMobileMenuOpen(true)}
                style={styles.menuBurger}
              >
                <Ionicons name="menu" size={24} color="#0F172A" />
              </TouchableOpacity>
            )}

            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search resident, room number, gate pass..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <View style={styles.topBarRight}>
            <UniversalRoleControls compact />

            <NotificationBellModal iconColor="#475569" badgeBgColor="#EF4444" />

            <TouchableOpacity
              style={styles.userProfileBtn}
              onPress={() => router.push("/hostel-manager/profile")}
              activeOpacity={0.8}
            >
              <View style={styles.topAvatar}>
                <Text style={styles.topAvatarText}>
                  {managerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              {isDesktop && (
                <View style={styles.userTextCol}>
                  <Text style={styles.userName}>{managerName}</Text>
                  <Text style={styles.userRole}>Hostel Manager</Text>
                </View>
              )}
              <Ionicons name="chevron-down" size={14} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                padding: 7,
                borderRadius: 8,
                backgroundColor: "#FEE2E2",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => confirmLogout("Are you sure you want to log out of your session?")}
              accessibilityLabel="Log Out"
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SCROLLABLE DASHBOARD VIEW */}
        <ScrollView style={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.contentPadding}>
            {actionNotice && (
              <View style={styles.toastBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <Text style={styles.toastText}>{actionNotice}</Text>
              </View>
            )}

            {/* Header Greeting Banner */}
            <View style={styles.welcomeBanner}>
              <View>
                <Text style={styles.welcomeTitle}>
                  Good Morning, {managerName}! 👋
                </Text>
                <Text style={styles.welcomeSub}>
                  Here's what's happening in your hostel today.
                </Text>
              </View>

              <View style={styles.datePill}>
                <Ionicons name="partly-sunny-outline" size={16} color="#0284C7" />
                <Text style={styles.datePillText}>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })} • 24°C Partly Cloudy
                </Text>
              </View>
            </View>

            {/* 4 STAT CARDS (Screenshot 1 Screen 1) */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderColor: "#BFDBFE", backgroundColor: "#FFFFFF" }]}>
                <View style={[styles.statIconBox, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="business" size={22} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Total Rooms</Text>
                  <Text style={styles.statNumber}>{stats.totalRooms}</Text>
                  <Text style={styles.statSubText}>Hostel Capacity</Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderColor: "#BFDBFE", backgroundColor: "#FFFFFF" }]}>
                <View style={[styles.statIconBox, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="bed" size={22} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Occupied Rooms</Text>
                  <Text style={styles.statNumber}>{stats.occupiedRooms}</Text>
                  <Text style={[styles.statSubText, { color: "#0284C7" }]}>
                    {stats.occupancyRate}% occupancy
                  </Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderColor: "#A7F3D0", backgroundColor: "#FFFFFF" }]}>
                <View style={[styles.statIconBox, { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons name="key" size={22} color="#059669" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Available Rooms</Text>
                  <Text style={styles.statNumber}>{stats.availableRooms}</Text>
                  <Text style={[styles.statSubText, { color: "#059669" }]}>
                    {100 - stats.occupancyRate}% available
                  </Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderColor: "#99F6E4", backgroundColor: "#FFFFFF" }]}>
                <View style={[styles.statIconBox, { backgroundColor: "#F0FDFA" }]}>
                  <Ionicons name="people" size={22} color="#0D9488" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Total Residents</Text>
                  <Text style={styles.statNumber}>{stats.totalResidents}</Text>
                  <Text style={[styles.statSubText, { color: "#0D9488" }]}>+2 new this week</Text>
                </View>
              </View>
            </View>

            {/* MIDDLE 3-CARD SECTION: Room Occupancy, Today's Activity, Recent Gate Pass */}
            <View style={styles.middleRow}>
              {/* CARD 1: Room Occupancy */}
              <View style={styles.middleCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardHeaderTitle}>Room Occupancy</Text>
                  <TouchableOpacity onPress={() => router.push("/hostel-manager/rooms")}>
                    <Text style={styles.cardHeaderLink}>View All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.donutContainer}>
                  <View style={styles.donutCircle}>
                    <Text style={styles.donutPercentage}>{stats.occupancyRate}%</Text>
                    <Text style={styles.donutSub}>Occupied</Text>
                  </View>
                </View>

                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#0284C7" }]} />
                    <Text style={styles.legendText}>Occupied: {stats.occupiedRooms}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
                    <Text style={styles.legendText}>Available: {stats.availableRooms}</Text>
                  </View>
                </View>
              </View>

              {/* CARD 2: Today's Activity */}
              <View style={styles.middleCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardHeaderTitle}>Today's Activity</Text>
                </View>

                <View style={styles.activityList}>
                  <TouchableOpacity
                    style={styles.activityItem}
                    onPress={() => router.push("/hostel-manager/gate-pass")}
                  >
                    <View style={[styles.actIconBox, { backgroundColor: "#EFF6FF" }]}>
                      <Ionicons name="exit-outline" size={18} color="#2563EB" />
                    </View>
                    <Text style={styles.actTitle}>New Gate Pass Requests</Text>
                    <View style={styles.actBadge}>
                      <Text style={styles.actBadgeText}>{stats.pendingGatePasses}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.activityItem}
                    onPress={() => router.push("/hostel-manager/leave")}
                  >
                    <View style={[styles.actIconBox, { backgroundColor: "#FEF3C7" }]}>
                      <Ionicons name="calendar-outline" size={18} color="#D97706" />
                    </View>
                    <Text style={styles.actTitle}>Pending Leaves</Text>
                    <View style={[styles.actBadge, { backgroundColor: "#FEF3C7" }]}>
                      <Text style={[styles.actBadgeText, { color: "#D97706" }]}>{stats.pendingLeaves}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.activityItem}
                    onPress={() => router.push("/hostel-manager/complaints")}
                  >
                    <View style={[styles.actIconBox, { backgroundColor: "#FEE2E2" }]}>
                      <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                    </View>
                    <Text style={styles.actTitle}>New Complaints</Text>
                    <View style={[styles.actBadge, { backgroundColor: "#FEE2E2" }]}>
                      <Text style={[styles.actBadgeText, { color: "#DC2626" }]}>{stats.newComplaints}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.activityItem}
                    onPress={() => router.push("/hostel-manager/notices")}
                  >
                    <View style={[styles.actIconBox, { backgroundColor: "#F0FDFA" }]}>
                      <Ionicons name="megaphone-outline" size={18} color="#0D9488" />
                    </View>
                    <Text style={styles.actTitle}>Notices Published</Text>
                    <View style={[styles.actBadge, { backgroundColor: "#F0FDFA" }]}>
                      <Text style={[styles.actBadgeText, { color: "#0D9488" }]}>{stats.totalNotices}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* CARD 3: Recent Gate Pass Requests */}
              <View style={styles.middleCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardHeaderTitle}>Recent Gate Pass Requests</Text>
                  <TouchableOpacity onPress={() => router.push("/hostel-manager/gate-pass")}>
                    <Text style={styles.cardHeaderLink}>View All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.gatePassList}>
                  {gatePasses.slice(0, 4).map((gp) => (
                    <View key={gp.id} style={styles.gatePassRow}>
                      <View style={styles.gpAvatarCircle}>
                        <Text style={styles.gpAvatarText}>{gp.studentName.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gpStudentName}>{gp.studentName}</Text>
                        <Text style={styles.gpTimeSub}>{gp.outTime} • {gp.purpose}</Text>
                      </View>

                      {gp.status === "Pending" ? (
                        <View style={styles.gpActionGroup}>
                          <TouchableOpacity
                            style={styles.miniApproveBtn}
                            onPress={() => handleApproveGatePass(gp.id, gp.studentName)}
                          >
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.miniRejectBtn}
                            onPress={() => handleRejectGatePass(gp.id, gp.studentName)}
                          >
                            <Ionicons name="close" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={[styles.gpStatusPill, gp.status === "Approved" ? styles.gpPillApproved : styles.gpPillRejected]}>
                          <Text style={[styles.gpStatusText, gp.status === "Approved" ? styles.gpTextApproved : styles.gpTextRejected]}>
                            {gp.status}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* QUICK ACTIONS ROW */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {[
                  { label: "Add Resident", icon: "person-add-outline", bg: "#EFF6FF", color: "#2563EB", route: "/hostel-manager/add-resident" },
                  { label: "Allocate Room", icon: "key-outline", bg: "#ECFDF5", color: "#059669", route: "/hostel-manager/room-allocation" },
                  { label: "New Gate Pass", icon: "exit-outline", bg: "#FFF7ED", color: "#EA580C", action: () => setGatePassModal(true) },
                  { label: "New Leave", icon: "calendar-outline", bg: "#FEF3C7", color: "#D97706", route: "/hostel-manager/leave" },
                  { label: "Post Notice", icon: "megaphone-outline", bg: "#FDF2F8", color: "#DB2777", action: () => setNoticeModal(true) },
                  { label: "View Reports", icon: "bar-chart-outline", bg: "#EEF2FF", color: "#4F46E5", route: "/hostel-manager/reports" },
                ].map((act, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickActionBtn}
                    onPress={act.action ? act.action : () => router.push(act.route as any)}
                  >
                    <View style={[styles.quickActionIconBox, { backgroundColor: act.bg }]}>
                      <Ionicons name={act.icon as any} size={18} color={act.color} />
                    </View>
                    <Text style={styles.quickActionLabel}>{act.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* BOTTOM HOSTEL BANNER */}
            <View style={styles.hostelPromoBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.promoTitle}>Keep Our Hostel Safe & Clean</Text>
                <Text style={styles.promoSub}>
                  A safe hostel makes a better tomorrow. Regular inspections ensure security and hygiene for all residents.
                </Text>
              </View>
              <View style={styles.promoBadge}>
                <Ionicons name="shield-checkmark" size={32} color="#059669" />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* QUICK GATE PASS MODAL */}
      <Modal visible={gatePassModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeading}>Issue Quick Gate Pass</Text>

            <Text style={styles.fieldLabel}>Resident Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Rohan Sharma"
              value={newStudentName}
              onChangeText={setNewStudentName}
            />

            <Text style={styles.fieldLabel}>Purpose</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Medical, Library, Market"
              value={newPurpose}
              onChangeText={setNewPurpose}
            />

            <Text style={styles.fieldLabel}>Expected Out Time</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 05:30 PM"
              value={newOutTime}
              onChangeText={setNewOutTime}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setGatePassModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateGatePass}
              >
                <Text style={styles.modalSubmitText}>Create Pass</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QUICK POST NOTICE MODAL */}
      <Modal visible={noticeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeading}>Broadcast Hostel Notice</Text>

            <Text style={styles.fieldLabel}>Notice Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Water Supply Maintenance"
              value={noticeTitle}
              onChangeText={setNoticeTitle}
            />

            <Text style={styles.fieldLabel}>Target Audience</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. All Residents / Block A"
              value={noticeAudience}
              onChangeText={setNoticeAudience}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setNoticeModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: "#DB2777" }]}
                onPress={handlePostNotice}
              >
                <Text style={styles.modalSubmitText}>Broadcast Notice</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  sidebar: {
    width: 240,
    backgroundColor: "#0A1E3F",
    paddingVertical: 18,
    borderRightWidth: 1,
    borderRightColor: "#1E293B",
  },
  mobileSidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  logoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  logoSubText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  closeDrawerBtn: {
    marginLeft: "auto",
    padding: 4,
  },
  navScroll: {
    flex: 1,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: "#2563EB",
  },
  navLabel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sidebarBottom: {
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: {
    color: "#0A1E3F",
    fontWeight: "800",
    fontSize: 14,
  },
  sidebarUserText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  sidebarUserSub: {
    color: "#94A3B8",
    fontSize: 10,
  },
  mainCanvas: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    height: 60,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  menuBurger: {
    padding: 6,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: "70%",
    maxWidth: 420,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    padding: 0,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  userProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0284C7",
    alignItems: "center",
    justifyContent: "center",
  },
  topAvatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  userTextCol: {
    alignItems: "flex-start",
  },
  userName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  userRole: {
    fontSize: 10.5,
    color: "#64748B",
  },
  dashboardScroll: {
    flex: 1,
  },
  contentPadding: {
    padding: 20,
    gap: 20,
  },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    padding: 12,
  },
  toastText: {
    color: "#065F46",
    fontSize: 13.5,
    fontWeight: "600",
  },
  welcomeBanner: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  welcomeSub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  datePillText: {
    fontSize: 12,
    color: "#0369A1",
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "500",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  statSubText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  middleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  middleCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardHeaderLink: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  donutContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  donutCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: "#0284C7",
    alignItems: "center",
    justifyContent: "center",
  },
  donutPercentage: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0284C7",
  },
  donutSub: {
    fontSize: 10,
    color: "#64748B",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
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
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "500",
  },
  activityList: {
    gap: 10,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  actIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actTitle: {
    flex: 1,
    fontSize: 12.5,
    color: "#334155",
    fontWeight: "500",
  },
  actBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  actBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  gatePassList: {
    gap: 10,
  },
  gatePassRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  gpAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  gpAvatarText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  gpStudentName: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  gpTimeSub: {
    fontSize: 10.5,
    color: "#94A3B8",
  },
  gpActionGroup: {
    flexDirection: "row",
    gap: 6,
  },
  miniApproveBtn: {
    backgroundColor: "#059669",
    padding: 6,
    borderRadius: 6,
  },
  miniRejectBtn: {
    backgroundColor: "#DC2626",
    padding: 6,
    borderRadius: 6,
  },
  gpStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gpPillApproved: {
    backgroundColor: "#DCFCE7",
  },
  gpPillRejected: {
    backgroundColor: "#FEE2E2",
  },
  gpStatusText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  gpTextApproved: {
    color: "#059669",
  },
  gpTextRejected: {
    color: "#DC2626",
  },
  quickActionsSection: {
    gap: 10,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quickActionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  hostelPromoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#065F46",
  },
  promoSub: {
    fontSize: 12,
    color: "#047857",
    marginTop: 4,
  },
  promoBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0284C7",
  },
  modalSubmitText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
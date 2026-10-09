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
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { sendStudentNotification } from "../../services/notificationService";
import RoleSwitcherModal from "../../components/RoleSwitcherModal";

export default function FeeManagerDashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [roleSwitcherVisible, setRoleSwitcherVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "records" | "collection" | "dues" | "reports">("home");
  const [collectModalVisible, setCollectModalVisible] = useState(false);

  // Real-time Firestore State
  const [students, setStudents] = useState<any[]>([]);
  const [feesCatalog, setFeesCatalog] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Collect Payment Form State
  const [targetRollOrEmail, setTargetRollOrEmail] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentTitle, setPaymentTitle] = useState("Semester Tuition Fee");
  const [paymentMethod, setPaymentMethod] = useState("UPI / Cash");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Live Listeners for Students and Fees
  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, "users"), (snap) => {
      const studentDocs = snap.docs
        .filter((d) => (d.data().role || "").toLowerCase() === "student")
        .map((d) => ({ id: d.id, ...d.data() }));
      setStudents(studentDocs);
      setLoadingData(false);
    });

    const unsubFees = onSnapshot(collection(db, "fees"), (snap) => {
      const feeDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFeesCatalog(feeDocs);
    });

    return () => {
      unsubStudents();
      unsubFees();
    };
  }, []);

  const totalStudentsCount = students.length;
  const totalCollectedAmount = students.reduce(
    (acc, s) => acc + (Number(s.paidFees) || 0),
    0
  );
  const totalPendingAmount = students.reduce(
    (acc, s) => acc + (Number(s.remainingFees) || 0),
    0
  );

  // Dynamic Dues by Branch calculated from real student accounts
  const branchMap: Record<string, { totalDues: number; count: number }> = {};
  students.forEach((s) => {
    const branch = (s.department || "CSE").toUpperCase();
    if (!branchMap[branch]) branchMap[branch] = { totalDues: 0, count: 0 };
    const rem = Number(s.remainingFees) || 0;
    if (rem > 0) {
      branchMap[branch].totalDues += rem;
      branchMap[branch].count += 1;
    }
  });

  const branchColors: Record<string, { color: string; bg: string }> = {
    CSE: { color: "#2563EB", bg: "#EFF6FF" },
    ECE: { color: "#7C3AED", bg: "#F5F3FF" },
    ME: { color: "#D97706", bg: "#FFFBEB" },
    EEE: { color: "#DC2626", bg: "#FEF2F2" },
    CIVIL: { color: "#059669", bg: "#ECFDF5" },
    IT: { color: "#0284C7", bg: "#F0F9FF" },
  };

  const dynamicDuesByBranch =
    Object.keys(branchMap).length > 0
      ? Object.keys(branchMap).map((branch) => ({
          branch,
          amount: `₹ ${branchMap[branch].totalDues.toLocaleString("en-IN")}`,
          students: `${branchMap[branch].count} students`,
          color: branchColors[branch]?.color || "#2563EB",
          bg: branchColors[branch]?.bg || "#EFF6FF",
        }))
      : [
          {
            branch: "CSE",
            amount: "₹ 0",
            students: "0 students with dues",
            color: "#2563EB",
            bg: "#EFF6FF",
          },
        ];

  // Handler for collecting student fee offline / direct
  const handleCollectStudentFee = async () => {
    if (!targetRollOrEmail.trim()) {
      Alert.alert("Missing Student", "Please enter student Roll No, Email, or Name.");
      return;
    }
    const parsedAmt = parseFloat(paymentAmount.replace(/[^0-9.]/g, ""));
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid numeric payment amount.");
      return;
    }

    const cleanInput = targetRollOrEmail.trim().toLowerCase();
    const matched = students.find(
      (s) =>
        (s.rollNo && s.rollNo.toLowerCase() === cleanInput) ||
        (s.email && s.email.toLowerCase() === cleanInput) ||
        (s.fullName && s.fullName.toLowerCase() === cleanInput)
    );

    if (!matched) {
      Alert.alert("Student Not Found", `No registered student account found matching "${targetRollOrEmail}".`);
      return;
    }

    try {
      setSubmittingPayment(true);
      const txnId = `TXN-OFFLINE-${Date.now().toString().slice(-6)}`;

      // 1. Write to student's fees_breakdown
      await addDoc(
        collection(db, "users", matched.id, "fees_breakdown"),
        {
          title: paymentTitle.trim() || "College Fee Payment",
          amount: parsedAmt,
          status: "Paid",
          isPaid: true,
          category: "Tuition",
          paymentMethod,
          transactionId: txnId,
          dueDate: "Paid",
          paidAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }
      );

      // 2. Write to payments collection
      await addDoc(collection(db, "payments"), {
        studentId: matched.id,
        studentName: matched.fullName || matched.name || "Student",
        studentEmail: matched.email || "",
        studentRollNo: matched.rollNo || "",
        title: paymentTitle.trim(),
        amount: parsedAmt,
        category: "Tuition",
        status: "Success",
        paymentMethod,
        transactionId: txnId,
        collectedBy: "Vikram Singh (Fee Manager)",
        paidAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // 3. Update student user doc
      const currentPaid = Number(matched.paidFees || 0);
      const currentTotal = Number(matched.totalFees || currentPaid + parsedAmt);
      const newPaid = currentPaid + parsedAmt;
      const newRemaining = Math.max(0, currentTotal - newPaid);
      const newStatus = newRemaining === 0 ? "Paid" : "Partial";

      await updateDoc(doc(db, "users", matched.id), {
        paidFees: newPaid,
        remainingFees: newRemaining,
        feeStatus: newStatus,
        lastPaymentDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        updatedAt: serverTimestamp(),
      });

      // 4. Send instant notification to student
      await sendStudentNotification({
        studentId: matched.id,
        studentEmail: matched.email || "",
        title: "💳 Fee Payment Received",
        message: `Official fee payment of ₹${parsedAmt.toLocaleString("en-IN")} for "${paymentTitle.trim()}" has been received. Txn: ${txnId}`,
        type: "fee",
        actionRoute: "/fees",
        metadata: {
          transactionId: txnId,
          amount: parsedAmt,
        },
      });

      // 5. Activity log
      await addDoc(collection(db, "activities"), {
        title: `Fee Collected: ₹${parsedAmt.toLocaleString("en-IN")} from ${matched.fullName || matched.rollNo} by Fee Manager`,
        time: "Just now",
        user: "Fee Manager",
        type: "fees",
        createdAt: serverTimestamp(),
      });

      setCollectModalVisible(false);
      setTargetRollOrEmail("");
      setPaymentAmount("");
      Alert.alert(
        "Payment Recorded! 💳",
        `Receipt generated for ${matched.fullName || matched.rollNo}.\nAmount: ₹ ${parsedAmt.toLocaleString("en-IN")}\nTxn ID: ${txnId}\n✓ Live sync with student profile complete.`
      );
    } catch (e: any) {
      Alert.alert("Collection Failed", e?.message || "Failed to record payment.");
    } finally {
      setSubmittingPayment(false);
    }
  };

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
                <Text style={styles.userRole}>vikram.fee@gmail.com</Text>
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
                <Text style={[styles.statValue, { color: "#0C4A6E" }]}>{totalStudentsCount}</Text>
              </TouchableOpacity>

              {/* Collected */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}
                onPress={() => router.push("/admin/fees")}
              >
                <Text style={[styles.statLabel, { color: "#15803D" }]}>Collected</Text>
                <Text style={[styles.statValue, { color: "#14532D" }]}>
                  ₹ {totalCollectedAmount.toLocaleString("en-IN")}
                </Text>
              </TouchableOpacity>

              {/* Pending */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}
                onPress={() => router.push("/admin/fees")}
              >
                <Text style={[styles.statLabel, { color: "#EA580C" }]}>Pending</Text>
                <Text style={[styles.statValue, { color: "#9A3412" }]}>
                  ₹ {totalPendingAmount.toLocaleString("en-IN")}
                </Text>
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
                  {dynamicDuesByBranch.map((d, i) => (
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
                        onPress={() => Alert.alert("Reminder Sent", `Payment reminder SMS & Notification sent to ${d.branch} students.`)}
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
              Directly record verified student fee payments, update student profile, and issue digital receipts.
            </Text>

            {/* Student Search/Input */}
            <Text style={styles.formLabel}>Student Roll No or Email *</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="e.g. 23CSE001 or ganesh.student@gmail.com"
              placeholderTextColor="#94A3B8"
              value={targetRollOrEmail}
              onChangeText={setTargetRollOrEmail}
              autoCapitalize="none"
            />

            {/* Amount */}
            <Text style={styles.formLabel}>Payment Amount (₹) *</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="e.g. 15000"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
            />

            {/* Title / Description */}
            <Text style={styles.formLabel}>Fee Purpose / Description</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="e.g. Semester Tuition Fee"
              placeholderTextColor="#94A3B8"
              value={paymentTitle}
              onChangeText={setPaymentTitle}
            />

            {/* Payment Method */}
            <Text style={styles.formLabel}>Payment Method</Text>
            <View style={styles.methodRow}>
              {["UPI / Online", "Cash", "Cheque / DD"].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.methodChip,
                    paymentMethod === m && styles.methodChipActive,
                  ]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text
                    style={[
                      styles.methodChipText,
                      paymentMethod === m && styles.methodChipTextActive,
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: "#0284C7" }]}
                onPress={handleCollectStudentFee}
                disabled={submittingPayment}
              >
                {submittingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.modalActionBtnText}>Record Payment & Notify</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: "#0F172A", marginTop: 8 }]}
                onPress={() => {
                  setCollectModalVisible(false);
                  router.push("/admin/fees");
                }}
              >
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text style={styles.modalActionBtnText}>Open Master Fee Ledger</Text>
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
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
    marginTop: 8,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  methodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    marginTop: 2,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  methodChipActive: {
    backgroundColor: "#0284C7",
    borderColor: "#0284C7",
  },
  methodChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  methodChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

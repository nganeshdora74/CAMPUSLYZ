import React, { useState } from "react";
import {
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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import NotificationBellModal from "../../components/NotificationBellModal";
import notificationService from "../../services/notificationService";

interface FeeHead {
  id: string;
  name: string;
  amount: number;
  paid: number;
  due: number;
  status: "CLEARED" | "PENDING";
}

const INITIAL_FEE_HEADS: FeeHead[] = [
  { id: "fh-1", name: "Tuition Fee (Sem 3)", amount: 40000, paid: 40000, due: 0, status: "CLEARED" },
  { id: "fh-2", name: "Hostel Room Rent (Block B)", amount: 30000, paid: 30000, due: 0, status: "CLEARED" },
  { id: "fh-3", name: "Mess Advance (Sem 3)", amount: 25000, paid: 0, due: 25000, status: "PENDING" },
  { id: "fh-4", name: "Semester Examination Fee", amount: 3000, paid: 0, due: 3000, status: "PENDING" },
  { id: "fh-5", name: "Library & Computing Facilities", amount: 2000, paid: 2000, due: 0, status: "CLEARED" },
  { id: "fh-6", name: "Student Welfare & Amenities", amount: 1000, paid: 0, due: 1000, status: "PENDING" },
];

export default function StudentFeeDetailsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const [feeHeads, setFeeHeads] = useState<FeeHead[]>(INITIAL_FEE_HEADS);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payAmount, setPayAmount] = useState("29000");
  const [payMode, setPayMode] = useState("UPI / Online");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalFee = feeHeads.reduce((acc, h) => acc + h.amount, 0);
  const totalPaid = feeHeads.reduce((acc, h) => acc + h.paid, 0);
  const totalDue = feeHeads.reduce((acc, h) => acc + h.due, 0);

  const handleSendFeeNotice = async () => {
    await notificationService.sendNotification({
      title: "Fee Due Notice: Outstanding ₹29,000",
      body: `Notice to Rahul Kumar (CS2101): Your Mess fee (₹25,000) and Exam fee (₹3,000) are pending for 3rd Sem. Please clear by 15 Oct 2026.`,
      role: "fee_manager",
      targetRoles: ["student"],
      category: "fee_reminder",
      metadata: {
        studentRoll: "CS2101",
        studentName: "Rahul Kumar",
        totalDue,
        dueDate: "15 Oct 2026",
      },
    });

    setToastMessage("Notification Sent Successfully! Outgoing notice recorded & delivered to Rahul Kumar.");
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleRecordPaymentSubmit = async () => {
    const amt = parseInt(payAmount, 10) || 0;
    if (amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount.");
      return;
    }

    // Mark pending heads as cleared or reduced
    setFeeHeads((prev) =>
      prev.map((h) => (h.due > 0 ? { ...h, paid: h.amount, due: 0, status: "CLEARED" } : h))
    );

    await notificationService.sendNotification({
      title: `Fee Payment Received: ₹${amt.toLocaleString()}`,
      body: `Payment of ₹${amt.toLocaleString()} received for Rahul Kumar (CS2101) via ${payMode}. Receipt RCP-2026-904 generated.`,
      role: "fee_manager",
      targetRoles: ["student"],
      category: "fee_receipt",
      metadata: {
        amount: amt,
        mode: payMode,
        receiptNo: "RCP-2026-904",
      },
    });

    setPayModalVisible(false);
    setToastMessage(`Payment of ₹${amt.toLocaleString()} recorded successfully! Receipt generated.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/fee-manager/students")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Student Fee Details</Text>
            <Text style={styles.pageSubtitle}>Individual Ledger & Fee Breakdown</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <NotificationBellModal />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {toastMessage && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={22} color="#059669" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* Student Profile Overview Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>RK</Text>
          </View>

          <View style={styles.profileMeta}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>Rahul Kumar</Text>
              <View style={styles.rollBadge}>
                <Text style={styles.rollBadgeText}>CS2101</Text>
              </View>
            </View>
            <Text style={styles.profileCourse}>B.Tech Computer Science & Engineering • 3rd Sem</Text>
            <Text style={styles.profileContact}>
              Father: Suresh Kumar (+91 98111 22334) • rahul.kumar@campusly.edu
            </Text>
          </View>

          <View style={styles.actionButtonsCol}>
            <TouchableOpacity
              style={styles.recordPayBtn}
              onPress={() => setPayModalVisible(true)}
            >
              <Ionicons name="cash-outline" size={16} color="#FFFFFF" />
              <Text style={styles.recordPayBtnText}>Record Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendNoticeBtn}
              onPress={handleSendFeeNotice}
            >
              <Ionicons name="paper-plane-outline" size={16} color="#2563EB" />
              <Text style={styles.sendNoticeBtnText}>Send Fee Notice</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3 Metric Cards */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { borderLeftColor: "#2563EB" }]}>
            <Text style={styles.metricLabel}>Total Prescribed Fees</Text>
            <Text style={styles.metricVal}>₹{totalFee.toLocaleString()}</Text>
            <Text style={styles.metricSub}>Academic Year 2026-27</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.metricLabel}>Amount Paid</Text>
            <Text style={[styles.metricVal, { color: "#10B981" }]}>
              ₹{totalPaid.toLocaleString()}
            </Text>
            <Text style={styles.metricSub}>2 Transactions Verified</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: "#DC2626" }]}>
            <Text style={styles.metricLabel}>Pending Balance</Text>
            <Text style={[styles.metricVal, { color: "#DC2626" }]}>
              ₹{totalDue.toLocaleString()}
            </Text>
            <Text style={styles.metricSub}>Due by 15 Oct 2026</Text>
          </View>
        </View>

        {/* Detailed Fee Heads Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Fee Component Breakdown</Text>
          <Text style={styles.cardHeaderSub}>Itemized semester fees and payment status</Text>

          <View style={styles.tableWrap}>
            <View style={styles.thead}>
              <Text style={[styles.th, { flex: 1 }]}>Fee Head Description</Text>
              <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Amount</Text>
              <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Paid</Text>
              <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Due</Text>
              <Text style={[styles.th, { width: 100, textAlign: "center" }]}>Status</Text>
            </View>

            {feeHeads.map((head, idx) => (
              <View
                key={head.id}
                style={[
                  styles.trow,
                  idx % 2 === 0 ? styles.trowEven : styles.trowOdd,
                ]}
              >
                <Text style={[styles.tdHeadName, { flex: 1 }]}>{head.name}</Text>
                <Text style={[styles.tdNum, { width: 100, textAlign: "right" }]}>
                  ₹{head.amount.toLocaleString()}
                </Text>
                <Text style={[styles.tdNum, { width: 100, textAlign: "right", color: "#10B981" }]}>
                  ₹{head.paid.toLocaleString()}
                </Text>
                <Text style={[styles.tdNum, { width: 100, textAlign: "right", color: head.due > 0 ? "#DC2626" : "#475569" }]}>
                  ₹{head.due.toLocaleString()}
                </Text>
                <View style={{ width: 100, alignItems: "center" }}>
                  <View
                    style={[
                      styles.statusBadge,
                      head.status === "CLEARED" ? styles.badgeCleared : styles.badgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        head.status === "CLEARED" ? styles.badgeTextCleared : styles.badgeTextPending,
                      ]}
                    >
                      {head.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Receipts & Audit Trail Link */}
        <View style={styles.card}>
          <View style={styles.receiptActionRow}>
            <View>
              <Text style={styles.cardHeaderTitle}>Payment Receipts</Text>
              <Text style={styles.cardHeaderSub}>RCP-2026-881 (₹40,000) • RCP-2026-895 (₹32,000)</Text>
            </View>
            <TouchableOpacity
              style={styles.viewReceiptsBtn}
              onPress={() => router.push("/fee-manager/view-receipts")}
            >
              <Ionicons name="receipt-outline" size={16} color="#0A1E3F" />
              <Text style={styles.viewReceiptsBtnText}>View Receipts</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Record Payment Modal */}
      <Modal
        visible={payModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Fee Payment</Text>
              <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Student</Text>
              <Text style={styles.formValStatic}>Rahul Kumar (CS2101) • 3rd Sem</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Payment Amount (₹)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Payment Mode</Text>
              <View style={styles.modeRow}>
                {["UPI / Online", "Net Banking", "Cash", "Cheque"].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.modeBtn,
                      payMode === m && styles.modeBtnActive,
                    ]}
                    onPress={() => setPayMode(m)}
                  >
                    <Text
                      style={[
                        styles.modeBtnText,
                        payMode === m && styles.modeBtnTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPayModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitPayBtn}
                onPress={handleRecordPaymentSubmit}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.submitPayBtnText}>Confirm & Issue Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  toastText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#065F46",
    flex: 1,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitials: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  profileMeta: {
    flex: 1,
    minWidth: 260,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  rollBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rollBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  profileCourse: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
    fontWeight: "500",
  },
  profileContact: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  actionButtonsCol: {
    gap: 8,
  },
  recordPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0A1E3F",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  recordPayBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sendNoticeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  sendNoticeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  metricVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 11,
    color: "#64748B",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardHeaderSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 16,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    overflow: "hidden",
  },
  thead: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  th: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  trow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  trowEven: {
    backgroundColor: "#FFFFFF",
  },
  trowOdd: {
    backgroundColor: "#FAFAFA",
  },
  tdHeadName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  tdNum: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeCleared: {
    backgroundColor: "#ECFDF5",
  },
  badgePending: {
    backgroundColor: "#FEF3C7",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  badgeTextCleared: {
    color: "#059669",
  },
  badgeTextPending: {
    color: "#D97706",
  },
  receiptActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewReceiptsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  viewReceiptsBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0A1E3F",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 440,
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
    fontWeight: "700",
    color: "#0F172A",
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  formValStatic: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: "#0F172A",
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  modeBtnActive: {
    backgroundColor: "#0A1E3F",
    borderColor: "#0A1E3F",
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  modeBtnTextActive: {
    color: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  submitPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0A1E3F",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  submitPayBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

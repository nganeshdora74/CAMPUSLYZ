import React, { useState } from "react";
import {
  Alert,
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

interface PendingStudent {
  rollNo: string;
  name: string;
  course: string;
  totalFee: number;
  paidFee: number;
  dueFee: number;
  dueDate: string;
  phone: string;
}

const PENDING_STUDENTS: PendingStudent[] = [
  { rollNo: "CS2101", name: "Rahul Kumar", course: "B.Tech CSE - 3rd Sem", totalFee: 101000, paidFee: 72000, dueFee: 29000, dueDate: "15 Oct 2026", phone: "+91 98111 22334" },
  { rollNo: "CS2105", name: "Ishaan Mehta", course: "B.Tech CSE - 3rd Sem", totalFee: 101000, paidFee: 70000, dueFee: 31000, dueDate: "15 Oct 2026", phone: "+91 98222 33445" },
  { rollNo: "CS2109", name: "Aditya Joshi", course: "B.Tech CSE - 3rd Sem", totalFee: 101000, paidFee: 50000, dueFee: 51000, dueDate: "15 Oct 2026", phone: "+91 98333 44556" },
  { rollNo: "CS2111", name: "Manish Kumar", course: "B.Tech CSE - 3rd Sem", totalFee: 101000, paidFee: 60000, dueFee: 41000, dueDate: "15 Oct 2026", phone: "+91 98444 55667" },
  { rollNo: "IT2103", name: "Vikram Malhotra", course: "B.Tech IT - 3rd Sem", totalFee: 98000, paidFee: 58000, dueFee: 40000, dueDate: "15 Oct 2026", phone: "+91 98555 66778" },
  { rollNo: "EC2104", name: "Nisha Singhania", course: "B.Tech ECE - 3rd Sem", totalFee: 95000, paidFee: 65000, dueFee: 30000, dueDate: "15 Oct 2026", phone: "+91 98666 77889" },
];

export default function PendingStudentsScreen() {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSendSingleReminder = async (student: PendingStudent) => {
    await notificationService.sendNotification({
      title: "Fee Reminder: Due Oct 15",
      body: `Dear ${student.name} (${student.rollNo}), your pending semester fee of ₹${student.dueFee.toLocaleString()} is due on ${student.dueDate}. Please make payment to avoid late fees.`,
      role: "fee_manager",
      targetRoles: ["student"],
      category: "fee_reminder",
      metadata: {
        rollNo: student.rollNo,
        dueAmount: student.dueFee,
        dueDate: student.dueDate,
      },
    });

    setToastMessage(`Notification Sent Successfully! Reminder sent to ${student.name} (${student.rollNo}).`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleBulkRemind = async () => {
    await notificationService.sendNotification({
      title: "Urgent Fee Payment Reminder",
      body: "Reminder to all students with outstanding balances: Please settle semester dues by 15 Oct 2026.",
      role: "fee_manager",
      targetRoles: ["student"],
      category: "fee_reminder",
      metadata: { totalTargeted: 42, dueDate: "15 Oct 2026" },
    });

    setToastMessage("Notification Sent Successfully! Outgoing notifications dispatched to all 42 pending students.");
    setTimeout(() => setToastMessage(null), 5000);
  };

  const filtered = PENDING_STUDENTS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Text style={styles.pageTitle}>Pending Students</Text>
            <Text style={styles.pageSubtitle}>42 Students with Unpaid Semester Balances</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.bulkRemindBtn} onPress={handleBulkRemind}>
            <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
            <Text style={styles.bulkRemindBtnText}>Remind All (42)</Text>
          </TouchableOpacity>
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

        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <View style={styles.warnLeft}>
            <Ionicons name="time" size={30} color="#D97706" />
            <View>
              <Text style={styles.warnTitle}>₹2,70,000 Total Outstanding</Text>
              <Text style={styles.warnSub}>Due Date: 15 October 2026 • Late fee applied after deadline</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by student name or roll number..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Table */}
        <View style={styles.card}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: 90 }]}>Roll No</Text>
            <Text style={[styles.th, { flex: 1 }]}>Student</Text>
            <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Total Fee</Text>
            <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Paid</Text>
            <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Balance Due</Text>
            <Text style={[styles.th, { width: 110, textAlign: "center" }]}>Action</Text>
          </View>

          {filtered.map((st, idx) => (
            <View
              key={st.rollNo}
              style={[
                styles.trow,
                idx % 2 === 0 ? styles.trowEven : styles.trowOdd,
              ]}
            >
              <Text style={[styles.tdRoll, { width: 90 }]}>{st.rollNo}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tdName}>{st.name}</Text>
                <Text style={styles.tdSub}>{st.course} • Due {st.dueDate}</Text>
              </View>
              <Text style={[styles.tdNum, { width: 100, textAlign: "right" }]}>
                ₹{st.totalFee.toLocaleString()}
              </Text>
              <Text style={[styles.tdNum, { width: 100, textAlign: "right", color: "#10B981" }]}>
                ₹{st.paidFee.toLocaleString()}
              </Text>
              <Text style={[styles.tdNum, { width: 100, textAlign: "right", color: "#D97706" }]}>
                ₹{st.dueFee.toLocaleString()}
              </Text>
              <View style={{ width: 110, alignItems: "center" }}>
                <TouchableOpacity
                  style={styles.remindBtn}
                  onPress={() => handleSendSingleReminder(st)}
                >
                  <Ionicons name="notifications-outline" size={14} color="#D97706" />
                  <Text style={styles.remindBtnText}>Remind</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
  bulkRemindBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#D97706",
  },
  bulkRemindBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
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
  warningBanner: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  warnTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#92400E",
  },
  warnSub: {
    fontSize: 12,
    color: "#B45309",
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  thead: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingHorizontal: 16,
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
  tdRoll: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  tdName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  tdSub: {
    fontSize: 11,
    color: "#64748B",
  },
  tdNum: {
    fontSize: 13,
    fontWeight: "700",
  },
  remindBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  remindBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
});

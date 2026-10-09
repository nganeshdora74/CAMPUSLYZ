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

interface DefaulterRecord {
  rollNo: string;
  name: string;
  course: string;
  overdueDays: number;
  principalDue: number;
  lateFee: number;
  totalDue: number;
  guardianPhone: string;
}

const DEFAULTERS_LIST: DefaulterRecord[] = [
  { rollNo: "CS2103", name: "Rohan Patel", course: "B.Tech CSE - 3rd Sem", overdueDays: 45, principalDue: 60500, lateFee: 500, totalDue: 61000, guardianPhone: "+91 98777 11223" },
  { rollNo: "CS2107", name: "Devansh Gupta", course: "B.Tech CSE - 3rd Sem", overdueDays: 52, principalDue: 65500, lateFee: 500, totalDue: 66000, guardianPhone: "+91 98888 22334" },
  { rollNo: "IT2109", name: "Sameer Sheikh", course: "B.Tech IT - 3rd Sem", overdueDays: 38, principalDue: 49500, lateFee: 500, totalDue: 50000, guardianPhone: "+91 98999 33445" },
  { rollNo: "EC2112", name: "Deepak Sharma", course: "B.Tech ECE - 3rd Sem", overdueDays: 60, principalDue: 54500, lateFee: 500, totalDue: 55000, guardianPhone: "+91 98123 45678" },
];

export default function DefaultersScreen() {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleIssueNotice = async (student: DefaulterRecord) => {
    await notificationService.sendNotification({
      title: "URGENT: Final Fee Defaulter Warning",
      body: `Notice to ${student.name} (${student.rollNo}): Your fee payment is overdue by ${student.overdueDays} days. Outstanding total of ₹${student.totalDue.toLocaleString()} (including ₹500 late fee fine). Settle immediately to prevent enrollment suspension.`,
      role: "fee_manager",
      targetRoles: ["student"],
      category: "fee_reminder",
      metadata: {
        rollNo: student.rollNo,
        days: student.overdueDays,
        totalDue: student.totalDue,
      },
    });

    setToastMessage(`Notification Sent Successfully! Final warning notice dispatched to ${student.name} & guardian.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleBulkWarning = async () => {
    await notificationService.sendNotification({
      title: "Formal Defaulter Notice Broadcast",
      body: "Formal warning notice issued to all fee defaulters with over 30 days outstanding. Exam hall tickets and portal access will be held until clearance.",
      role: "fee_manager",
      targetRoles: ["student"],
      category: "fee_reminder",
      metadata: { targetCount: 16, type: "legal_warning" },
    });

    setToastMessage("Notification Sent Successfully! Warning notices broadcasted to 16 defaulters.");
    setTimeout(() => setToastMessage(null), 5000);
  };

  const filtered = DEFAULTERS_LIST.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
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
            <Text style={styles.pageTitle}>Fee Defaulters</Text>
            <Text style={styles.pageSubtitle}>16 Students Overdue &gt; 30 Days</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.bulkNoticeBtn} onPress={handleBulkWarning}>
            <Ionicons name="warning-outline" size={16} color="#FFFFFF" />
            <Text style={styles.bulkNoticeBtnText}>Broadcast Notice (16)</Text>
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

        {/* Red Alert Banner */}
        <View style={styles.dangerBanner}>
          <Ionicons name="alert-circle" size={32} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerTitle}>₹1,00,000 Overdue Across 16 Defaulters</Text>
            <Text style={styles.dangerSub}>
              Late fee penalty of ₹500 has been added to these accounts. Final notice dispatch will send notifications to students and parents.
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search defaulter by name or roll number..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Table */}
        <View style={styles.card}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: 90 }]}>Roll No</Text>
            <Text style={[styles.th, { flex: 1 }]}>Student & Contact</Text>
            <Text style={[styles.th, { width: 90, textAlign: "center" }]}>Overdue</Text>
            <Text style={[styles.th, { width: 90, textAlign: "right" }]}>Fine</Text>
            <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Total Due</Text>
            <Text style={[styles.th, { width: 120, textAlign: "center" }]}>Action</Text>
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
                <Text style={styles.tdSub}>{st.course} • Guardian: {st.guardianPhone}</Text>
              </View>
              <View style={{ width: 90, alignItems: "center" }}>
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueBadgeText}>{st.overdueDays} Days</Text>
                </View>
              </View>
              <Text style={[styles.tdNum, { width: 90, textAlign: "right", color: "#DC2626" }]}>
                +₹{st.lateFee}
              </Text>
              <Text style={[styles.tdNum, { width: 100, textAlign: "right", color: "#DC2626", fontWeight: "800" }]}>
                ₹{st.totalDue.toLocaleString()}
              </Text>
              <View style={{ width: 120, alignItems: "center" }}>
                <TouchableOpacity
                  style={styles.issueNoticeBtn}
                  onPress={() => handleIssueNotice(st)}
                >
                  <Ionicons name="megaphone-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.issueNoticeBtnText}>Issue Notice</Text>
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
  bulkNoticeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#DC2626",
  },
  bulkNoticeBtnText: {
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
  dangerBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#991B1B",
  },
  dangerSub: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
    lineHeight: 18,
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
  overdueBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  overdueBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
  },
  tdNum: {
    fontSize: 13,
    fontWeight: "600",
  },
  issueNoticeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DC2626",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  issueNoticeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

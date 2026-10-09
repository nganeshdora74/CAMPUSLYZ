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

interface PaidStudent {
  rollNo: string;
  name: string;
  course: string;
  amount: number;
  receiptNo: string;
  date: string;
  mode: string;
}

const PAID_STUDENTS: PaidStudent[] = [
  { rollNo: "CS2102", name: "Ananya Verma", course: "B.Tech CSE - 3rd Sem", amount: 101000, receiptNo: "RCP-2026-880", date: "06 Oct 2026", mode: "Net Banking" },
  { rollNo: "CS2104", name: "Priya Singh", course: "B.Tech CSE - 3rd Sem", amount: 101000, receiptNo: "RCP-2026-882", date: "05 Oct 2026", mode: "UPI" },
  { rollNo: "CS2106", name: "Kavya Nair", course: "B.Tech CSE - 3rd Sem", amount: 101000, receiptNo: "RCP-2026-885", date: "04 Oct 2026", mode: "UPI" },
  { rollNo: "CS2108", name: "Sneha Reddy", course: "B.Tech IT - 3rd Sem", amount: 98000, receiptNo: "RCP-2026-889", date: "03 Oct 2026", mode: "Credit Card" },
  { rollNo: "CS2110", name: "Riya Chopra", course: "B.Tech CSE - 3rd Sem", amount: 101000, receiptNo: "RCP-2026-891", date: "02 Oct 2026", mode: "Cheque" },
  { rollNo: "CS2112", name: "Tanvi Deshmukh", course: "B.Tech IT - 3rd Sem", amount: 98000, receiptNo: "RCP-2026-894", date: "30 Sep 2026", mode: "Net Banking" },
];

export default function PaidStudentsScreen() {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const handleDownload = (receiptNo: string) => {
    setDownloadToast(`Official Receipt ${receiptNo} downloaded as PDF.`);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  const filtered = PAID_STUDENTS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.receiptNo.toLowerCase().includes(searchQuery.toLowerCase())
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
            <Text style={styles.pageTitle}>Paid Students</Text>
            <Text style={styles.pageSubtitle}>100% Fees Cleared • 128 Cleared Students</Text>
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
        {downloadToast && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.toastText}>{downloadToast}</Text>
          </View>
        )}

        {/* Highlight Card */}
        <View style={styles.highlightCard}>
          <View style={styles.highlightLeft}>
            <Ionicons name="shield-checkmark" size={32} color="#10B981" />
            <View>
              <Text style={styles.hlTitle}>All Dues Cleared</Text>
              <Text style={styles.hlSub}>Total ₹14,80,000 received with verified transaction receipts</Text>
            </View>
          </View>
          <View style={styles.clearedBadge}>
            <Text style={styles.clearedBadgeText}>128 STUDENTS (80%)</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by student name, roll number, or receipt..."
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
            <Text style={[styles.th, { width: 120 }]}>Receipt ID</Text>
            <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Amount</Text>
            <Text style={[styles.th, { width: 100, textAlign: "center" }]}>Receipt</Text>
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
                <Text style={styles.tdSub}>{st.course} • {st.date}</Text>
              </View>
              <View style={{ width: 120 }}>
                <Text style={styles.tdRcp}>{st.receiptNo}</Text>
                <Text style={styles.tdMode}>{st.mode}</Text>
              </View>
              <Text style={[styles.tdAmt, { width: 100, textAlign: "right" }]}>
                ₹{st.amount.toLocaleString()}
              </Text>
              <View style={{ width: 100, alignItems: "center" }}>
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => handleDownload(st.receiptNo)}
                >
                  <Ionicons name="download-outline" size={15} color="#2563EB" />
                  <Text style={styles.downloadBtnText}>PDF</Text>
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
  },
  highlightCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  highlightLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  hlTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#065F46",
  },
  hlSub: {
    fontSize: 12,
    color: "#047857",
    marginTop: 2,
  },
  clearedBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  clearedBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
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
  tdRcp: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  tdMode: {
    fontSize: 11,
    color: "#64748B",
  },
  tdAmt: {
    fontSize: 13,
    fontWeight: "800",
    color: "#10B981",
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  downloadBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
});

import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import NotificationBellModal from "../../components/NotificationBellModal";

interface FeeStructureItem {
  head: string;
  category: string;
  frequency: string;
  deadline: string;
  amount: number;
}

const CSE_STRUCTURE: FeeStructureItem[] = [
  { head: "Tuition Fee", category: "Academic", frequency: "Per Semester", deadline: "15 Oct 2026", amount: 40000 },
  { head: "Hostel Room Rent", category: "Residential", frequency: "Per Semester", deadline: "15 Oct 2026", amount: 30000 },
  { head: "Mess Advance", category: "Mess & Catering", frequency: "Per Semester", deadline: "15 Oct 2026", amount: 25000 },
  { head: "Semester Examination Fee", category: "Examination", frequency: "Per Semester", deadline: "20 Oct 2026", amount: 3000 },
  { head: "Library & Computing Lab", category: "Academic", frequency: "Annual", deadline: "15 Oct 2026", amount: 2000 },
  { head: "Student Welfare & Amenities", category: "Amenities", frequency: "Annual", deadline: "15 Oct 2026", amount: 1000 },
];

export default function FeeStructureScreen() {
  const { width } = useWindowDimensions();
  const [selectedCourse, setSelectedCourse] = useState("B.Tech CSE (3rd Sem)");
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const total = CSE_STRUCTURE.reduce((acc, i) => acc + i.amount, 0);

  const handleExport = () => {
    setDownloadToast("Fee structure syllabus sheet exported (PDF).");
    setTimeout(() => setDownloadToast(null), 4000);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/fee-manager/fee-management")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Fee Structure</Text>
            <Text style={styles.pageSubtitle}>Official fee component matrices by program</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={16} color="#FFFFFF" />
            <Text style={styles.exportBtnText}>Export PDF</Text>
          </TouchableOpacity>
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

        {/* Program Tabs */}
        <View style={styles.tabsRow}>
          {["B.Tech CSE (3rd Sem)", "B.Tech IT (3rd Sem)", "M.Tech CSE", "MCA"].map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.tabBtn,
                selectedCourse === c && styles.tabBtnActive,
              ]}
              onPress={() => setSelectedCourse(c)}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  selectedCourse === c && styles.tabBtnTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryTitle}>{selectedCourse}</Text>
            <Text style={styles.summarySub}>Academic Year 2026-2027 • Approved by Governing Council</Text>
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeLabel}>Total Prescribed Fee</Text>
            <Text style={styles.totalBadgeAmount}>₹{total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Breakdown Table */}
        <View style={styles.card}>
          <View style={styles.thead}>
            <Text style={[styles.th, { flex: 1 }]}>Fee Head</Text>
            <Text style={[styles.th, { width: 130 }]}>Category</Text>
            <Text style={[styles.th, { width: 120 }]}>Frequency</Text>
            <Text style={[styles.th, { width: 110 }]}>Deadline</Text>
            <Text style={[styles.th, { width: 110, textAlign: "right" }]}>Amount</Text>
          </View>

          {CSE_STRUCTURE.map((item, idx) => (
            <View
              key={item.head}
              style={[
                styles.trow,
                idx % 2 === 0 ? styles.trowEven : styles.trowOdd,
              ]}
            >
              <Text style={[styles.tdHead, { flex: 1 }]}>{item.head}</Text>
              <View style={{ width: 130 }}>
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{item.category}</Text>
                </View>
              </View>
              <Text style={[styles.tdFreq, { width: 120 }]}>{item.frequency}</Text>
              <Text style={[styles.tdDate, { width: 110 }]}>{item.deadline}</Text>
              <Text style={[styles.tdAmt, { width: 110, textAlign: "right" }]}>
                ₹{item.amount.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.addHeadBtn}
          onPress={() => router.push("/fee-manager/add-fee")}
        >
          <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
          <Text style={styles.addHeadBtnText}>+ Add New Fee Head to this Structure</Text>
        </TouchableOpacity>
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
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0A1E3F",
  },
  exportBtnText: {
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
  },
  tabsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  tabBtnActive: {
    backgroundColor: "#0A1E3F",
    borderColor: "#0A1E3F",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  summarySub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  totalBadge: {
    alignItems: "flex-end",
  },
  totalBadgeLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  totalBadgeAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2563EB",
    marginTop: 2,
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
  tdHead: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  catBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  tdFreq: {
    fontSize: 12,
    color: "#64748B",
  },
  tdDate: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  tdAmt: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  addHeadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 12,
    borderRadius: 10,
  },
  addHeadBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
});

import React, { useState, useEffect } from "react";
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

import unifiedStudentService from "../../services/unifiedStudentService";

interface StudentFeeRecord {
  id?: string;
  rollNo: string;
  name: string;
  branch: string;
  sem: string;
  totalFee: number;
  paidFee: number;
  dueFee: number;
  status: "PAID" | "PENDING" | "OVERDUE";
}

export default function FeeStudentsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const [students, setStudents] = useState<StudentFeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "PAID" | "PENDING" | "OVERDUE">("ALL");

  useEffect(() => {
    const unsubscribe = unifiedStudentService.subscribeStudents((list) => {
      const records: StudentFeeRecord[] = list.map((s) => ({
        id: s.id,
        rollNo: s.rollNo,
        name: s.fullName,
        branch: `B.Tech ${s.department}`,
        sem: `${s.semester} Sem`,
        totalFee: s.totalFee,
        paidFee: s.paidFee,
        dueFee: s.dueFee,
        status: s.feeStatus,
      }));
      setStudents(records);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const totalEnrolled = students.length;
  const paidCount = students.filter((s) => s.status === "PAID").length;
  const pendingCount = students.filter((s) => s.status === "PENDING").length;
  const defaultersCount = students.filter((s) => s.status === "OVERDUE").length;

  const categoryCards = [
    {
      title: "Student Fee Details",
      count: `${totalEnrolled} Enrolled`,
      sub: "Full Ledger & Breakdown",
      icon: "newspaper-outline",
      color: "#2563EB",
      route: "/fee-manager/student-fee-details",
    },
    {
      title: "Paid Students",
      count: `${paidCount} Students`,
      sub: "100% Fees Cleared",
      icon: "checkmark-done-circle",
      color: "#10B981",
      route: "/fee-manager/paid-students",
    },
    {
      title: "Pending Students",
      count: `${pendingCount} Students`,
      sub: "Partial / Dues Outstanding",
      icon: "time",
      color: "#F59E0B",
      route: "/fee-manager/pending-students",
    },
    {
      title: "Defaulters",
      count: `${defaultersCount} Students`,
      sub: "Overdue > 30 Days",
      icon: "alert-circle",
      color: "#EF4444",
      route: "/fee-manager/defaulters",
    },
  ];

  const filteredStudents = students.filter((s) => {
    const matchesFilter = filterTab === "ALL" || s.status === filterTab;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.branch.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/fee-manager")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Students Directory</Text>
            <Text style={styles.pageSubtitle}>Manage and inspect student fee accounts</Text>
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
        {/* 4 Category Cards from Screenshot 2 */}
        <View style={styles.categoryGrid}>
          {categoryCards.map((cat) => (
            <TouchableOpacity
              key={cat.title}
              style={styles.categoryCard}
              onPress={() => router.push(cat.route as any)}
            >
              <View style={[styles.catIconWrap, { backgroundColor: cat.color + "15" }]}>
                <Ionicons name={cat.icon as any} size={24} color={cat.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.catTitle}>{cat.title}</Text>
                <Text style={styles.catCount}>{cat.count}</Text>
                <Text style={styles.catSub}>{cat.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Search & Tabs */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by student name, roll no, or branch..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.tabsRow}>
            {(["ALL", "PAID", "PENDING", "OVERDUE"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, filterTab === tab && styles.tabBtnActive]}
                onPress={() => setFilterTab(tab)}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    filterTab === tab && styles.tabBtnTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Students Table */}
        <View style={styles.tableCard}>
          <View style={styles.thRow}>
            <Text style={[styles.th, { width: 90 }]}>Roll No</Text>
            <Text style={[styles.th, { flex: 1 }]}>Student Name</Text>
            <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Total Fee</Text>
            <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Paid</Text>
            <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Pending</Text>
            <Text style={[styles.th, { width: 90, textAlign: "center" }]}>Status</Text>
            <Text style={[styles.th, { width: 90, textAlign: "center" }]}>Action</Text>
          </View>

          {filteredStudents.map((st, index) => (
            <View
              key={st.rollNo}
              style={[
                styles.trRow,
                index % 2 === 0 ? styles.trEven : styles.trOdd,
              ]}
            >
              <Text style={[styles.tdRoll, { width: 90 }]}>{st.rollNo}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tdName}>{st.name}</Text>
                <Text style={styles.tdBranch}>{st.branch} • {st.sem}</Text>
              </View>
              <Text style={[styles.tdFee, { width: 100, textAlign: "right" }]}>
                ₹{st.totalFee.toLocaleString()}
              </Text>
              <Text style={[styles.tdPaid, { width: 100, textAlign: "right" }]}>
                ₹{st.paidFee.toLocaleString()}
              </Text>
              <Text style={[styles.tdDue, { width: 100, textAlign: "right" }]}>
                ₹{st.dueFee.toLocaleString()}
              </Text>
              <View style={{ width: 90, alignItems: "center" }}>
                <View
                  style={[
                    styles.statusPill,
                    st.status === "PAID"
                      ? styles.statusPillPaid
                      : st.status === "PENDING"
                      ? styles.statusPillPending
                      : styles.statusPillOverdue,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      st.status === "PAID"
                        ? styles.statusPillTextPaid
                        : st.status === "PENDING"
                        ? styles.statusPillTextPending
                        : styles.statusPillTextOverdue,
                    ]}
                  >
                    {st.status}
                  </Text>
                </View>
              </View>
              <View style={{ width: 90, alignItems: "center" }}>
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => router.push("/fee-manager/student-fee-details")}
                >
                  <Text style={styles.viewBtnText}>Ledger</Text>
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: 230,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  catTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  catCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
    marginTop: 2,
  },
  catSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  filterSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  searchBox: {
    flex: 1,
    minWidth: 280,
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
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    padding: 3,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#0F172A",
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  thRow: {
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
  trRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  trEven: {
    backgroundColor: "#FFFFFF",
  },
  trOdd: {
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
  tdBranch: {
    fontSize: 11,
    color: "#64748B",
  },
  tdFee: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  tdPaid: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981",
  },
  tdDue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillPaid: {
    backgroundColor: "#ECFDF5",
  },
  statusPillPending: {
    backgroundColor: "#FEF3C7",
  },
  statusPillOverdue: {
    backgroundColor: "#FEF2F2",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusPillTextPaid: {
    color: "#059669",
  },
  statusPillTextPending: {
    color: "#D97706",
  },
  statusPillTextOverdue: {
    color: "#DC2626",
  },
  viewBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
});

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

interface Transaction {
  id: string;
  name: string;
  roll: string;
  mode: string;
  amount: number;
  date: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
}

const TRANSACTIONS: Transaction[] = [
  { id: "TXN-8821", name: "Rahul Kumar", roll: "CS2101", mode: "UPI (Google Pay)", amount: 25000, date: "Today, 11:42 AM", status: "SUCCESS" },
  { id: "TXN-8820", name: "Ananya Verma", roll: "CS2102", mode: "Net Banking (HDFC)", amount: 40000, date: "Today, 10:15 AM", status: "SUCCESS" },
  { id: "TXN-8819", name: "Rohan Patel", roll: "CS2103", mode: "Counter Cheque (#40192)", amount: 15000, date: "Yesterday, 04:30 PM", status: "PENDING" },
  { id: "TXN-8818", name: "Priya Singh", roll: "CS2104", mode: "Debit Card", amount: 30000, date: "Yesterday, 02:10 PM", status: "SUCCESS" },
  { id: "TXN-8817", name: "Devansh Gupta", roll: "CS2107", mode: "UPI Gateway Timeout", amount: 20000, date: "05 Oct, 06:12 PM", status: "FAILED" },
  { id: "TXN-8816", name: "Sneha Reddy", roll: "CS2108", mode: "NEFT / RTGS", amount: 45000, date: "05 Oct, 01:25 PM", status: "SUCCESS" },
];

export default function PaymentsScreen() {
  const { width } = useWindowDimensions();
  const [filterStatus, setFilterStatus] = useState<"ALL" | "SUCCESS" | "PENDING" | "FAILED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = TRANSACTIONS.filter((t) => {
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.roll.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
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
            <Text style={styles.pageTitle}>Payments & Transactions</Text>
            <Text style={styles.pageSubtitle}>Gateway settlements, counter deposits, and audit trail</Text>
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
        {/* 4 Stat Cards from Screenshot 2 */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: "#2563EB" }]}
            onPress={() => setFilterStatus("ALL")}
          >
            <Text style={styles.statLabel}>Today's Collection</Text>
            <Text style={[styles.statNum, { color: "#2563EB" }]}>₹1,24,500</Text>
            <Text style={styles.statSub}>6 Transactions Verified</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: "#10B981" }]}
            onPress={() => router.push("/fee-manager/successful-payments")}
          >
            <Text style={styles.statLabel}>Successful</Text>
            <Text style={[styles.statNum, { color: "#10B981" }]}>142</Text>
            <Text style={styles.statSub}>₹14,80,000 Settled</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: "#F59E0B" }]}
            onPress={() => router.push("/fee-manager/pending-payments")}
          >
            <Text style={styles.statLabel}>Pending Verification</Text>
            <Text style={[styles.statNum, { color: "#F59E0B" }]}>32</Text>
            <Text style={styles.statSub}>Cheque & NEFT holds</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: "#EF4444" }]}
            onPress={() => router.push("/fee-manager/failed-payments")}
          >
            <Text style={styles.statLabel}>Failed / Declined</Text>
            <Text style={[styles.statNum, { color: "#EF4444" }]}>12</Text>
            <Text style={styles.statSub}>Gateway timeouts</Text>
          </TouchableOpacity>
        </View>

        {/* Filter & Search */}
        <View style={styles.filterRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by student, roll, or transaction ID..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.tabsRow}>
            {(["ALL", "SUCCESS", "PENDING", "FAILED"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, filterStatus === tab && styles.tabBtnActive]}
                onPress={() => setFilterStatus(tab)}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    filterStatus === tab && styles.tabBtnTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transactions Table */}
        <View style={styles.card}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: 100 }]}>Txn ID</Text>
            <Text style={[styles.th, { flex: 1 }]}>Student & Date</Text>
            <Text style={[styles.th, { width: 140 }]}>Mode</Text>
            <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Amount</Text>
            <Text style={[styles.th, { width: 90, textAlign: "center" }]}>Status</Text>
            <Text style={[styles.th, { width: 80, textAlign: "center" }]}>Details</Text>
          </View>

          {filtered.map((t, idx) => (
            <View
              key={t.id}
              style={[
                styles.trow,
                idx % 2 === 0 ? styles.trowEven : styles.trowOdd,
              ]}
            >
              <Text style={[styles.tdTxn, { width: 100 }]}>{t.id}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tdName}>{t.name}</Text>
                <Text style={styles.tdSub}>{t.roll} • {t.date}</Text>
              </View>
              <Text style={[styles.tdMode, { width: 140 }]}>{t.mode}</Text>
              <Text style={[styles.tdAmt, { width: 100, textAlign: "right" }]}>
                ₹{t.amount.toLocaleString()}
              </Text>
              <View style={{ width: 90, alignItems: "center" }}>
                <View
                  style={[
                    styles.statusBadge,
                    t.status === "SUCCESS"
                      ? styles.badgeSuccess
                      : t.status === "PENDING"
                      ? styles.badgePending
                      : styles.badgeFailed,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      t.status === "SUCCESS"
                        ? styles.badgeTextSuccess
                        : t.status === "PENDING"
                        ? styles.badgeTextPending
                        : styles.badgeTextFailed,
                    ]}
                  >
                    {t.status}
                  </Text>
                </View>
              </View>
              <View style={{ width: 80, alignItems: "center" }}>
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => router.push("/fee-manager/payment-details")}
                >
                  <Text style={styles.detailBtnText}>View</Text>
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
    marginVertical: 4,
  },
  statSub: {
    fontSize: 11,
    color: "#64748B",
  },
  filterRow: {
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
    paddingHorizontal: 12,
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
  tdTxn: {
    fontSize: 12,
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
  tdMode: {
    fontSize: 12,
    color: "#475569",
  },
  tdAmt: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeSuccess: {
    backgroundColor: "#ECFDF5",
  },
  badgePending: {
    backgroundColor: "#FEF3C7",
  },
  badgeFailed: {
    backgroundColor: "#FEF2F2",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  badgeTextSuccess: {
    color: "#059669",
  },
  badgeTextPending: {
    color: "#D97706",
  },
  badgeTextFailed: {
    color: "#DC2626",
  },
  detailBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  detailBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
});

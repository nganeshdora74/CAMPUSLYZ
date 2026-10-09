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

interface ReceiptRecord {
  rcpNo: string;
  name: string;
  roll: string;
  amount: number;
  date: string;
  mode: string;
}

const RECENT_RECEIPTS: ReceiptRecord[] = [
  { rcpNo: "RCP-2026-915", name: "Rahul Kumar", roll: "CS2101", amount: 40000, date: "Today, 11:42 AM", mode: "UPI" },
  { rcpNo: "RCP-2026-914", name: "Ananya Verma", roll: "CS2102", amount: 40000, date: "Today, 10:15 AM", mode: "Net Banking" },
  { rcpNo: "RCP-2026-913", name: "Priya Singh", roll: "CS2104", amount: 30000, date: "Yesterday, 02:10 PM", mode: "Card" },
  { rcpNo: "RCP-2026-912", name: "Sneha Reddy", roll: "CS2108", amount: 45000, date: "05 Oct 2026", mode: "NEFT" },
];

export default function FeeReceiptsScreen() {
  const { width } = useWindowDimensions();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const modules = [
    {
      title: "Generate Official Receipt",
      desc: "Issue electronic receipt with stamp & ledger allocation",
      icon: "receipt-outline",
      color: "#2563EB",
      route: "/fee-manager/generate-receipt",
    },
    {
      title: "View All Receipts",
      desc: "Browse 142 completed transaction vouchers and logs",
      icon: "documents-outline",
      color: "#10B981",
      route: "/fee-manager/view-receipts",
    },
    {
      title: "Search & Verify Receipt",
      desc: "Verify by receipt number, student roll or UTR ID",
      icon: "search-outline",
      color: "#F59E0B",
      route: "/fee-manager/search-receipt",
    },
    {
      title: "Download Bulk Receipts",
      desc: "Export monthly or semester receipt bundles as ZIP/PDF",
      icon: "download-outline",
      color: "#8B5CF6",
      route: "/fee-manager/download-receipt",
    },
  ];

  const handleDownloadSingle = (rcpNo: string) => {
    setToastMessage(`Downloading official voucher for ${rcpNo}...`);
    setTimeout(() => setToastMessage(null), 4000);
  };

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
            <Text style={styles.pageTitle}>Receipts & Invoicing Hub</Text>
            <Text style={styles.pageSubtitle}>Official fee vouchers, electronic seals & receipt archive</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.genBtn}
            onPress={() => router.push("/fee-manager/generate-receipt")}
          >
            <Ionicons name="add-circle" size={16} color="#FFFFFF" />
            <Text style={styles.genBtnText}>+ Generate Receipt</Text>
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
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* 3 Metric Cards */}
        <View style={styles.statGrid}>
          <View style={[styles.statBox, { borderLeftColor: "#2563EB" }]}>
            <Text style={styles.statNum}>142</Text>
            <Text style={styles.statLabel}>Total Receipts Issued</Text>
            <Text style={styles.statSub}>Fall Semester 2026</Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: "#10B981" }]}>
            <Text style={[styles.statNum, { color: "#10B981" }]}>₹14,80,000</Text>
            <Text style={styles.statLabel}>Total Amount Vouched</Text>
            <Text style={styles.statSub}>Reconciled with bank</Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: "#8B5CF6" }]}>
            <Text style={[styles.statNum, { color: "#8B5CF6" }]}>8 Today</Text>
            <Text style={styles.statLabel}>Today's Generation</Text>
            <Text style={styles.statSub}>Latest: RCP-2026-915</Text>
          </View>
        </View>

        {/* 4 Action Modules */}
        <View style={styles.moduleGrid}>
          {modules.map((m) => (
            <TouchableOpacity
              key={m.title}
              style={styles.moduleCard}
              onPress={() => router.push(m.route as any)}
            >
              <View style={[styles.moduleIconWrap, { backgroundColor: m.color + "15" }]}>
                <Ionicons name={m.icon as any} size={24} color={m.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moduleTitle}>{m.title}</Text>
                <Text style={styles.moduleDesc}>{m.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Issued Table */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Recently Issued Receipts</Text>
          <Text style={styles.cardHeaderSub}>Direct download and verification</Text>

          <View style={styles.tableWrap}>
            <View style={styles.thead}>
              <Text style={[styles.th, { width: 120 }]}>Receipt ID</Text>
              <Text style={[styles.th, { flex: 1 }]}>Student</Text>
              <Text style={[styles.th, { width: 100 }]}>Payment Mode</Text>
              <Text style={[styles.th, { width: 100, textAlign: "right" }]}>Amount</Text>
              <Text style={[styles.th, { width: 90, textAlign: "center" }]}>Action</Text>
            </View>

            {RECENT_RECEIPTS.map((r, idx) => (
              <View
                key={r.rcpNo}
                style={[
                  styles.trow,
                  idx % 2 === 0 ? styles.trowEven : styles.trowOdd,
                ]}
              >
                <Text style={[styles.tdRcp, { width: 120 }]}>{r.rcpNo}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tdName}>{r.name}</Text>
                  <Text style={styles.tdSub}>{r.roll} • {r.date}</Text>
                </View>
                <Text style={[styles.tdMode, { width: 100 }]}>{r.mode}</Text>
                <Text style={[styles.tdAmt, { width: 100, textAlign: "right" }]}>
                  ₹{r.amount.toLocaleString()}
                </Text>
                <View style={{ width: 90, alignItems: "center" }}>
                  <TouchableOpacity
                    style={styles.downBtn}
                    onPress={() => handleDownloadSingle(r.rcpNo)}
                  >
                    <Ionicons name="download-outline" size={14} color="#2563EB" />
                    <Text style={styles.downBtnText}>PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
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
  genBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0A1E3F",
  },
  genBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 20,
    maxWidth: 1050,
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
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginTop: 2,
  },
  statSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  moduleCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  moduleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  moduleDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
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
    marginBottom: 14,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    overflow: "hidden",
  },
  thead: {
    flexDirection: "row",
    alignItems: "center",
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
  tdRcp: {
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
    color: "#10B981",
  },
  downBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  downBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
});

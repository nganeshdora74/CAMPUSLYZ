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

export default function FeeReportsScreen() {
  const { width } = useWindowDimensions();
  const [exportToast, setExportToast] = useState<string | null>(null);

  const reportsList = [
    {
      title: "Daily Collection Report",
      desc: "Day-to-day cash, UPI and net banking settlement breakdown",
      icon: "today-outline",
      color: "#2563EB",
      route: "/fee-manager/daily-collection",
      stat: "Today: ₹1,24,500",
    },
    {
      title: "Monthly Collection Report",
      desc: "Monthly financial trajectory and realization analytics",
      icon: "calendar-outline",
      color: "#10B981",
      route: "/fee-manager/monthly-collection",
      stat: "Oct: ₹2.7L (Target ₹3.5L)",
    },
    {
      title: "Defaulter Audit Report",
      desc: "Accounts overdue >30 days with accumulated penalty fines",
      icon: "alert-circle-outline",
      color: "#DC2626",
      route: "/fee-manager/defaulter-report",
      stat: "16 Students (₹1,00,000)",
    },
    {
      title: "Pending Fees Ledger",
      desc: "Unsettled balances categorized by department & semester",
      icon: "time-outline",
      color: "#D97706",
      route: "/fee-manager/pending-fees-report",
      stat: "42 Students (₹2,70,000)",
    },
    {
      title: "Semester Performance Report",
      desc: "Comprehensive 2026-27 annual budget vs collected analysis",
      icon: "school-outline",
      color: "#8B5CF6",
      route: "/fee-manager/semester-report",
      stat: "80% Realized (₹14.8L)",
    },
    {
      title: "Payment Mode Breakdown",
      desc: "Channel analytics: UPI (62%), Net Banking (24%), Cash/Cheque (14%)",
      icon: "pie-chart-outline",
      color: "#EC4899",
      route: "/fee-manager/payment-report",
      stat: "UPI Most Preferred",
    },
  ];

  const handleExportAll = () => {
    setExportToast("Consolidated Financial Report generated & exported as Excel/PDF.");
    setTimeout(() => setExportToast(null), 4000);
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
            <Text style={styles.pageTitle}>Reports & Financial Audits</Text>
            <Text style={styles.pageSubtitle}>Campusly institutional financial statements & ledger logs</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.exportAllBtn} onPress={handleExportAll}>
            <Ionicons name="download-outline" size={16} color="#FFFFFF" />
            <Text style={styles.exportAllBtnText}>Export All (PDF)</Text>
          </TouchableOpacity>
          <NotificationBellModal />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {exportToast && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={22} color="#059669" />
            <Text style={styles.toastText}>{exportToast}</Text>
          </View>
        )}

        {/* 6 Report Cards Grid */}
        <View style={styles.reportsGrid}>
          {reportsList.map((r) => (
            <TouchableOpacity
              key={r.title}
              style={styles.reportCard}
              onPress={() => router.push(r.route as any)}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconWrap, { backgroundColor: r.color + "15" }]}>
                  <Ionicons name={r.icon as any} size={24} color={r.color} />
                </View>
                <View style={styles.statTag}>
                  <Text style={[styles.statTagText, { color: r.color }]}>{r.stat}</Text>
                </View>
              </View>

              <Text style={styles.reportTitle}>{r.title}</Text>
              <Text style={styles.reportDesc}>{r.desc}</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.viewLink}>View Detailed Report</Text>
                <Ionicons name="arrow-forward" size={16} color="#2563EB" />
              </View>
            </TouchableOpacity>
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
  exportAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0A1E3F",
  },
  exportAllBtnText: {
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
  reportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  reportCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "space-between",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statTag: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  reportDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  viewLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
});

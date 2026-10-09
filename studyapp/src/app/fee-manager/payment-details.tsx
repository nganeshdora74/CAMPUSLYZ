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

export default function PaymentDetailsScreen() {
  const { width } = useWindowDimensions();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handlePrint = () => {
    setToastMessage("Payment voucher sent to printer / PDF export.");
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/fee-manager/payments")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Transaction Voucher</Text>
            <Text style={styles.pageSubtitle}>TXN-8821 • Verified Payment Receipt</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
            <Ionicons name="print-outline" size={16} color="#FFFFFF" />
            <Text style={styles.printBtnText}>Print Voucher</Text>
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

        <View style={styles.voucherCard}>
          {/* Header */}
          <View style={styles.voucherTop}>
            <View>
              <Text style={styles.instName}>CAMPUSLY INSTITUTE OF TECHNOLOGY</Text>
              <Text style={styles.instSub}>Office of Accounts & Finance • Official Fee Voucher</Text>
            </View>
            <View style={styles.statusSuccessPill}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.statusSuccessText}>PAYMENT VERIFIED</Text>
            </View>
          </View>

          {/* Amount Hero */}
          <View style={styles.amountHero}>
            <Text style={styles.amountLabel}>AMOUNT PAID</Text>
            <Text style={styles.amountVal}>₹25,000.00</Text>
            <Text style={styles.amountWords}>Rupees Twenty Five Thousand Only</Text>
          </View>

          {/* Meta Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaTitle}>Transaction ID</Text>
              <Text style={styles.metaVal}>TXN-8821</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaTitle}>Receipt Number</Text>
              <Text style={styles.metaVal}>RCP-2026-904</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaTitle}>Date & Time</Text>
              <Text style={styles.metaVal}>07 Oct 2026, 11:42 AM</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaTitle}>Payment Mode</Text>
              <Text style={styles.metaVal}>UPI (Google Pay)</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaTitle}>Gateway Ref / UTR</Text>
              <Text style={styles.metaVal}>UPI/328901429810</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaTitle}>Settlement Bank</Text>
              <Text style={styles.metaVal}>Axis Institutional Acct ***4912</Text>
            </View>
          </View>

          {/* Student Info Box */}
          <View style={styles.studentBox}>
            <Text style={styles.boxTitle}>Student & Payer Information</Text>
            <View style={styles.stRow}>
              <Text style={styles.stKey}>Student Name:</Text>
              <Text style={styles.stVal}>Rahul Kumar (CS2101)</Text>
            </View>
            <View style={styles.stRow}>
              <Text style={styles.stKey}>Academic Program:</Text>
              <Text style={styles.stVal}>B.Tech Computer Science & Engineering (3rd Sem)</Text>
            </View>
            <View style={styles.stRow}>
              <Text style={styles.stKey}>Parent / Payer:</Text>
              <Text style={styles.stVal}>Suresh Kumar (+91 98111 22334)</Text>
            </View>
          </View>

          {/* Ledger Allocation */}
          <View style={styles.allocationBox}>
            <Text style={styles.boxTitle}>Ledger Fee Allocation</Text>
            <View style={styles.allocRow}>
              <Text style={styles.allocHead}>Tuition Fee (Semester 3)</Text>
              <Text style={styles.allocAmt}>₹15,000.00</Text>
            </View>
            <View style={styles.allocRow}>
              <Text style={styles.allocHead}>Hostel Room Rent (Advance Part 1)</Text>
              <Text style={styles.allocAmt}>₹10,000.00</Text>
            </View>
            <View style={[styles.allocRow, styles.allocTotalRow]}>
              <Text style={styles.allocTotalHead}>Total Settled</Text>
              <Text style={styles.allocTotalAmt}>₹25,000.00</Text>
            </View>
          </View>

          {/* Signatory Footer */}
          <View style={styles.voucherFooter}>
            <View>
              <Text style={styles.systemGenText}>Electronically generated voucher • Campusly ERP</Text>
              <Text style={styles.systemGenSub}>No physical signature required for institutional verification.</Text>
            </View>
            <View style={styles.signBox}>
              <Text style={styles.signOfficer}>Ritesh Sahu</Text>
              <Text style={styles.signRole}>Accounts Officer (Fees)</Text>
            </View>
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
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0A1E3F",
  },
  printBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 20,
    maxWidth: 800,
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
  voucherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 18,
  },
  voucherTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 14,
    gap: 12,
  },
  instName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  instSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  statusSuccessPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusSuccessText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
  },
  amountHero: {
    backgroundColor: "#F8FAFC",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  amountLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 1,
  },
  amountVal: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
    marginVertical: 4,
  },
  amountWords: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaCell: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 6,
  },
  metaTitle: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  metaVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  studentBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    gap: 8,
  },
  boxTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  stRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stKey: {
    fontSize: 12,
    color: "#64748B",
  },
  stVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  allocationBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  allocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  allocHead: {
    fontSize: 13,
    color: "#334155",
  },
  allocAmt: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  allocTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    marginTop: 4,
  },
  allocTotalHead: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  allocTotalAmt: {
    fontSize: 16,
    fontWeight: "800",
    color: "#10B981",
  },
  voucherFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
    gap: 16,
  },
  systemGenText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  systemGenSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  signBox: {
    alignItems: "flex-end",
  },
  signOfficer: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  signRole: {
    fontSize: 11,
    color: "#64748B",
  },
});

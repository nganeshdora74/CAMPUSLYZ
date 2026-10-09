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
import notificationService from "../../services/notificationService";

interface FeeHeadChoice {
  id: string;
  name: string;
  amount: number;
  selected: boolean;
}

const INITIAL_HEADS: FeeHeadChoice[] = [
  { id: "h1", name: "Tuition Fee (Fall 2026)", amount: 40000, selected: true },
  { id: "h2", name: "Hostel Room Rent (Standard Double)", amount: 30000, selected: true },
  { id: "h3", name: "Mess Advance", amount: 25000, selected: true },
  { id: "h4", name: "Semester Examination Fee", amount: 3000, selected: true },
  { id: "h5", name: "Library & Computing Lab Fee", amount: 2000, selected: true },
  { id: "h6", name: "Student Welfare & Insurance", amount: 1000, selected: true },
];

export default function AssignFeesScreen() {
  const { width } = useWindowDimensions();

  const [selectedBatch, setSelectedBatch] = useState("B.Tech CSE - 3rd Sem");
  const [studentCount, setStudentCount] = useState(48);
  const [feeHeads, setFeeHeads] = useState<FeeHeadChoice[]>(INITIAL_HEADS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleHead = (id: string) => {
    setFeeHeads((prev) =>
      prev.map((h) => (h.id === id ? { ...h, selected: !h.selected } : h))
    );
  };

  const totalPerStudent = feeHeads
    .filter((h) => h.selected)
    .reduce((acc, h) => acc + h.amount, 0);

  const grandTotal = totalPerStudent * studentCount;

  const handleAssign = async () => {
    await notificationService.sendNotification({
      title: `Fees Assigned: ${selectedBatch}`,
      body: `Semester fees of ₹${totalPerStudent.toLocaleString()} assigned to all ${studentCount} students in ${selectedBatch}. Due date: 15 Oct 2026.`,
      role: "fee_manager",
      targetRoles: ["student"],
      category: "fee_reminder",
      metadata: {
        batch: selectedBatch,
        studentCount,
        feeAmount: totalPerStudent,
      },
    });

    setToastMessage(`Notification Sent Successfully! Outgoing notifications dispatched to ${studentCount} students.`);
    setTimeout(() => setToastMessage(null), 5000);
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
            <Text style={styles.pageTitle}>Assign Fees to Batch</Text>
            <Text style={styles.pageSubtitle}>Bulk allocate semester ledger dues to student cohorts</Text>
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

        {/* Batch Selection Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Target Student Batch</Text>

          <View style={styles.batchSelectorRow}>
            {["B.Tech CSE - 3rd Sem", "B.Tech IT - 3rd Sem", "B.Tech ECE - 3rd Sem"].map((b) => (
              <TouchableOpacity
                key={b}
                style={[
                  styles.batchBtn,
                  selectedBatch === b && styles.batchBtnActive,
                ]}
                onPress={() => {
                  setSelectedBatch(b);
                  setStudentCount(b.includes("IT") ? 42 : b.includes("ECE") ? 46 : 48);
                }}
              >
                <Text
                  style={[
                    styles.batchBtnText,
                    selectedBatch === b && styles.batchBtnTextActive,
                  ]}
                >
                  {b}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cohortSummary}>
            <Ionicons name="people" size={20} color="#2563EB" />
            <Text style={styles.cohortText}>
              Enrolled strength: <Text style={{ fontWeight: "800" }}>{studentCount} Students</Text>
            </Text>
          </View>
        </View>

        {/* Select Fee Heads */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Select Fee Heads to Apply</Text>

          <View style={styles.headsList}>
            {feeHeads.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={[styles.headRow, h.selected && styles.headRowSelected]}
                onPress={() => toggleHead(h.id)}
              >
                <Ionicons
                  name={h.selected ? "checkbox" : "square-outline"}
                  size={22}
                  color={h.selected ? "#2563EB" : "#94A3B8"}
                />
                <Text style={styles.headName}>{h.name}</Text>
                <Text style={styles.headAmount}>₹{h.amount.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Financial Summary & Assign Button */}
        <View style={styles.summaryCard}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Total Fee Per Student</Text>
            <Text style={styles.sumVal}>₹{totalPerStudent.toLocaleString()}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Target Cohort</Text>
            <Text style={styles.sumVal}>{studentCount} Students</Text>
          </View>
          <View style={[styles.sumRow, styles.sumGrandRow]}>
            <Text style={styles.grandLabel}>Total Receivable Volume</Text>
            <Text style={styles.grandVal}>₹{grandTotal.toLocaleString()}</Text>
          </View>

          <TouchableOpacity style={styles.assignBtn} onPress={handleAssign}>
            <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
            <Text style={styles.assignBtnText}>Assign Fees & Broadcast Notifications</Text>
          </TouchableOpacity>
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
    maxWidth: 900,
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },
  batchSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  batchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  batchBtnActive: {
    backgroundColor: "#0A1E3F",
    borderColor: "#0A1E3F",
  },
  batchBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  batchBtnTextActive: {
    color: "#FFFFFF",
  },
  cohortSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    marginTop: 14,
  },
  cohortText: {
    fontSize: 13,
    color: "#1E40AF",
  },
  headsList: {
    gap: 10,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headRowSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  headName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  headAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sumLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  sumVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  sumGrandRow: {
    borderBottomWidth: 0,
    paddingTop: 14,
    alignItems: "center",
  },
  grandLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  grandVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#10B981",
  },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0A1E3F",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 18,
  },
  assignBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

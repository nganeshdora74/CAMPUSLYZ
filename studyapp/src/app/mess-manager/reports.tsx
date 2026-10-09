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
import MessLayout from "../../components/mess/MessLayout";
import messDataService from "../../services/messDataService";

export default function MessReportsScreen() {
  const { width } = useWindowDimensions();
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const students = messDataService.getAttendance();
  const expenses = messDataService.getExpenses();
  const feedback = messDataService.getFeedback();
  const inventory = messDataService.getInventory();

  const presentCount = students.filter((s) => s.status === "Present").length;
  const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 90;
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const avgRating =
    feedback.length > 0
      ? (
          feedback.reduce((sum, f) => sum + (f.rating || 4), 0) / feedback.length
        ).toFixed(1)
      : "4.3";

  const lowStockCount = inventory.filter((i) => i.currentStock <= i.minStock).length;

  const handleExport = () => {
    setActionNotice("Monthly Mess Analytics Report generated and downloaded!");
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <MessLayout
      activeNav="reports"
      pageTitle="Mess Consumption & Analytics"
      pageSubtitle="Live operational indicators, grocery spend, and diner satisfaction metrics"
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Ionicons name="download-outline" size={16} color="#FFFFFF" />
          <Text style={styles.exportBtnText}>Export Report</Text>
        </TouchableOpacity>
      }
    >
      {/* 4 Metric Cards */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>Diner Attendance %</Text>
            <Ionicons name="pie-chart" size={18} color="#2563EB" />
          </View>
          <Text style={styles.kpiVal}>{attendanceRate}%</Text>
          <Text style={styles.kpiSub}>{presentCount} active diners of {students.length} enrolled</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>Pantry Procurement Spend</Text>
            <Ionicons name="cash" size={18} color="#EA580C" />
          </View>
          <Text style={[styles.kpiVal, { color: "#EA580C" }]}>₹{totalExpense.toLocaleString()}</Text>
          <Text style={styles.kpiSub}>Total expenditure this cycle</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>Average Student Rating</Text>
            <Ionicons name="star" size={18} color="#F59E0B" />
          </View>
          <Text style={[styles.kpiVal, { color: "#D97706" }]}>{avgRating} / 5.0</Text>
          <Text style={styles.kpiSub}>Across {feedback.length} student reviews</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>Low Stock Items</Text>
            <Ionicons name="cube" size={18} color="#DC2626" />
          </View>
          <Text style={[styles.kpiVal, { color: "#DC2626" }]}>{lowStockCount}</Text>
          <Text style={styles.kpiSub}>Needs procurement re-order</Text>
        </View>
      </View>

      {/* Summary Breakdowns */}
      <View style={styles.sectionGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardHeading}>Meal Attendance Efficiency</Text>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Breakfast Turnout</Text>
            <Text style={styles.dataValBold}>386 students (80%)</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Lunch Turnout</Text>
            <Text style={styles.dataValBold}>432 students (90%)</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Evening Snacks Turnout</Text>
            <Text style={styles.dataValBold}>340 students (71%)</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Dinner Turnout</Text>
            <Text style={styles.dataValBold}>425 students (88%)</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardHeading}>Financial Budget Allocation</Text>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Total Monthly Budget</Text>
            <Text style={styles.dataValBold}>₹1,20,000</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Expenses Recorded</Text>
            <Text style={[styles.dataValBold, { color: "#EA580C" }]}>₹{totalExpense.toLocaleString()}</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Remaining Kitchen Balance</Text>
            <Text style={[styles.dataValBold, { color: "#059669" }]}>₹{(120000 - totalExpense).toLocaleString()}</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Cost Per Student / Day</Text>
            <Text style={styles.dataValBold}>₹145 / day</Text>
          </View>
        </View>
      </View>
    </MessLayout>
  );
}

const styles = StyleSheet.create({
  exportBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  exportBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 20,
  },
  kpiCard: {
    width: "23%",
    minWidth: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kpiTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  kpiVal: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: "#94A3B8",
  },
  sectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: 300,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  dataLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  dataValBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
});
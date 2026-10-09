import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MessLayout from "../../components/mess/MessLayout";
import messDataService, {
  MessExpenseItem,
} from "../../services/messDataService";

export default function MessExpensesScreen() {
  const { width } = useWindowDimensions();
  const [expenses, setExpenses] = useState<MessExpenseItem[]>(
    messDataService.getExpenses()
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Add Expense Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<MessExpenseItem["category"]>("Vegetables");
  const [mode, setMode] = useState<MessExpenseItem["mode"]>("UPI");
  const [desc, setDesc] = useState("");

  const refreshExpenses = () => {
    setExpenses(messDataService.getExpenses());
  };

  const filtered = expenses.filter((e) => {
    return categoryFilter === "All" || e.category === categoryFilter;
  });

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const vegSpent = expenses.filter((e) => e.category === "Vegetables").reduce((sum, e) => sum + e.amount, 0);
  const grainSpent = expenses.filter((e) => e.category === "Grains").reduce((sum, e) => sum + e.amount, 0);
  const milkSpent = expenses.filter((e) => e.category === "Milk").reduce((sum, e) => sum + e.amount, 0);
  const lpgSpent = expenses.filter((e) => e.category === "LPG").reduce((sum, e) => sum + e.amount, 0);

  const handleAddExpense = () => {
    const val = Number(amount);
    if (!amount.trim() || isNaN(val) || val <= 0) {
      Alert.alert("Required", "Please enter a valid expense amount");
      return;
    }

    messDataService.addExpense({
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      category: category,
      amount: val,
      mode: mode,
      description: desc.trim() || `${category} purchase`,
    });

    setAmount("");
    setDesc("");
    setModalVisible(false);
    refreshExpenses();
    setActionNotice(`Expense of ₹${val.toLocaleString()} recorded!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <MessLayout
      activeNav="expenses"
      pageTitle="Mess Expenses & Budget"
      pageSubtitle={`Total ₹${totalSpent.toLocaleString()} spent this month across pantry procurements`}
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>+ Add Expense</Text>
        </TouchableOpacity>
      }
    >
      {/* 4 Financial Stat Cards */}
      <View style={styles.statGrid}>
        <View style={[styles.statCard, { borderLeftColor: "#EA580C" }]}>
          <Text style={styles.statLabel}>Total Spend This Month</Text>
          <Text style={[styles.statNum, { color: "#EA580C" }]}>₹{totalSpent.toLocaleString()}</Text>
          <Text style={styles.statSub}>Overall procurement budget</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
          <Text style={styles.statLabel}>Vegetables & Greens</Text>
          <Text style={[styles.statNum, { color: "#059669" }]}>₹{vegSpent.toLocaleString()}</Text>
          <Text style={styles.statSub}>Weekly mandi purchases</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#2563EB" }]}>
          <Text style={styles.statLabel}>Grains & Rice/Flour</Text>
          <Text style={[styles.statNum, { color: "#2563EB" }]}>₹{grainSpent.toLocaleString()}</Text>
          <Text style={styles.statSub}>Bulk staple inventory</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#7C3AED" }]}>
          <Text style={styles.statLabel}>Milk & LPG Fuel</Text>
          <Text style={[styles.statNum, { color: "#7C3AED" }]}>₹{(milkSpent + lpgSpent).toLocaleString()}</Text>
          <Text style={styles.statSub}>Daily dairy + commercial gas</Text>
        </View>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.pillRow}>
        {(["All", "Vegetables", "Grains", "Milk", "LPG", "Groceries"] as const).map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.pill, categoryFilter === c && styles.pillActive]}
            onPress={() => setCategoryFilter(c)}
          >
            <Text style={[styles.pillText, categoryFilter === c && styles.pillTextActive]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Expense Ledger Table */}
      <View style={styles.tableCard}>
        <View style={styles.tableHead}>
          <Text style={[styles.th, { width: 100 }]}>Date</Text>
          <Text style={[styles.th, { width: 130 }]}>Category</Text>
          <Text style={[styles.th, { flex: 1 }]}>Description</Text>
          <Text style={[styles.th, { width: 120 }]}>Payment Mode</Text>
          <Text style={[styles.th, { width: 120, textAlign: "right" }]}>Amount (₹)</Text>
        </View>

        {filtered.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={[styles.tdBold, { width: 100 }]}>{item.date}</Text>
            <View style={{ width: 130 }}>
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{item.category}</Text>
              </View>
            </View>
            <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>
              {item.description || `${item.category} supply`}
            </Text>
            <Text style={[styles.td, { width: 120 }]}>{item.mode}</Text>
            <Text style={[styles.amountBold, { width: 120 }]}>
              ₹{item.amount.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      {/* Add Expense Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record New Mess Expense</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Amount (₹) *</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 4500"
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.catGrid}>
              {(["Vegetables", "Grains", "Milk", "LPG", "Groceries", "Equipment", "Staff"] as const).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catOption, category === c && styles.catOptionActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.catOptionText, category === c && styles.catOptionTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Payment Mode</Text>
            <View style={styles.modeRow}>
              {(["UPI", "Cash", "Card", "Net Banking"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeChip, mode === m && styles.modeChipActive]}
                  onPress={() => setMode(m)}
                >
                  <Text style={[styles.modeChipText, mode === m && styles.modeChipTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Description / Vendor Note</Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="e.g. Weekly sabzi market bill / 2 LPG cylinders refill"
              style={styles.input}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddExpense}
              >
                <Text style={styles.saveBtnText}>Record Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </MessLayout>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  statGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 4,
  },
  statSub: {
    fontSize: 11,
    color: "#94A3B8",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  pill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  th: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tdBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  td: {
    fontSize: 12,
    color: "#475569",
  },
  amountBold: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "right",
  },
  catBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  catBadgeText: {
    color: "#EA580C",
    fontSize: 11,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  catOption: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  catOptionActive: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  catOptionText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  catOptionTextActive: {
    color: "#EA580C",
    fontWeight: "700",
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  modeChipActive: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  modeChipText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  modeChipTextActive: {
    color: "#EA580C",
    fontWeight: "700",
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
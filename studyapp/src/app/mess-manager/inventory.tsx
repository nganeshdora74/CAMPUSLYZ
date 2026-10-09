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
import { router } from "expo-router";
import MessLayout from "../../components/mess/MessLayout";
import messDataService, { InventoryItem } from "../../services/messDataService";

export default function MessInventoryScreen() {
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<InventoryItem[]>(
    messDataService.getInventory()
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Add Item Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newCategory, setNewCategory] = useState<InventoryItem["category"]>("Grains");
  const [newStock, setNewStock] = useState("50");
  const [newUnit, setNewUnit] = useState<InventoryItem["unit"]>("kg");
  const [newMin, setNewMin] = useState("20");

  const refreshInventory = () => {
    setItems(messDataService.getInventory());
  };

  const filtered = items.filter((item) => {
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    const matchesSearch =
      item.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAdjustStock = (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.currentStock + delta);
    messDataService.adjustStock(item.id, delta);
    refreshInventory();
    setActionNotice(`${item.item} stock updated to ${newQty} ${item.unit}`);
    setTimeout(() => setActionNotice(null), 2500);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) {
      Alert.alert("Required", "Please provide item name");
      return;
    }

    const qty = Number(newStock) || 10;
    const minThreshold = Number(newMin) || 15;

    messDataService.addInventoryItem({
      item: newItemName.trim(),
      category: newCategory,
      currentStock: qty,
      unit: newUnit,
      minStock: minThreshold,
      status: qty <= minThreshold ? "Low Stock" : "Good",
    });

    setNewItemName("");
    setModalVisible(false);
    refreshInventory();
    setActionNotice(`${newItemName} added to kitchen inventory!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const lowStockCount = items.filter((i) => i.currentStock <= i.minStock).length;
  const goodStockCount = items.length - lowStockCount;

  return (
    <MessLayout
      activeNav="inventory"
      pageTitle="Inventory & Kitchen Supplies"
      pageSubtitle={`${items.length} Tracked commodities • ${lowStockCount} Low stock alerts`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search grocery, grain, dairy items..."
      rightAction={
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>+ Add Stock Item</Text>
        </TouchableOpacity>
      }
    >
      {/* 3 Metric Cards */}
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Commodities</Text>
          <Text style={styles.statNum}>{items.length}</Text>
          <Text style={styles.statSub}>Grains, vegetables, spices, dairy</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#EF4444" }]}>
          <Text style={styles.statLabel}>Low Stock Alerts</Text>
          <Text style={[styles.statNum, { color: "#DC2626" }]}>{lowStockCount}</Text>
          <Text style={styles.statSub}>Items below threshold level</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
          <Text style={styles.statLabel}>Healthy Stock Level</Text>
          <Text style={[styles.statNum, { color: "#059669" }]}>{goodStockCount}</Text>
          <Text style={styles.statSub}>Adequate buffer available</Text>
        </View>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.categoryPillsRow}>
        {(["All", "Grains", "Vegetables", "Pulses", "Dairy", "Spices", "Essentials"] as const).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.pill, categoryFilter === cat && styles.pillActive]}
            onPress={() => setCategoryFilter(cat)}
          >
            <Text style={[styles.pillText, categoryFilter === cat && styles.pillTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Inventory Table */}
      <View style={styles.tableCard}>
        <View style={styles.tableHead}>
          <Text style={[styles.th, { width: 160 }]}>Commodity Item</Text>
          <Text style={[styles.th, { width: 120 }]}>Category</Text>
          <Text style={[styles.th, { width: 130 }]}>Current Stock</Text>
          <Text style={[styles.th, { width: 110 }]}>Min Threshold</Text>
          <Text style={[styles.th, { width: 110 }]}>Status</Text>
          <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Quick Adjust Stock</Text>
        </View>

        {filtered.map((item) => {
          const isLow = item.currentStock <= item.minStock;
          return (
            <View key={item.id} style={styles.tableRow}>
              <View style={[styles.itemCell, { width: 160 }]}>
                <View style={[styles.itemIcon, isLow ? { backgroundColor: "#FEE2E2" } : { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons
                    name={isLow ? "warning" : "cube"}
                    size={14}
                    color={isLow ? "#DC2626" : "#059669"}
                  />
                </View>
                <Text style={styles.itemName} numberOfLines={1}>{item.item}</Text>
              </View>

              <Text style={[styles.td, { width: 120 }]}>{item.category}</Text>

              <Text style={[styles.tdBold, { width: 130 }]}>
                {item.currentStock} {item.unit}
              </Text>

              <Text style={[styles.td, { width: 110 }]}>
                {item.minStock} {item.unit}
              </Text>

              <View style={{ width: 110 }}>
                <View style={[styles.statusBadge, isLow ? styles.badgeLow : styles.badgeGood]}>
                  <Text style={[styles.statusBadgeText, isLow ? styles.textLow : styles.textGood]}>
                    {isLow ? "Low Stock" : "Good"}
                  </Text>
                </View>
              </View>

              {/* Live Increment / Decrement Stepper */}
              <View style={[styles.adjustCol, { flex: 1 }]}>
                <TouchableOpacity
                  style={styles.adjustBtnMinus}
                  onPress={() => handleAdjustStock(item, -5)}
                >
                  <Ionicons name="remove" size={14} color="#DC2626" />
                  <Text style={styles.adjustBtnTextRed}>-5</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.adjustBtnPlus}
                  onPress={() => handleAdjustStock(item, 10)}
                >
                  <Ionicons name="add" size={14} color="#059669" />
                  <Text style={styles.adjustBtnTextGreen}>+10</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Add Item Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Inventory Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="e.g. Basmati Rice, Paneer, Mustard Oil"
              style={styles.input}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.catGrid}>
              {(["Grains", "Vegetables", "Pulses", "Dairy", "Spices", "Essentials"] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catOption, newCategory === cat && styles.catOptionActive]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text style={[styles.catOptionText, newCategory === cat && styles.catOptionTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Current Quantity</Text>
                <TextInput
                  value={newStock}
                  onChangeText={setNewStock}
                  placeholder="50"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.unitRow}>
                  {(["kg", "L", "packets", "tins"] as const).map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitChip, newUnit === u && styles.unitChipActive]}
                      onPress={() => setNewUnit(u)}
                    >
                      <Text style={[styles.unitChipText, newUnit === u && styles.unitChipTextActive]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Minimum Alert Threshold</Text>
            <TextInput
              value={newMin}
              onChangeText={setNewMin}
              placeholder="15"
              keyboardType="numeric"
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
                onPress={handleAddItem}
              >
                <Text style={styles.saveBtnText}>Save Commodity</Text>
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
    borderLeftColor: "#2563EB",
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
  categoryPillsRow: {
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
  itemCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  td: {
    fontSize: 12,
    color: "#475569",
  },
  tdBold: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeGood: {
    backgroundColor: "#ECFDF5",
  },
  badgeLow: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textGood: {
    color: "#059669",
  },
  textLow: {
    color: "#DC2626",
  },
  adjustCol: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  adjustBtnMinus: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  adjustBtnTextRed: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  adjustBtnPlus: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  adjustBtnTextGreen: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
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
  rowTwo: {
    flexDirection: "row",
    gap: 10,
  },
  unitRow: {
    flexDirection: "row",
    gap: 4,
  },
  unitChip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unitChipActive: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  unitChipText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  unitChipTextActive: {
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
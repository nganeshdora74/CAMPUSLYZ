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
import MessLayout from "../../components/mess/MessLayout";
import messDataService, { InventoryItem } from "../../services/messDataService";

export default function AddItemsScreen() {
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<InventoryItem["category"]>("Grains");
  const [stockQty, setStockQty] = useState("");
  const [unit, setUnit] = useState<InventoryItem["unit"]>("kg");
  const [minThreshold, setMinThreshold] = useState("20");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!itemName.trim() || !stockQty.trim()) {
      Alert.alert("Required Fields", "Please enter commodity name and initial stock quantity.");
      return;
    }

    const qty = Number(stockQty) || 10;
    const minQ = Number(minThreshold) || 15;

    messDataService.addInventoryItem({
      item: itemName.trim(),
      category: category,
      currentStock: qty,
      unit: unit,
      minStock: minQ,
      status: qty <= minQ ? "Low Stock" : "Good",
    });

    setActionNotice(`${itemName} successfully added to inventory!`);
    setTimeout(() => {
      router.push("/mess-manager/inventory");
    }, 1500);
  };

  return (
    <MessLayout
      activeNav="inventory"
      pageTitle="Add Stock Item"
      pageSubtitle="Register new raw grocery commodity in pantry inventory"
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/mess-manager/inventory")}
        >
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Inventory</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.formCard}>
        <Text style={styles.label}>Commodity Name *</Text>
        <TextInput
          value={itemName}
          onChangeText={setItemName}
          placeholder="e.g. Sona Masoori Rice, Amul Butter, Sunflower Oil"
          style={styles.input}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.catGrid}>
          {(["Grains", "Vegetables", "Pulses", "Dairy", "Spices", "Essentials"] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, category === cat && styles.catChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Stock Quantity *</Text>
            <TextInput
              value={stockQty}
              onChangeText={setStockQty}
              placeholder="e.g. 100"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Measurement Unit</Text>
            <View style={styles.unitRow}>
              {(["kg", "L", "packets", "tins"] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, unit === u && styles.unitChipActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.label}>Minimum Alert Level</Text>
        <TextInput
          value={minThreshold}
          onChangeText={setMinThreshold}
          placeholder="e.g. 25"
          keyboardType="numeric"
          style={styles.input}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>Add Item to Pantry Inventory</Text>
        </TouchableOpacity>
      </View>
    </MessLayout>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxWidth: 680,
    gap: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 4,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  catChipActive: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  catChipText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  catChipTextActive: {
    color: "#EA580C",
    fontWeight: "700",
  },
  twoCol: {
    flexDirection: "row",
    gap: 12,
  },
  unitRow: {
    flexDirection: "row",
    gap: 4,
    height: 42,
    alignItems: "center",
  },
  unitChip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 8,
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
  submitBtn: {
    backgroundColor: "#EA580C",
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
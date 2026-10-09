import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import MessLayout from "../../components/mess/MessLayout";
import messDataService, { InventoryItem } from "../../services/messDataService";

export default function LowStockScreen() {
  const [items, setItems] = useState<InventoryItem[]>(
    messDataService.getInventory().filter((i) => i.currentStock <= i.minStock)
  );
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const refreshList = () => {
    setItems(messDataService.getInventory().filter((i) => i.currentStock <= i.minStock));
  };

  const handleRestock = (item: InventoryItem) => {
    messDataService.adjustStock(item.id, 50);
    refreshList();
    setActionNotice(`Restocked 50 ${item.unit} for ${item.item}!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <MessLayout
      activeNav="inventory"
      pageTitle="Low Stock Alert Desk"
      pageSubtitle={`${items.length} critical items require urgent kitchen replenishment`}
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/mess-manager/inventory")}
        >
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Full Inventory</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.grid}>
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#059669" />
            <Text style={styles.emptyTitle}>All Stocks Healthy</Text>
            <Text style={styles.emptySub}>No kitchen commodity is currently running below minimum safety threshold.</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.itemBadge}>
                  <Ionicons name="warning" size={16} color="#DC2626" />
                  <Text style={styles.itemName}>{item.item}</Text>
                </View>
                <View style={styles.urgentPill}>
                  <Text style={styles.urgentPillText}>Critical Low</Text>
                </View>
              </View>

              <View style={styles.stockLevelRow}>
                <View>
                  <Text style={styles.stockLabel}>Current Stock</Text>
                  <Text style={styles.stockNum}>{item.currentStock} {item.unit}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.stockLabel}>Minimum Required</Text>
                  <Text style={styles.stockNumReq}>{item.minStock} {item.unit}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.restockBtn}
                onPress={() => handleRestock(item)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.restockBtnText}>Quick Restock (+50 {item.unit})</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  card: {
    width: "31.5%",
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  urgentPill: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentPillText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
  },
  stockLevelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 12,
  },
  stockLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  stockNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#DC2626",
    marginTop: 2,
  },
  stockNumReq: {
    fontSize: 16,
    fontWeight: "800",
    color: "#475569",
    marginTop: 2,
  },
  restockBtn: {
    backgroundColor: "#059669",
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  restockBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    width: "100%",
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
    maxWidth: 400,
  },
});
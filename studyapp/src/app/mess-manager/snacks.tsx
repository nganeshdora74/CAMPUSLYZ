import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import MessLayout from "../../components/mess/MessLayout";
import messDataService, { MealItem } from "../../services/messDataService";

export default function SnacksScreen() {
  const [meal, setMeal] = useState<MealItem | undefined>(
    messDataService.getTodayMeals().find((m) => m.type === "Snacks")
  );
  const [editModal, setEditModal] = useState(false);
  const [itemsInput, setItemsInput] = useState(meal?.items || "");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleSave = () => {
    if (!meal || !itemsInput.trim()) return;
    messDataService.updateMeal(meal.id, { items: itemsInput.trim() });
    setMeal({ ...meal, items: itemsInput.trim() });
    setEditModal(false);
    setActionNotice("Snacks menu updated successfully!");
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleToggleServed = () => {
    if (!meal) return;
    const nextStatus = meal.status === "Served" ? "Upcoming" : "Served";
    messDataService.updateMeal(meal.id, { status: nextStatus });
    setMeal({ ...meal, status: nextStatus });
    setActionNotice(`Snacks marked as ${nextStatus}!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <MessLayout
      activeNav="menu"
      pageTitle="Evening Snacks Operations"
      pageSubtitle="Tea and refreshment distribution"
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/mess-manager/menu")}
        >
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
          <Text style={styles.backBtnText}>All Meals</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="cafe" size={24} color="#D97706" />
            <Text style={styles.title}>Today's Snacks</Text>
          </View>
          <View style={[styles.badge, meal?.status === "Served" ? styles.badgeGreen : styles.badgeAmber]}>
            <Text style={[styles.badgeText, meal?.status === "Served" ? styles.textGreen : styles.textAmber]}>
              {meal?.status || "Upcoming"}
            </Text>
          </View>
        </View>

        <Text style={styles.timing}>Service Hours: {meal?.timing || "05:00 PM – 06:00 PM"}</Text>

        <View style={styles.dishesBox}>
          <Text style={styles.dishesLabel}>Refreshment Items:</Text>
          <Text style={styles.dishesVal}>{meal?.items || "Poha + Hot Tea"}</Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>390</Text>
            <Text style={styles.statText}>Expected Diners</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: "#059669" }]}>340</Text>
            <Text style={styles.statText}>Served Diners</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: "#D97706" }]}>50</Text>
            <Text style={styles.statText}>Buffer Remaining</Text>
          </View>
        </View>

        <View style={styles.actionBtnRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditModal(true)}>
            <Ionicons name="create-outline" size={16} color="#2563EB" />
            <Text style={styles.editBtnText}>Edit Dishes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toggleBtn} onPress={handleToggleServed}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
            <Text style={styles.toggleBtnText}>
              {meal?.status === "Served" ? "Mark Upcoming" : "Mark Served"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Snacks Menu</Text>
            <TextInput
              value={itemsInput}
              onChangeText={setItemsInput}
              placeholder="e.g. Samosa + Green Chutney + Masala Chai"
              style={[styles.input, { height: 80 }]}
              multiline
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={{ color: "#64748B" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  backBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxWidth: 680,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeGreen: { backgroundColor: "#ECFDF5" },
  badgeAmber: { backgroundColor: "#FFFBEB" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  textGreen: { color: "#059669" },
  textAmber: { color: "#D97706" },
  timing: { fontSize: 12, color: "#64748B", marginBottom: 14 },
  dishesBox: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  dishesLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 4 },
  dishesVal: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  statRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  statNum: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  statText: { fontSize: 11, color: "#64748B", marginTop: 2 },
  actionBtnRow: { flexDirection: "row", gap: 10 },
  editBtn: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  editBtnText: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
  toggleBtn: {
    flex: 1,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  toggleBtnText: { fontSize: 12, fontWeight: "700", color: "#059669" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", marginBottom: 12 },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
  },
  modalBtns: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: { padding: 8 },
  saveBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
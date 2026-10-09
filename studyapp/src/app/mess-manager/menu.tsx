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
import messDataService, { MealItem } from "../../services/messDataService";

export default function MessMenuScreen() {
  const { width } = useWindowDimensions();
  const [meals, setMeals] = useState<MealItem[]>(messDataService.getTodayMeals());
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Edit Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [activeMeal, setActiveMeal] = useState<MealItem | null>(null);
  const [itemsText, setItemsText] = useState("");
  const [timingText, setTimingText] = useState("");
  const [caloriesText, setCaloriesText] = useState("");
  const [statusVal, setStatusVal] = useState<"Served" | "Ongoing" | "Upcoming">("Upcoming");

  const refreshMeals = () => {
    setMeals(messDataService.getTodayMeals());
  };

  const handleOpenEdit = (meal: MealItem) => {
    setActiveMeal(meal);
    setItemsText(meal.items);
    setTimingText(meal.timing);
    setCaloriesText(meal.calories || "500 kcal");
    setStatusVal(meal.status);
    setModalVisible(true);
  };

  const handleSaveMeal = () => {
    if (!activeMeal || !itemsText.trim()) {
      Alert.alert("Required", "Please provide meal items");
      return;
    }

    messDataService.updateMeal(activeMeal.id, {
      items: itemsText.trim(),
      timing: timingText.trim(),
      calories: caloriesText.trim(),
      status: statusVal,
    });

    setModalVisible(false);
    refreshMeals();
    setActionNotice(`${activeMeal.type} menu saved successfully!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleToggleStatus = (meal: MealItem) => {
    const nextStatus =
      meal.status === "Upcoming"
        ? "Ongoing"
        : meal.status === "Ongoing"
        ? "Served"
        : "Upcoming";
    messDataService.updateMeal(meal.id, { status: nextStatus });
    refreshMeals();
    setActionNotice(`${meal.type} status set to "${nextStatus}"`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <MessLayout
      activeNav="menu"
      pageTitle="Today's Meal Menu"
      pageSubtitle="Live dining menu items, calorie estimations, and serving status"
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity
          style={styles.weeklyNavBtn}
          onPress={() => router.push("/mess-manager/weekly-menu")}
        >
          <Ionicons name="calendar" size={16} color="#FFFFFF" />
          <Text style={styles.weeklyNavBtnText}>Weekly Schedule</Text>
        </TouchableOpacity>
      }
    >
      {/* 4 Big Meal Cards */}
      <View style={styles.mealGrid}>
        {meals.map((meal) => {
          const isServed = meal.status === "Served";
          const isOngoing = meal.status === "Ongoing";
          return (
            <View key={meal.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.mealTitleGroup}>
                  <Ionicons
                    name={
                      meal.type === "Breakfast"
                        ? "sunny"
                        : meal.type === "Lunch"
                        ? "restaurant"
                        : meal.type === "Snacks"
                        ? "cafe"
                        : "moon"
                    }
                    size={20}
                    color="#EA580C"
                  />
                  <Text style={styles.mealTitle}>{meal.type}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.statusBadge,
                    isServed
                      ? styles.badgeServed
                      : isOngoing
                      ? styles.badgeOngoing
                      : styles.badgeUpcoming,
                  ]}
                  onPress={() => handleToggleStatus(meal)}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isServed
                        ? styles.textServed
                        : isOngoing
                        ? styles.textOngoing
                        : styles.textUpcoming,
                    ]}
                  >
                    {meal.status} (Tap to change)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.itemsText}>{meal.items}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.timeLabel}>⏰ {meal.timing}</Text>
                  {meal.calories && (
                    <Text style={styles.calorieLabel}>🔥 {meal.calories}</Text>
                  )}
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleOpenEdit(meal)}
                >
                  <Ionicons name="create-outline" size={15} color="#2563EB" />
                  <Text style={styles.editBtnText}>Edit Dishes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusStepBtn,
                    isServed ? { backgroundColor: "#ECFDF5" } : { backgroundColor: "#EFF6FF" },
                  ]}
                  onPress={() => handleToggleStatus(meal)}
                >
                  <Ionicons
                    name={isServed ? "checkmark-circle" : "arrow-forward-circle-outline"}
                    size={15}
                    color={isServed ? "#059669" : "#2563EB"}
                  />
                  <Text
                    style={[
                      styles.statusStepBtnText,
                      isServed ? { color: "#059669" } : { color: "#2563EB" },
                    ]}
                  >
                    {isServed ? "Served" : isOngoing ? "Mark Served" : "Mark Ongoing"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {activeMeal?.type} Menu</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Menu Dishes & Items *</Text>
            <TextInput
              value={itemsText}
              onChangeText={setItemsText}
              placeholder="e.g. Masala Dosa + Sambar + Coconut Chutney + Filter Coffee"
              style={[styles.input, { height: 75 }]}
              multiline
            />

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Service Timing</Text>
                <TextInput
                  value={timingText}
                  onChangeText={setTimingText}
                  placeholder="07:30 AM – 09:30 AM"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Estimated Calories</Text>
                <TextInput
                  value={caloriesText}
                  onChangeText={setCaloriesText}
                  placeholder="450 kcal"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.label}>Serving Status</Text>
            <View style={styles.statusPillsRow}>
              {(["Upcoming", "Ongoing", "Served"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusPick, statusVal === s && styles.statusPickActive]}
                  onPress={() => setStatusVal(s)}
                >
                  <Text style={[styles.statusPickText, statusVal === s && styles.statusPickTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveMeal}
              >
                <Text style={styles.saveBtnText}>Save Menu Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </MessLayout>
  );
}

const styles = StyleSheet.create({
  weeklyNavBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  weeklyNavBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  mealGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    width: "48%",
    minWidth: 300,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  mealTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeServed: {
    backgroundColor: "#ECFDF5",
  },
  badgeOngoing: {
    backgroundColor: "#EFF6FF",
  },
  badgeUpcoming: {
    backgroundColor: "#FFFBEB",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textServed: {
    color: "#059669",
  },
  textOngoing: {
    color: "#2563EB",
  },
  textUpcoming: {
    color: "#D97706",
  },
  cardContent: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 14,
  },
  itemsText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    lineHeight: 22,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  calorieLabel: {
    fontSize: 12,
    color: "#EA580C",
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
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
  editBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  statusStepBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  statusStepBtnText: {
    fontSize: 12,
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
  rowTwo: {
    flexDirection: "row",
    gap: 10,
  },
  statusPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  statusPick: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: "center",
  },
  statusPickActive: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  statusPickText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  statusPickTextActive: {
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
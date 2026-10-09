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
import messDataService, { DayMenu } from "../../services/messDataService";

export default function WeeklyMenuScreen() {
  const { width } = useWindowDimensions();
  const [weeklyMenu, setWeeklyMenu] = useState<DayMenu[]>(
    messDataService.getWeeklyMenu()
  );
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Edit Day Modal
  const [editModal, setEditModal] = useState(false);
  const [editDayName, setEditDayName] = useState("Mon");
  const [editBreakfast, setEditBreakfast] = useState("");
  const [editLunch, setEditLunch] = useState("");
  const [editDinner, setEditDinner] = useState("");

  const refreshMenu = () => {
    setWeeklyMenu(messDataService.getWeeklyMenu());
  };

  const handleOpenEdit = (dm: DayMenu) => {
    setEditDayName(dm.day);
    setEditBreakfast(dm.breakfast);
    setEditLunch(dm.lunch);
    setEditDinner(dm.dinner);
    setEditModal(true);
  };

  const handleSaveDayMenu = () => {
    messDataService.updateDayMenu(editDayName, {
      breakfast: editBreakfast.trim(),
      lunch: editLunch.trim(),
      dinner: editDinner.trim(),
    });

    setEditModal(false);
    refreshMenu();
    setActionNotice(`${editDayName} menu updated successfully!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const currentDayPlan = weeklyMenu.find((m) => m.day === selectedDay) || weeklyMenu[0];

  return (
    <MessLayout
      activeNav="weekly-menu"
      pageTitle="Weekly Meal Matrix"
      pageSubtitle="7-day rotating nutritious meal timetable"
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity
          style={styles.editCurrentBtn}
          onPress={() => currentDayPlan && handleOpenEdit(currentDayPlan)}
        >
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.editCurrentBtnText}>Edit {selectedDay} Menu</Text>
        </TouchableOpacity>
      }
    >
      {/* 7-Day Selector Tabs */}
      <View style={styles.dayTabsRow}>
        {weeklyMenu.map((m) => {
          const isSelected = selectedDay === m.day;
          return (
            <TouchableOpacity
              key={m.day}
              style={[styles.dayTab, isSelected && styles.dayTabActive]}
              onPress={() => setSelectedDay(m.day)}
            >
              <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>
                {m.day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Day Feature View */}
      {currentDayPlan && (
        <View style={styles.selectedDayBanner}>
          <View>
            <Text style={styles.selectedDayTitle}>{currentDayPlan.day} Feast Plan</Text>
            <Text style={styles.selectedDaySubtitle}>
              Breakfast, Lunch, and Dinner schedule for {currentDayPlan.day}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.inlineEditBtn}
            onPress={() => handleOpenEdit(currentDayPlan)}
          >
            <Ionicons name="create-outline" size={16} color="#2563EB" />
            <Text style={styles.inlineEditText}>Modify Menu</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3 Meal Cards for Selected Day */}
      {currentDayPlan && (
        <View style={styles.threeMealRow}>
          <View style={styles.mealBox}>
            <View style={styles.mealBoxHeader}>
              <Ionicons name="sunny-outline" size={18} color="#EA580C" />
              <Text style={styles.mealBoxTitle}>Breakfast</Text>
            </View>
            <Text style={styles.mealBoxTiming}>07:30 AM – 09:30 AM</Text>
            <Text style={styles.mealBoxItems}>{currentDayPlan.breakfast}</Text>
          </View>

          <View style={styles.mealBox}>
            <View style={styles.mealBoxHeader}>
              <Ionicons name="restaurant-outline" size={18} color="#2563EB" />
              <Text style={styles.mealBoxTitle}>Lunch</Text>
            </View>
            <Text style={styles.mealBoxTiming}>12:30 PM – 02:30 PM</Text>
            <Text style={styles.mealBoxItems}>{currentDayPlan.lunch}</Text>
          </View>

          <View style={styles.mealBox}>
            <View style={styles.mealBoxHeader}>
              <Ionicons name="moon-outline" size={18} color="#7C3AED" />
              <Text style={styles.mealBoxTitle}>Dinner</Text>
            </View>
            <Text style={styles.mealBoxTiming}>08:00 PM – 10:00 PM</Text>
            <Text style={styles.mealBoxItems}>{currentDayPlan.dinner}</Text>
          </View>
        </View>
      )}

      {/* Full 7-Day Matrix Table */}
      <View style={styles.matrixTableCard}>
        <Text style={styles.matrixTableTitle}>All 7 Days Schedule Matrix</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: 90 }]}>Day</Text>
          <Text style={[styles.th, { flex: 1 }]}>Breakfast</Text>
          <Text style={[styles.th, { flex: 1 }]}>Lunch</Text>
          <Text style={[styles.th, { flex: 1 }]}>Dinner</Text>
          <Text style={[styles.th, { width: 80, textAlign: "right" }]}>Action</Text>
        </View>

        {weeklyMenu.map((m) => (
          <View key={m.day} style={styles.tableRow}>
            <Text style={[styles.tdBold, { width: 90 }]}>{m.day}</Text>
            <Text style={[styles.td, { flex: 1 }]}>{m.breakfast}</Text>
            <Text style={[styles.td, { flex: 1 }]}>{m.lunch}</Text>
            <Text style={[styles.td, { flex: 1 }]}>{m.dinner}</Text>
            <View style={{ width: 80, alignItems: "flex-end" }}>
              <TouchableOpacity
                style={styles.rowEditBtn}
                onPress={() => handleOpenEdit(m)}
              >
                <Text style={styles.rowEditBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {editDayName} Schedule</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Breakfast Dishes</Text>
            <TextInput
              value={editBreakfast}
              onChangeText={setEditBreakfast}
              placeholder="e.g. Masala Dosa + Sambar + Chutney"
              style={styles.input}
            />

            <Text style={styles.label}>Lunch Dishes</Text>
            <TextInput
              value={editLunch}
              onChangeText={setEditLunch}
              placeholder="e.g. Rice + Dal Makhani + Paneer + Roti"
              style={styles.input}
            />

            <Text style={styles.label}>Dinner Dishes</Text>
            <TextInput
              value={editDinner}
              onChangeText={setEditDinner}
              placeholder="e.g. Chapati + Mixed Veg + Dal + Kheer"
              style={styles.input}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveDayMenu}
              >
                <Text style={styles.saveBtnText}>Update Day Menu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </MessLayout>
  );
}

const styles = StyleSheet.create({
  editCurrentBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editCurrentBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  dayTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  dayTab: {
    flex: 1,
    minWidth: 50,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  dayTabActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  dayTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  dayTabTextActive: {
    color: "#FFFFFF",
  },
  selectedDayBanner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  selectedDayTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  selectedDaySubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  inlineEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  inlineEditText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  threeMealRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  mealBox: {
    flex: 1,
    minWidth: 240,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mealBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  mealBoxTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  mealBoxTiming: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 10,
  },
  mealBoxItems: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    lineHeight: 20,
  },
  matrixTableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    padding: 16,
  },
  matrixTableTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  th: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tdBold: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  td: {
    fontSize: 12,
    color: "#334155",
    paddingRight: 8,
  },
  rowEditBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rowEditBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
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
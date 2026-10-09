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
  MessAttendanceStudent,
} from "../../services/messDataService";

export default function MealAttendanceScreen() {
  const { width } = useWindowDimensions();
  const [students, setStudents] = useState<MessAttendanceStudent[]>(
    messDataService.getAttendance()
  );
  const [selectedMeal, setSelectedMeal] = useState<"breakfast" | "lunch" | "snacks" | "dinner">("lunch");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Present" | "Absent" | "On Leave">("All");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Add Student Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRoll, setNewRoll] = useState("");
  const [newRoom, setNewRoom] = useState("");

  const refreshList = () => {
    setStudents(messDataService.getAttendance());
  };

  const filtered = students.filter((s) => {
    const matchesFilter = statusFilter === "All" || s.status === statusFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.room.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleToggleMeal = (studentId: string, mealKey: "breakfast" | "lunch" | "snacks" | "dinner") => {
    const s = students.find((st) => st.id === studentId);
    if (!s) return;
    const currentVal = s[mealKey];
    messDataService.updateAttendance(studentId, {
      [mealKey]: !currentVal,
      status: !currentVal ? "Present" : "Absent",
    });
    refreshList();
    setActionNotice(`${s.name} ${mealKey} attendance updated!`);
    setTimeout(() => setActionNotice(null), 2500);
  };

  const handleCycleStatus = (student: MessAttendanceStudent) => {
    const nextStatus: MessAttendanceStudent["status"] =
      student.status === "Present"
        ? "Absent"
        : student.status === "Absent"
        ? "On Leave"
        : "Present";

    messDataService.updateAttendance(student.id, {
      status: nextStatus,
      breakfast: nextStatus === "Present",
      lunch: nextStatus === "Present",
      snacks: nextStatus === "Present",
      dinner: nextStatus === "Present",
    });
    refreshList();
    setActionNotice(`${student.name} marked as ${nextStatus}`);
    setTimeout(() => setActionNotice(null), 2500);
  };

  const handleMarkAllPresent = () => {
    students.forEach((s) => {
      messDataService.updateAttendance(s.id, {
        [selectedMeal]: true,
        status: "Present",
      });
    });
    refreshList();
    setActionNotice(`All students marked present for ${selectedMeal.toUpperCase()}!`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleAddStudent = () => {
    if (!newName.trim()) {
      Alert.alert("Required", "Please provide student name");
      return;
    }

    messDataService.addAttendanceStudent({
      name: newName.trim(),
      rollNo: newRoll.trim() || `R-${Math.floor(100 + Math.random() * 900)}`,
      room: newRoom.trim() || "101",
      breakfast: true,
      lunch: true,
      snacks: true,
      dinner: true,
      status: "Present",
    });

    setNewName("");
    setNewRoll("");
    setNewRoom("");
    setModalVisible(false);
    refreshList();
    setActionNotice(`Student ${newName} added to mess attendance roster!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const presentCount = students.filter((s) => s.status === "Present").length;
  const absentCount = students.filter((s) => s.status === "Absent").length;
  const leaveCount = students.filter((s) => s.status === "On Leave").length;

  return (
    <MessLayout
      activeNav="attendance"
      pageTitle="Daily Meal Attendance"
      pageSubtitle={`Roster tracking: ${presentCount} Present • ${absentCount} Absent • ${leaveCount} On Leave`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search roll number, student name, room..."
      rightAction={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={styles.allPresentBtn}
            onPress={handleMarkAllPresent}
          >
            <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
            <Text style={styles.allPresentBtnText}>Mark All Present</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addStudentBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="person-add" size={16} color="#FFFFFF" />
            <Text style={styles.addStudentBtnText}>+ Add Student</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {/* 4 Attendance Stat Cards */}
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Enrolled Diners</Text>
          <Text style={styles.statNum}>{students.length}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
          <Text style={styles.statLabel}>Present for Meals</Text>
          <Text style={[styles.statNum, { color: "#059669" }]}>{presentCount}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#EF4444" }]}>
          <Text style={styles.statLabel}>Absent Today</Text>
          <Text style={[styles.statNum, { color: "#DC2626" }]}>{absentCount}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#F59E0B" }]}>
          <Text style={styles.statLabel}>On Sanctioned Leave</Text>
          <Text style={[styles.statNum, { color: "#D97706" }]}>{leaveCount}</Text>
        </View>
      </View>

      {/* Meal Tab Switcher */}
      <View style={styles.mealSwitchRow}>
        {(["breakfast", "lunch", "snacks", "dinner"] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.mealSwitchTab, selectedMeal === m && styles.mealSwitchTabActive]}
            onPress={() => setSelectedMeal(m)}
          >
            <Ionicons
              name={
                m === "breakfast"
                  ? "sunny-outline"
                  : m === "lunch"
                  ? "restaurant-outline"
                  : m === "snacks"
                  ? "cafe-outline"
                  : "moon-outline"
              }
              size={16}
              color={selectedMeal === m ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.mealSwitchText,
                selectedMeal === m && styles.mealSwitchTextActive,
              ]}
            >
              {m.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Attendance Table */}
      <View style={styles.tableCard}>
        <View style={styles.tableHead}>
          <Text style={[styles.th, { width: 100 }]}>Roll No</Text>
          <Text style={[styles.th, { width: 150 }]}>Student Name</Text>
          <Text style={[styles.th, { width: 90 }]}>Room No</Text>
          <Text style={[styles.th, { width: 90 }]}>Breakfast</Text>
          <Text style={[styles.th, { width: 90 }]}>Lunch</Text>
          <Text style={[styles.th, { width: 90 }]}>Snacks</Text>
          <Text style={[styles.th, { width: 90 }]}>Dinner</Text>
          <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Status (Tap to cycle)</Text>
        </View>

        {filtered.map((s, idx) => {
          const isPresent = s.status === "Present";
          const isAbsent = s.status === "Absent";
          return (
            <View key={`${s.id || s.rollNo || "att"}-${idx}`} style={styles.tableRow}>
              <Text style={[styles.tdBold, { width: 100 }]}>{s.rollNo}</Text>
              <Text style={[styles.td, { width: 150 }]} numberOfLines={1}>{s.name}</Text>
              <Text style={[styles.td, { width: 90 }]}>Room {s.room}</Text>

              {/* Meal Check Buttons */}
              {(["breakfast", "lunch", "snacks", "dinner"] as const).map((mealKey) => {
                const checked = s[mealKey];
                return (
                  <View key={mealKey} style={{ width: 90 }}>
                    <TouchableOpacity
                      style={[
                        styles.checkPill,
                        checked ? styles.checkPillActive : styles.checkPillInactive,
                      ]}
                      onPress={() => handleToggleMeal(s.id, mealKey)}
                    >
                      <Ionicons
                        name={checked ? "checkmark" : "close"}
                        size={12}
                        color={checked ? "#059669" : "#94A3B8"}
                      />
                      <Text
                        style={[
                          styles.checkPillText,
                          checked ? styles.checkPillTextActive : styles.checkPillTextInactive,
                        ]}
                      >
                        {checked ? "P" : "A"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Status Cycle Button */}
              <View style={[styles.actionCol, { flex: 1 }]}>
                <TouchableOpacity
                  style={[
                    styles.statusPill,
                    isPresent
                      ? styles.pillPresent
                      : isAbsent
                      ? styles.pillAbsent
                      : styles.pillLeave,
                  ]}
                  onPress={() => handleCycleStatus(s)}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isPresent
                        ? styles.textPresent
                        : isAbsent
                        ? styles.textAbsent
                        : styles.textLeave,
                    ]}
                  >
                    {s.status} 🔄
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Add Student Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Student to Mess Roster</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Student Full Name *</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Kartik Sharma"
              style={styles.modalInput}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Roll Number</Text>
                <TextInput
                  value={newRoll}
                  onChangeText={setNewRoll}
                  placeholder="CS-204"
                  style={styles.modalInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Hostel Room No</Text>
                <TextInput
                  value={newRoom}
                  onChangeText={setNewRoom}
                  placeholder="105"
                  style={styles.modalInput}
                />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddStudent}
              >
                <Text style={styles.submitBtnText}>Add Student</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </MessLayout>
  );
}

const styles = StyleSheet.create({
  allPresentBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  allPresentBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  addStudentBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addStudentBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
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
    minWidth: 160,
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
    marginTop: 4,
  },
  mealSwitchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  mealSwitchTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mealSwitchTabActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  mealSwitchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  mealSwitchTextActive: {
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
    paddingVertical: 10,
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
    color: "#334155",
  },
  checkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  checkPillActive: {
    backgroundColor: "#ECFDF5",
  },
  checkPillInactive: {
    backgroundColor: "#F1F5F9",
  },
  checkPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  checkPillTextActive: {
    color: "#059669",
  },
  checkPillTextInactive: {
    color: "#94A3B8",
  },
  actionCol: {
    alignItems: "flex-end",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillPresent: {
    backgroundColor: "#ECFDF5",
  },
  pillAbsent: {
    backgroundColor: "#FEF2F2",
  },
  pillLeave: {
    backgroundColor: "#FEF3C7",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textPresent: {
    color: "#059669",
  },
  textAbsent: {
    color: "#DC2626",
  },
  textLeave: {
    color: "#D97706",
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
    maxWidth: 420,
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
  modalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 5,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
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
  submitBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
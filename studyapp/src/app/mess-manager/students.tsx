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
import messDataService, {
  MessAttendanceStudent,
} from "../../services/messDataService";
import unifiedStudentService from "../../services/unifiedStudentService";

export default function MessStudentsDirectoryScreen() {
  const { width } = useWindowDimensions();
  const [students, setStudents] = useState<MessAttendanceStudent[]>(
    messDataService.getAttendance()
  );
  const [dietFilter, setDietFilter] = useState<"All" | "Veg" | "Non-Veg" | "Jain">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Sync with Firestore students in real-time from Admin
  React.useEffect(() => {
    const unsubscribe = unifiedStudentService.subscribeStudents((unifiedList) => {
      if (unifiedList && unifiedList.length > 0) {
        const seenIds = new Set<string>();
        const mapped: MessAttendanceStudent[] = [];
        unifiedList.forEach((u, i) => {
          const uid = u.id || u.rollNo || `u-${i}`;
          if (!seenIds.has(uid)) {
            seenIds.add(uid);
            mapped.push({
              id: uid,
              name: u.fullName || u.name,
              rollNo: u.rollNo || "N/A",
              room: u.roomNo ? `Room ${u.roomNo}` : "Hostel Pending (Notice Mgr)",
              breakfast: true,
              lunch: true,
              snacks: true,
              dinner: true,
              status: "Present" as const,
            });
          }
        });
        setStudents(mapped);
      } else {
        setStudents(messDataService.getAttendance());
      }
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Add Diner Modal
  const [addModal, setAddModal] = useState(false);
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [room, setRoom] = useState("");
  const [diet, setDiet] = useState<"Veg" | "Non-Veg" | "Jain">("Veg");

  const refreshList = () => {
    setStudents(messDataService.getAttendance());
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.room.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleAddDiner = () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please provide student name");
      return;
    }

    messDataService.addAttendanceStudent({
      name: name.trim(),
      rollNo: roll.trim() || `R-${Math.floor(100 + Math.random() * 900)}`,
      room: room.trim() || "101",
      breakfast: true,
      lunch: true,
      snacks: true,
      dinner: true,
      status: "Present",
    });

    setName("");
    setRoll("");
    setRoom("");
    setAddModal(false);
    refreshList();
    setActionNotice(`Diner ${name} added to mess subscription!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <MessLayout
      activeNav="students"
      pageTitle="Mess Subscribed Students"
      pageSubtitle={`${students.length} students enrolled in campus meal plans`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search student name, roll number, or room..."
      rightAction={
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddModal(true)}
        >
          <Ionicons name="person-add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>+ Register Diner</Text>
        </TouchableOpacity>
      }
    >
      {/* Diet Filter Pills */}
      <View style={styles.pillRow}>
        {(["All", "Veg", "Non-Veg", "Jain"] as const).map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.pill, dietFilter === d && styles.pillActive]}
            onPress={() => setDietFilter(d)}
          >
            <Text style={[styles.pillText, dietFilter === d && styles.pillTextActive]}>
              {d === "All" ? `All Students (${students.length})` : `${d} Diet`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Student Grid */}
      <View style={styles.grid}>
        {filtered.map((s, idx) => {
          const isVeg = idx % 2 === 0;
          return (
            <View key={`${s.id || s.rollNo || "stu"}-${idx}`} style={styles.studentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{s.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.name}>{s.name}</Text>
                  <Text style={styles.rollSub}>Roll: {s.rollNo} • Room {s.room}</Text>
                </View>
                <View style={[styles.dietBadge, isVeg ? styles.badgeVeg : styles.badgeNonVeg]}>
                  <Text style={[styles.dietBadgeText, isVeg ? styles.textVeg : styles.textNonVeg]}>
                    {isVeg ? "Veg" : "Non-Veg"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Mess Hall:</Text>
                  <Text style={styles.infoVal}>Central Dining Hall A</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Plan:</Text>
                  <Text style={styles.infoVal}>Full Day (4 Meals)</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Subscription Fee:</Text>
                  <Text style={[styles.infoVal, { color: "#059669", fontWeight: "700" }]}>Active / Paid</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push("/mess-manager/meal-attendance")}
                >
                  <Ionicons name="checkbox-outline" size={14} color="#2563EB" />
                  <Text style={styles.actionBtnText}>Check Attendance</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Add Diner Modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Mess Diner</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Student Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Tanmay Bhat"
              style={styles.input}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Roll No</Text>
                <TextInput
                  value={roll}
                  onChangeText={setRoll}
                  placeholder="B2023-102"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Room No</Text>
                <TextInput
                  value={room}
                  onChangeText={setRoom}
                  placeholder="108"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.label}>Dietary Preference</Text>
            <View style={styles.dietRow}>
              {(["Veg", "Non-Veg", "Jain"] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dietOption, diet === d && styles.dietOptionActive]}
                  onPress={() => setDiet(d)}
                >
                  <Text style={[styles.dietOptionText, diet === d && styles.dietOptionTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddDiner}
              >
                <Text style={styles.submitBtnText}>Confirm Registration</Text>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  studentCard: {
    width: "31.5%",
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  rollSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  dietBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeVeg: {
    backgroundColor: "#ECFDF5",
  },
  badgeNonVeg: {
    backgroundColor: "#FEF2F2",
  },
  dietBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  textVeg: {
    color: "#059669",
  },
  textNonVeg: {
    color: "#DC2626",
  },
  cardInfo: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoKey: {
    fontSize: 12,
    color: "#64748B",
  },
  infoVal: {
    fontSize: 12,
    color: "#1E293B",
  },
  cardActions: {
    flexDirection: "row",
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionBtnText: {
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
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  dietRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  dietOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: "center",
  },
  dietOptionActive: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  dietOptionText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  dietOptionTextActive: {
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
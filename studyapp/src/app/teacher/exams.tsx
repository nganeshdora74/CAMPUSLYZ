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
import { useAppTheme } from "../../context/ThemeContext";

const INITIAL_EXAMS = [
  {
    id: "ex-1",
    title: "Mid-Semester Assessment - Python OOP & Data Structures",
    classTag: "CSE - A",
    date: "14 Oct 2026",
    time: "10:00 AM - 12:00 PM",
    room: "Room 101",
    status: "Upcoming",
  },
  {
    id: "ex-2",
    title: "Unit Test 2 - Web Technologies",
    classTag: "CSE - A",
    date: "18 Oct 2026",
    time: "02:00 PM - 03:00 PM",
    room: "Lab Block 2",
    status: "Upcoming",
  },
  {
    id: "ex-3",
    title: "End-Semester Exam - DBMS",
    classTag: "CSE - B",
    date: "28 Nov 2026",
    time: "10:00 AM - 01:00 PM",
    room: "Room 103",
    status: "Upcoming",
  },
];

export default function TeacherExamsScreen() {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();

  const [exams, setExams] = useState(INITIAL_EXAMS);
  const [activeTab, setActiveTab] = useState<"Upcoming" | "Completed" | "All">("Upcoming");
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClass, setNewClass] = useState("CSE - A");
  const [newDate, setNewDate] = useState("05 Dec 2026");
  const [newTime, setNewTime] = useState("10:00 AM - 12:00 PM");
  const [newRoom, setNewRoom] = useState("Room 101");

  const filtered = exams.filter((e) => {
    if (activeTab === "All") return true;
    if (activeTab === "Upcoming") return e.status === "Upcoming";
    return true;
  });

  const handleCreate = () => {
    if (!newTitle.trim()) {
      Alert.alert("Required", "Please enter exam title.");
      return;
    }
    const newEx = {
      id: `ex-${Date.now()}`,
      title: newTitle.trim(),
      classTag: newClass,
      date: newDate,
      time: newTime,
      room: newRoom,
      status: "Upcoming",
    };
    setExams([...exams, newEx]);
    setNewTitle("");
    setModalOpen(false);
    Alert.alert("Created", "Exam created successfully!");
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#0B132B" : "#F4F7FC" }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.push("/teacher")} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Exams</Text>
            <Text style={styles.pageSub}>Manage and create exams</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add" size={14} color="#FFFFFF" />
          <Text style={styles.createBtnText}>+ Create Exam</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentPadding} showsVerticalScrollIndicator={false}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          {[
            { key: "Upcoming", label: "Upcoming (3)" },
            { key: "Completed", label: "Completed (1)" },
            { key: "All", label: "All (4)" },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(t.key as any)}
            >
              <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exams List */}
        <View style={{ gap: 10 }}>
          {filtered.map((item) => (
            <View
              key={item.id}
              style={[
                styles.examCard,
                {
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.examTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={styles.examClass}>{item.classTag}</Text>
                </View>

                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color="#64748B" />
                  <Text style={styles.metaText}>{item.date}</Text>
                </View>

                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color="#64748B" />
                  <Text style={styles.metaText}>{item.time}</Text>
                </View>

                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color="#64748B" />
                  <Text style={styles.metaText}>{item.room}</Text>
                </View>

                <TouchableOpacity
                  style={styles.detailsBtn}
                  onPress={() => Alert.alert("Exam Details", `${item.title}\nClass: ${item.classTag}\nTime: ${item.time}\nRoom: ${item.room}`)}
                >
                  <Text style={styles.detailsBtnText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Exam</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Exam Title</Text>
            <TextInput
              style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Unit Test 3 - Computer Networks"
              placeholderTextColor="#94A3B8"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>Class</Text>
            <TextInput
              style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. CSE - A"
              placeholderTextColor="#94A3B8"
              value={newClass}
              onChangeText={setNewClass}
            />

            <Text style={styles.inputLabel}>Date</Text>
            <TextInput
              style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 15 Nov 2026"
              placeholderTextColor="#94A3B8"
              value={newDate}
              onChangeText={setNewDate}
            />

            <Text style={styles.inputLabel}>Room</Text>
            <TextInput
              style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Room 102"
              placeholderTextColor="#94A3B8"
              value={newRoom}
              onChangeText={setNewRoom}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 15, fontWeight: "900" },
  pageSub: { fontSize: 10, color: "#64748B" },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  createBtnText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  contentScroll: { flex: 1 },
  contentPadding: { padding: 12, paddingBottom: 30 },
  tabRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  tabBtnActive: { backgroundColor: "#2563EB" },
  tabBtnText: { fontSize: 10.5, fontWeight: "600", color: "#64748B" },
  tabBtnTextActive: { color: "#FFFFFF", fontWeight: "700" },
  examCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  examTitle: { fontSize: 12.5, fontWeight: "800" },
  examClass: { fontSize: 10.5, color: "#64748B", marginTop: 2 },
  statusPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillText: { fontSize: 9.5, fontWeight: "700", color: "#2563EB" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 10, color: "#64748B" },
  detailsBtn: {
    marginLeft: "auto",
    backgroundColor: "#2563EB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  detailsBtnText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 14 },
  modalCard: { width: "100%", maxWidth: 380, borderRadius: 10, padding: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: 13, fontWeight: "800" },
  inputLabel: { fontSize: 10, fontWeight: "700", color: "#64748B", marginBottom: 3 },
  inputField: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, marginBottom: 8 },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 5 },
  cancelBtnText: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  saveBtn: { backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  saveBtnText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
});
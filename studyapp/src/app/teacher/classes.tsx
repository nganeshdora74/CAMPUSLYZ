import React, { useState } from "react";
import {
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

const INITIAL_CLASSES = [
  {
    id: "cls-1",
    title: "Data Structures",
    section: "CSE - A",
    students: 42,
    icon: "</>",
    iconBg: "#EFF6FF",
    iconColor: "#2563EB",
  },
  {
    id: "cls-2",
    title: "Web Technologies",
    section: "CSE - A",
    students: 38,
    icon: "globe-outline",
    iconBg: "#ECFDF5",
    iconColor: "#059669",
  },
  {
    id: "cls-3",
    title: "DBMS",
    section: "CSE - B",
    students: 36,
    icon: "server-outline",
    iconBg: "#FFF1F2",
    iconColor: "#E11D48",
  },
  {
    id: "cls-4",
    title: "Computer Networks",
    section: "CSE - A",
    students: 39,
    icon: "hardware-chip-outline",
    iconBg: "#F0FDFA",
    iconColor: "#0D9488",
  },
  {
    id: "cls-5",
    title: "Operating Systems",
    section: "CSE - B",
    students: 37,
    icon: "settings-outline",
    iconBg: "#FFF7ED",
    iconColor: "#EA580C",
  },
  {
    id: "cls-6",
    title: "OOP",
    section: "CSE - A",
    students: 34,
    icon: "cube-outline",
    iconBg: "#FAF5FF",
    iconColor: "#7C3AED",
  },
];

export default function MyClassesScreen() {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();

  const [classes, setClasses] = useState(INITIAL_CLASSES);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSection, setNewSection] = useState("CSE - A");

  const filtered = classes.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.section.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClass = () => {
    if (!newTitle.trim()) return;
    const newCls = {
      id: `cls-${Date.now()}`,
      title: newTitle.trim(),
      section: newSection,
      students: 40,
      icon: "</>",
      iconBg: "#EFF6FF",
      iconColor: "#2563EB",
    };
    setClasses([...classes, newCls]);
    setNewTitle("");
    setModalVisible(false);
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
            <Text style={[styles.pageTitle, { color: colors.text }]}>My Classes</Text>
            <Text style={styles.pageSub}>Manage your assigned classes and subjects</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addClassBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={15} color="#FFFFFF" />
          <Text style={styles.addClassBtnText}>+ Add Class</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentPadding} showsVerticalScrollIndicator={false}>
        {/* Search row */}
        <View style={[styles.searchBox, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search classes..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Classes 3-column / 2-column Grid */}
        <View style={styles.grid}>
          {filtered.map((item) => (
            <View
              key={item.id}
              style={[
                styles.classCard,
                {
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.classIconCircle, { backgroundColor: item.iconBg }]}>
                {item.icon === "</>" ? (
                  <Text style={{ fontSize: 13, fontWeight: "900", color: item.iconColor }}>&lt;/&gt;</Text>
                ) : (
                  <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
                )}
              </View>

              <Text style={[styles.classTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={styles.classSection}>{item.section}</Text>
              <Text style={styles.classStudents}>{item.students} Students</Text>

              <TouchableOpacity
                style={styles.viewDetailsRow}
                onPress={() => router.push("/teacher/students")}
              >
                <Text style={styles.viewDetailsText}>View Details &gt;</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Class</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Subject Title</Text>
            <TextInput
              style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Artificial Intelligence"
              placeholderTextColor="#94A3B8"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>Section / Class</Text>
            <TextInput
              style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. CSE - A"
              placeholderTextColor="#94A3B8"
              value={newSection}
              onChangeText={setNewSection}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddClass}>
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
  addClassBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addClassBtnText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  contentScroll: { flex: 1 },
  contentPadding: { padding: 12, paddingBottom: 30 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 11.5, padding: 0 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  classCard: {
    width: "31.5%",
    minWidth: 140,
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  classIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  classTitle: { fontSize: 12.5, fontWeight: "800" },
  classSection: { fontSize: 10.5, color: "#64748B", marginTop: 2 },
  classStudents: { fontSize: 10, color: "#94A3B8", marginTop: 4 },
  viewDetailsRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  viewDetailsText: { fontSize: 10.5, fontWeight: "700", color: "#2563EB" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
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
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
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
import unifiedStudentService, {
  UnifiedStudent,
} from "../../services/unifiedStudentService";

const DEFAULT_DEMO_STUDENTS = [
  { rollNo: "21CSE001", fullName: "Abhishek Sahu", email: "abhishek@...", department: "CSE - A", attendancePct: "92%", status: "Present" },
  { rollNo: "21CSE002", fullName: "Priya Nanda", email: "priya@...", department: "CSE - A", attendancePct: "88%", status: "Present" },
  { rollNo: "21CSE003", fullName: "Rahul Kumar", email: "rahul@...", department: "CSE - B", attendancePct: "76%", status: "Present" },
  { rollNo: "21CSE004", fullName: "Sneha Parreek", email: "sneha@...", department: "CSE - A", attendancePct: "100%", status: "Present" },
  { rollNo: "21CSE005", fullName: "Aman Verma", email: "aman@...", department: "CSE - B", attendancePct: "64%", status: "Absent" },
  { rollNo: "21CSE006", fullName: "Disha Mohanty", email: "disha@...", department: "CSE - A", attendancePct: "80%", status: "Present" },
];

export default function TeacherStudentsScreen() {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();

  const [students, setStudents] = useState<any[]>(DEFAULT_DEMO_STUDENTS);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("All Classes");

  useEffect(() => {
    const unsubscribe = unifiedStudentService.subscribeStudents((list) => {
      if (list && list.length > 0) {
        const mapped = list.map((s, idx) => ({
          rollNo: s.rollNo || `21CSE00${idx + 1}`,
          fullName: s.fullName || s.name || "Student",
          email: s.email || "student@...",
          department: s.department || "CSE - A",
          attendancePct: `${(s as any).attendancePercentage || 85}%`,
          status: ((s as any).attendancePercentage || 85) >= 75 ? "Present" : "Absent",
        }));
        setStudents(mapped);
      }
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const filtered = students.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      s.fullName.toLowerCase().includes(q) ||
      s.rollNo.toLowerCase().includes(q);
    const matchClass =
      selectedClass === "All Classes" || s.department.includes(selectedClass.replace("All Classes", ""));
    return matchSearch && matchClass;
  });

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#0B132B" : "#F4F7FC" }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.push("/teacher")} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Students</Text>
            <Text style={styles.pageSub}>View and manage your students</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentPadding} showsVerticalScrollIndicator={false}>
        {/* Search & Class Filter */}
        <View style={styles.filterRow}>
          <View style={[styles.searchBox, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search student by name or roll number..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={[styles.classDropdown, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
            <Text style={[styles.classDropdownText, { color: colors.text }]}>{selectedClass}</Text>
            <Ionicons name="chevron-down" size={13} color="#64748B" />
          </View>
        </View>

        {/* Student Table (Like Image 2) */}
        <View style={[styles.tableCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
          {/* Table Header */}
          <View style={[styles.tableHeaderRow, { borderBottomColor: isDark ? "#334155" : "#E2E8F0" }]}>
            <Text style={[styles.thCell, { flex: 1.2 }]}>Roll No</Text>
            <Text style={[styles.thCell, { flex: 2 }]}>Name</Text>
            <Text style={[styles.thCell, { flex: 1.8 }]}>Email</Text>
            <Text style={[styles.thCell, { flex: 1.2 }]}>Class</Text>
            <Text style={[styles.thCell, { flex: 1.2 }]}>Attendance</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: "right" }]}>Status</Text>
          </View>

          {/* Table Body */}
          {filtered.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.tableRow,
                idx > 0 && { borderTopWidth: 1, borderTopColor: isDark ? "#334155" : "#F1F5F9" },
              ]}
            >
              <Text style={[styles.tdCell, { flex: 1.2, fontWeight: "700", color: "#2563EB" }]}>
                {item.rollNo}
              </Text>
              <Text style={[styles.tdCell, { flex: 2, fontWeight: "700", color: colors.text }]} numberOfLines={1}>
                {item.fullName}
              </Text>
              <Text style={[styles.tdCell, { flex: 1.8, color: "#64748B" }]} numberOfLines={1}>
                {item.email}
              </Text>
              <Text style={[styles.tdCell, { flex: 1.2, color: colors.text }]}>
                {item.department}
              </Text>
              <Text style={[styles.tdCell, { flex: 1.2, fontWeight: "700", color: colors.text }]}>
                {item.attendancePct}
              </Text>

              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <View
                  style={[
                    styles.statusPill,
                    item.status === "Present"
                      ? { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }
                      : { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: item.status === "Present" ? "#059669" : "#DC2626" },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
  contentScroll: { flex: 1 },
  contentPadding: { padding: 12, paddingBottom: 30 },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 11.5, padding: 0 },
  classDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  classDropdownText: { fontSize: 11, fontWeight: "600" },
  tableCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
  },
  thCell: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  tdCell: {
    fontSize: 11,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
});